import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp, deleteApp } from 'firebase/app';
import {
  Database,
  DataSnapshot,
  getDatabase,
  limitToLast,
  onValue,
  push,
  query,
  ref,
  set,
  Unsubscribe,
} from 'firebase/database';
import {
  DEFAULT_FIREBASE_REALTIME_CONFIG,
  FirebaseRealtimeConfig,
} from '@/constants/firebaseConfig';
import { SmartAlertNotification } from '@/types/notification';
import {
  extractSeverityFromPayload,
  resolveAlertType,
} from '@/utils/formatters';

const FIREBASE_CONFIG_STORAGE_KEY = '@smart_alert/firebase_rtdb_config_v1';
const WOKWI_APP_NAME = 'SmartAlertWokwiApp';

let activeApp: FirebaseApp | null = null;
let activeDb: Database | null = null;
let activeUnsubscribe: Unsubscribe | null = null;
let lastSensorAlertSignature: string | null = null;
let initialSnapshotProcessed = false;
const seenNodeKeys = new Set<string>();

/**
 * Đọc cấu hình Firebase Realtime Database (liên kết Wokwi) từ AsyncStorage hoặc mặc định
 */
export async function loadFirebaseRealtimeConfig(): Promise<FirebaseRealtimeConfig> {
  try {
    const raw = await AsyncStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_FIREBASE_REALTIME_CONFIG;
    const parsed = JSON.parse(raw) as Partial<FirebaseRealtimeConfig>;
    return {
      ...DEFAULT_FIREBASE_REALTIME_CONFIG,
      ...parsed,
      databaseURL:
        parsed.databaseURL && parsed.databaseURL.trim().length > 0
          ? parsed.databaseURL.trim().replace(/\/+$/, '')
          : DEFAULT_FIREBASE_REALTIME_CONFIG.databaseURL,
      projectId:
        parsed.projectId && parsed.projectId.trim().length > 0
          ? parsed.projectId.trim()
          : DEFAULT_FIREBASE_REALTIME_CONFIG.projectId,
      watchPath: (parsed.watchPath || '/alerts').startsWith('/')
        ? parsed.watchPath || '/alerts'
        : `/${parsed.watchPath}`,
    };
  } catch {
    return DEFAULT_FIREBASE_REALTIME_CONFIG;
  }
}

/**
 * Lưu cấu hình Firebase Realtime Database vào AsyncStorage
 */
export async function saveFirebaseRealtimeConfig(
  config: FirebaseRealtimeConfig
): Promise<FirebaseRealtimeConfig> {
  const normalized: FirebaseRealtimeConfig = {
    ...config,
    databaseURL: config.databaseURL.trim().replace(/\/+$/, ''),
    projectId:
      config.projectId.trim() ||
      inferProjectIdFromDatabaseUrl(config.databaseURL),
    apiKey: config.apiKey.trim(),
    watchPath: (config.watchPath.trim() || '/alerts').startsWith('/')
      ? config.watchPath.trim() || '/alerts'
      : `/${config.watchPath.trim()}`,
  };
  await AsyncStorage.setItem(
    FIREBASE_CONFIG_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  // Xóa bộ nhớ tạm để đánh giá lại ngay bản tin cảm biến mới nhất theo ngưỡng vừa lưu
  seenNodeKeys.clear();
  lastSensorAlertSignature = null;

  // Đồng bộ ngưỡng an toàn lên Firebase để hệ thống lưu trữ đồng nhất
  if (activeDb) {
    try {
      await set(ref(activeDb, '/settings/thresholds'), {
        highTempThreshold: normalized.highTempThreshold,
        lowTempThreshold: normalized.lowTempThreshold,
        gasThreshold: normalized.gasThreshold,
        updatedAt: Date.now(),
      });
    } catch {
      // Bỏ qua nếu offline
    }
  }

  return normalized;
}

export function inferProjectIdFromDatabaseUrl(url: string): string {
  const cleaned = url.trim();
  const match = cleaned.match(
    /https?:\/\/([a-zA-Z0-9-]+?)(?:-default-rtdb)?\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)/i
  );
  return match?.[1] ?? 'smart-alert-project';
}

export function isFirebaseRealtimeConfigured(
  config: FirebaseRealtimeConfig
): boolean {
  return Boolean(
    config.databaseURL &&
      config.databaseURL.startsWith('https://') &&
      (config.databaseURL.includes('firebaseio.com') ||
        config.databaseURL.includes('firebasedatabase.app'))
  );
}

/**
 * Phân tích dữ liệu từ node Firebase Realtime Database (do Wokwi ESP32 hoặc Firebase đẩy lên)
 * Hỗ trợ cả 2 định dạng phổ biến:
 * 1) Node bản tin cảnh báo: { title, body/message, type, severity, eventId, location, sensorValue, timestamp }
 * 2) Node dữ liệu cảm biến trực tiếp từ Wokwi: { temperature/nhietDo, gas/khiGas/mq2, fire/lua/flame, motion/pir, alert }
 */
function parseWokwiNodeToAlert(
  nodeKey: string,
  payload: Record<string, unknown>,
  config: FirebaseRealtimeConfig
): SmartAlertNotification | null {
  const rawData: Record<string, string> = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && typeof v !== 'object') {
      rawData[k] = String(v);
    } else if (v && typeof v === 'object') {
      rawData[k] = JSON.stringify(v);
    }
  });

  // Kiểm tra trường hợp 1: Node đã có cấu trúc thông báo (title / body / message / alert)
  const explicitTitle =
    typeof payload.title === 'string' ? payload.title.trim() : '';
  const explicitBody =
    typeof payload.body === 'string'
      ? payload.body.trim()
      : typeof payload.message === 'string'
      ? payload.message.trim()
      : typeof payload.alert === 'string'
      ? payload.alert.trim()
      : '';
  const explicitType =
    typeof payload.type === 'string'
      ? payload.type.trim()
      : typeof payload.alertType === 'string'
      ? payload.alertType.trim()
      : null;

  if (explicitTitle || explicitBody || explicitType) {
    const title = explicitTitle || 'Cảnh báo từ hệ thống cảm biến';
    const body =
      explicitBody ||
      `Nhận cảnh báo mới từ hệ thống cảm biến tại node ${nodeKey}.`;
    const alertType = resolveAlertType(explicitType, title, body);
    const severityFromPayload = extractSeverityFromPayload(rawData);
    const eventId =
      rawData.eventId || rawData.event_id || rawData.id || `wokwi_${nodeKey}`;

    const sensorValueStr =
      rawData.sensorValue ||
      rawData.value ||
      rawData.temperature ||
      rawData.gas ||
      null;

    return {
      id: `rtdb_${nodeKey}_${rawData.timestamp ?? ''}`,
      messageId: `rtdb_${nodeKey}`,
      eventId,
      title,
      body,
      alertType,
      rawTypeFromPayload: explicitType,
      severityFromPayload,
      payloadKind: 'notification+data',
      receivedState: 'foreground',
      receivedAt: new Date().toISOString(),
      sentAt: rawData.timestamp
        ? new Date(
            Number(rawData.timestamp) > 1e12
              ? Number(rawData.timestamp)
              : Number(rawData.timestamp) * 1000
          ).toISOString()
        : null,
      read: false,
      rawData,
      deviceId: rawData.deviceId || rawData.device || 'ESP32-WOKWI',
      location: rawData.location || rawData.room || null,
      sensorValue: sensorValueStr,
    };
  }

  // Kiểm tra trường hợp 2: Mạch Wokwi ghi trực tiếp thông số cảm biến (fire, gas, temp, motion...)
  const fireVal =
    payload.fire ?? payload.flame ?? payload.lua ?? payload.isFire;
  const gasVal = Number(
    payload.gas ?? payload.khiGas ?? payload.mq2 ?? payload.smoke ?? NaN
  );
  const tempVal = Number(
    payload.temperature ?? payload.temp ?? payload.nhietDo ?? NaN
  );
  const motionVal =
    payload.motion ??
    payload.pir ??
    payload.intrusion ??
    payload.nguoiLa ??
    payload.detected;

  const isFireTriggered =
    fireVal === true ||
    fireVal === 1 ||
    String(fireVal).toLowerCase() === 'true' ||
    String(fireVal).toLowerCase() === 'danger' ||
    String(fireVal) === '1';

  const isGasTriggered =
    !Number.isNaN(gasVal) && gasVal >= config.gasThreshold;
  const isHighTempTriggered =
    !Number.isNaN(tempVal) && tempVal >= config.highTempThreshold;
  const isLowTempTriggered =
    !Number.isNaN(tempVal) && tempVal <= config.lowTempThreshold;
  const isMotionTriggered =
    motionVal === true ||
    motionVal === 1 ||
    String(motionVal).toLowerCase() === 'true' ||
    String(motionVal) === '1';

  if (isFireTriggered) {
    return {
      id: `rtdb_${nodeKey}`,
      messageId: `rtdb_${nodeKey}`,
      eventId: rawData.eventId || `EVT-FIRE-${nodeKey.slice(-5)}`,
      title: '🔥 CẢNH BÁO CHÁY KHẨN CẤP!',
      body: `Phát hiện lửa và khói từ cảm biến báo cháy${
        !Number.isNaN(tempVal) ? ` (Nhiệt độ: ${tempVal}°C)` : ''
      }.`,
      alertType: 'FIRE',
      rawTypeFromPayload: 'FIRE',
      severityFromPayload: 'critical',
      payloadKind: 'notification+data',
      receivedState: 'foreground',
      receivedAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      read: false,
      rawData,
      deviceId: rawData.deviceId || 'ESP32-WOKWI-01',
      location: rawData.location || 'Phòng Lab IoT',
      sensorValue: !Number.isNaN(tempVal) ? `${tempVal}°C` : 'FLAME=DETECTED',
    };
  }

  if (isMotionTriggered) {
    return {
      id: `rtdb_${nodeKey}`,
      messageId: `rtdb_${nodeKey}`,
      eventId: rawData.eventId || `EVT-PIR-${nodeKey.slice(-5)}`,
      title: '🛡️ Cảnh báo phát hiện người lạ!',
      body: 'Cảm biến chuyển động PIR phát hiện có người xâm nhập khu vực giám sát.',
      alertType: 'INTRUSION',
      rawTypeFromPayload: 'INTRUSION',
      severityFromPayload: 'critical',
      payloadKind: 'notification+data',
      receivedState: 'foreground',
      receivedAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      read: false,
      rawData,
      deviceId: rawData.deviceId || 'ESP32-WOKWI-01',
      location: rawData.location || 'Phòng Lab IoT',
      sensorValue: 'PIR=MOTION',
    };
  }

  if (isHighTempTriggered) {
    return {
      id: `rtdb_${nodeKey}`,
      messageId: `rtdb_${nodeKey}`,
      eventId: rawData.eventId || `EVT-HTEMP-${nodeKey.slice(-5)}`,
      title: '🌡️ Cảnh báo nhiệt độ cao!',
      body: `Nhiệt độ môi trường tăng lên ${tempVal}°C (Vượt ngưỡng cài đặt ${config.highTempThreshold}°C).`,
      alertType: 'HIGH_TEMP',
      rawTypeFromPayload: 'HIGH_TEMP',
      severityFromPayload: 'warning',
      payloadKind: 'notification+data',
      receivedState: 'foreground',
      receivedAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      read: false,
      rawData,
      deviceId: rawData.deviceId || 'ESP32-WOKWI-01',
      location: rawData.location || 'Phòng Lab IoT',
      sensorValue: `${tempVal}°C`,
    };
  }

  if (isLowTempTriggered) {
    return {
      id: `rtdb_${nodeKey}`,
      messageId: `rtdb_${nodeKey}`,
      eventId: rawData.eventId || `EVT-LTEMP-${nodeKey.slice(-5)}`,
      title: '❄️ Cảnh báo nhiệt độ thấp!',
      body: `Nhiệt độ môi trường hạ xuống ${tempVal}°C (Dưới ngưỡng cài đặt ${config.lowTempThreshold}°C).`,
      alertType: 'LOW_TEMP',
      rawTypeFromPayload: 'LOW_TEMP',
      severityFromPayload: 'info',
      payloadKind: 'notification+data',
      receivedState: 'foreground',
      receivedAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      read: false,
      rawData,
      deviceId: rawData.deviceId || 'ESP32-WOKWI-01',
      location: rawData.location || 'Phòng Lab IoT',
      sensorValue: `${tempVal}°C`,
    };
  }

  if (isGasTriggered) {
    return {
      id: `rtdb_${nodeKey}`,
      messageId: `rtdb_${nodeKey}`,
      eventId: rawData.eventId || `EVT-GAS-${nodeKey.slice(-5)}`,
      title: '⚠️ Cảnh báo rò rỉ khí Gas!',
      body: `Nồng độ khí Gas đo được đạt ${gasVal} ppm (Vượt ngưỡng cài đặt ${config.gasThreshold} ppm).`,
      alertType: 'GAS_LEAK',
      rawTypeFromPayload: 'GAS_LEAK',
      severityFromPayload: 'critical',
      payloadKind: 'notification+data',
      receivedState: 'foreground',
      receivedAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      read: false,
      rawData,
      deviceId: rawData.deviceId || 'ESP32-WOKWI-01',
      location: rawData.location || 'Phòng Lab IoT',
      sensorValue: `${gasVal} ppm`,
    };
  }

  return null;
}

/**
 * Khởi động kết nối thời gian thực tới Firebase Realtime Database (Wokwi -> Firebase -> Expo App)
 */
export async function startFirebaseWokwiListener(
  config: FirebaseRealtimeConfig,
  onNewAlert: (alert: SmartAlertNotification) => void,
  onStatusChange: (status: {
    connected: boolean;
    error: string | null;
    lastRawSnapshot: Record<string, unknown> | null;
  }) => void
): Promise<void> {
  await stopFirebaseWokwiListener();

  if (!isFirebaseRealtimeConfigured(config)) {
    onStatusChange({
      connected: false,
      error: null,
      lastRawSnapshot: null,
    });
    return;
  }

  try {
    const existing = getApps().find((a) => a.name === WOKWI_APP_NAME);
    if (existing) {
      await deleteApp(existing);
    }

    activeApp = initializeApp(
      {
        apiKey: config.apiKey || undefined,
        projectId:
          config.projectId || inferProjectIdFromDatabaseUrl(config.databaseURL),
        databaseURL: config.databaseURL,
        appId: config.appId || undefined,
        messagingSenderId: config.messagingSenderId || undefined,
      },
      WOKWI_APP_NAME
    );

    activeDb = getDatabase(activeApp, config.databaseURL);
    const baseRef = ref(activeDb, config.watchPath || '/alerts');
    // Chỉ lắng nghe 1 bản ghi mới nhất qua WebSocket để tốc độ phản hồi thời gian thực đạt < 30ms
    const targetRef = query(baseRef, limitToLast(1));
    initialSnapshotProcessed = false;

    activeUnsubscribe = onValue(
      targetRef,
      (snapshot: DataSnapshot) => {
        const val = snapshot.val();
        onStatusChange({
          connected: true,
          error: null,
          lastRawSnapshot:
            val && typeof val === 'object'
              ? (val as Record<string, unknown>)
              : val !== null && val !== undefined
              ? { value: val }
              : null,
        });

        if (!val || typeof val !== 'object') {
          initialSnapshotProcessed = true;
          return;
        }

        const dataObj = val as Record<string, unknown>;

        // Kiểm tra xem dataObj là 1 bản ghi đơn lẻ (single object) hay danh sách nhiều child nodes
        const looksLikeSingleNode =
          'title' in dataObj ||
          'body' in dataObj ||
          'message' in dataObj ||
          'alert' in dataObj ||
          'type' in dataObj ||
          'temperature' in dataObj ||
          'nhietDo' in dataObj ||
          'gas' in dataObj ||
          'khiGas' in dataObj ||
          'mq2' in dataObj ||
          'fire' in dataObj ||
          'flame' in dataObj ||
          'lua' in dataObj ||
          'motion' in dataObj ||
          'pir' in dataObj;

        if (looksLikeSingleNode) {
          const signature = JSON.stringify(dataObj);
          if (signature !== lastSensorAlertSignature) {
            lastSensorAlertSignature = signature;
            const parsed = parseWokwiNodeToAlert(
              snapshot.key || 'root',
              dataObj,
              config
            );
            if (parsed) {
              onNewAlert(parsed);
            }
          }
          initialSnapshotProcessed = true;
          return;
        }

        // Trường hợp danh sách nhiều bản ghi con (ví dụ /alerts/{pushId})
        const entries = Object.entries(dataObj);
        entries.forEach(([childKey, childVal], index) => {
          if (!childVal || typeof childVal !== 'object') return;
          const uniqueKey = `${config.watchPath}/${childKey}`;

          if (!seenNodeKeys.has(uniqueKey)) {
            seenNodeKeys.add(uniqueKey);
            // Khi mới mở app lần đầu, chỉ lấy bản ghi mới nhất ở cuối danh sách để tránh nổ hàng loạt thông báo cũ
            if (!initialSnapshotProcessed && index < entries.length - 1) {
              return;
            }
            const parsed = parseWokwiNodeToAlert(
              childKey,
              childVal as Record<string, unknown>,
              config
            );
            if (parsed) {
              onNewAlert(parsed);
            }
          }
        });

        initialSnapshotProcessed = true;
      },
      (err) => {
        onStatusChange({
          connected: false,
          error: `Lỗi đọc Firebase (${config.watchPath}): ${err.message}`,
          lastRawSnapshot: null,
        });
      }
    );
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : 'Không thể khởi tạo kết nối Firebase Realtime Database';
    onStatusChange({
      connected: false,
      error: msg,
      lastRawSnapshot: null,
    });
  }
}

export async function stopFirebaseWokwiListener(): Promise<void> {
  if (activeUnsubscribe) {
    activeUnsubscribe();
    activeUnsubscribe = null;
  }
  if (activeApp) {
    try {
      await deleteApp(activeApp);
    } catch {
      // ignore cleanup error
    }
    activeApp = null;
    activeDb = null;
  }
}

/**
 * Hàm đẩy trực tiếp 1 bản tin cảnh báo thử lên Firebase Realtime Database
 * (Giúp kiểm tra luồng Wokwi -> Firebase -> Expo App ngay lập tức)
 */
export async function pushTestAlertToFirebase(
  config: FirebaseRealtimeConfig,
  samplePayload: {
    title: string;
    body: string;
    type: string;
    severity: string;
    eventId: string;
    location: string;
    sensorValue?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  if (!activeDb || !isFirebaseRealtimeConfigured(config)) {
    return {
      ok: false,
      error:
        'Chưa kết nối Firebase Realtime Database. Hãy nhập Database URL hợp lệ trước.',
    };
  }

  try {
    const targetPath = config.watchPath || '/alerts';
    const listRef = ref(activeDb, targetPath);
    const newNodeRef = push(listRef);
    await set(newNodeRef, {
      ...samplePayload,
      deviceId: 'ESP32-WOKWI-SIM',
      timestamp: Date.now(),
    });
    return { ok: true };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Lỗi khi ghi dữ liệu lên Firebase';
    return { ok: false, error: msg };
  }
}
