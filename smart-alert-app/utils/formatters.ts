import {
  AlertSeverity,
  AlertType,
  AppReceiveState,
  FcmPayloadKind,
  SmartAlertNotification,
} from '@/types/notification';

/**
 * Định dạng thời gian hiển thị tiếng Việt rõ ràng
 */
export function formatDateTimeVN(isoString: string | null | undefined): string {
  if (!isoString) return 'Không xác định';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
}

/**
 * Định dạng thời gian tương đối (Vừa xong, X phút trước...)
 */
export function formatRelativeTimeVN(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 30) return 'Vừa xong';
  if (diffSec < 60) return `${diffSec} giây trước`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return formatDateTimeVN(isoString);
}

/**
 * Phân loại AlertType dựa trên data.type (ưu tiên) hoặc từ khóa trong tiêu đề/nội dung.
 * Giữ nguyên rawTypeFromPayload để màn hình Chi tiết hiển thị trung thực.
 */
export function resolveAlertType(
  rawType: string | null,
  title: string,
  body: string
): AlertType {
  if (rawType) {
    const normalized = rawType.trim().toUpperCase();
    if (
      normalized === 'HIGH_TEMP' ||
      normalized === 'TEMP_HIGH' ||
      normalized === 'OVERHEAT'
    ) {
      return 'HIGH_TEMP';
    }
    if (normalized === 'LOW_TEMP' || normalized === 'TEMP_LOW') {
      return 'LOW_TEMP';
    }
    if (
      normalized === 'INTRUSION' ||
      normalized === 'STRANGER' ||
      normalized === 'MOTION'
    ) {
      return 'INTRUSION';
    }
    if (normalized === 'FIRE' || normalized === 'SMOKE') {
      return 'FIRE';
    }
    if (normalized === 'GAS_LEAK' || normalized === 'GAS') {
      return 'GAS_LEAK';
    }
    if (
      normalized === 'SYSTEM_CHECK' ||
      normalized === 'TEST' ||
      normalized === 'SYSTEM'
    ) {
      return 'SYSTEM_CHECK';
    }
  }

  const combinedText = `${title} ${body}`.toLowerCase();
  if (combinedText.includes('cháy') || combinedText.includes('lửa') || combinedText.includes('khói')) {
    return 'FIRE';
  }
  if (combinedText.includes('gas') || combinedText.includes('khí')) {
    return 'GAS_LEAK';
  }
  if (combinedText.includes('nhiệt độ cao') || combinedText.includes('quá nhiệt') || combinedText.includes('nóng')) {
    return 'HIGH_TEMP';
  }
  if (combinedText.includes('nhiệt độ thấp') || combinedText.includes('lạnh')) {
    return 'LOW_TEMP';
  }
  if (
    combinedText.includes('người lạ') ||
    combinedText.includes('xâm nhập') ||
    combinedText.includes('đột nhập')
  ) {
    return 'INTRUSION';
  }
  if (combinedText.includes('kiểm tra') || combinedText.includes('test') || combinedText.includes('hệ thống')) {
    return 'SYSTEM_CHECK';
  }

  return 'UNKNOWN';
}

/**
 * Chỉ trích xuất mức độ nguy hiểm nếu payload thực sự cung cấp trong data.severity (hoặc data.level).
 * Tuyệt đối không tự bịa severity nếu payload không gửi.
 */
export function extractSeverityFromPayload(
  rawData: Record<string, string>
): AlertSeverity | null {
  const rawSeverity = (rawData.severity ?? rawData.level ?? '').trim().toLowerCase();
  if (!rawSeverity) return null;

  if (
    rawSeverity === 'critical' ||
    rawSeverity === 'high' ||
    rawSeverity === 'danger' ||
    rawSeverity === 'khẩn cấp' ||
    rawSeverity === 'nguy hiểm'
  ) {
    return 'critical';
  }
  if (
    rawSeverity === 'warning' ||
    rawSeverity === 'medium' ||
    rawSeverity === 'cảnh báo'
  ) {
    return 'warning';
  }
  if (
    rawSeverity === 'info' ||
    rawSeverity === 'low' ||
    rawSeverity === 'normal' ||
    rawSeverity === 'thông tin'
  ) {
    return 'info';
  }

  return null;
}

/**
 * Chuyển đổi đối tượng RemoteMessage thực tế từ @react-native-firebase/messaging
 * sang cấu trúc SmartAlertNotification chuẩn.
 */
export function parseRemoteMessageToSmartAlert(
  remoteMessage: {
    messageId?: string;
    sentTime?: number;
    notification?: {
      title?: string;
      body?: string;
    };
    data?: Record<string, string | object>;
  },
  receivedState: AppReceiveState
): SmartAlertNotification {
  const rawData: Record<string, string> = {};
  if (remoteMessage.data && typeof remoteMessage.data === 'object') {
    Object.entries(remoteMessage.data).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        rawData[key] = typeof val === 'string' ? val : JSON.stringify(val);
      }
    });
  }

  const hasNotificationBlock = Boolean(
    remoteMessage.notification?.title || remoteMessage.notification?.body
  );
  const hasDataBlock = Object.keys(rawData).length > 0;

  let payloadKind: FcmPayloadKind = 'notification-only';
  if (hasNotificationBlock && hasDataBlock) {
    payloadKind = 'notification+data';
  } else if (!hasNotificationBlock && hasDataBlock) {
    payloadKind = 'data-only';
  }

  const title =
    remoteMessage.notification?.title?.trim() ||
    rawData.title?.trim() ||
    'Thông báo từ Firebase';

  const body =
    remoteMessage.notification?.body?.trim() ||
    rawData.body?.trim() ||
    rawData.message?.trim() ||
    'Không có nội dung văn bản đi kèm trong payload.';

  const rawTypeFromPayload = rawData.type?.trim() || rawData.alertType?.trim() || null;
  const alertType = resolveAlertType(rawTypeFromPayload, title, body);
  const severityFromPayload = extractSeverityFromPayload(rawData);

  const eventId =
    rawData.eventId?.trim() ||
    rawData.event_id?.trim() ||
    rawData.alertId?.trim() ||
    null;

  const messageId = remoteMessage.messageId?.trim() || null;
  const uniqueId =
    messageId ||
    eventId ||
    `fcm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const sentAt =
    remoteMessage.sentTime && remoteMessage.sentTime > 0
      ? new Date(remoteMessage.sentTime).toISOString()
      : null;

  return {
    id: uniqueId,
    messageId,
    eventId,
    title,
    body,
    alertType,
    rawTypeFromPayload,
    severityFromPayload,
    payloadKind,
    receivedState,
    receivedAt: new Date().toISOString(),
    sentAt,
    read: false,
    rawData,
    deviceId: rawData.deviceId?.trim() || rawData.device_id?.trim() || null,
    location: rawData.location?.trim() || null,
    sensorValue: rawData.sensorValue?.trim() || rawData.value?.trim() || null,
  };
}

export function getPayloadKindLabel(kind: FcmPayloadKind): string {
  switch (kind) {
    case 'notification+data':
      return 'Notification + Data Payload';
    case 'data-only':
      return 'Data-only Payload';
    case 'notification-only':
    default:
      return 'Notification Payload';
  }
}

export function getReceiveStateLabel(state: AppReceiveState): string {
  switch (state) {
    case 'foreground':
      return 'Nhận trực tiếp khi App đang mở (Foreground)';
    case 'background_opened':
      return 'Nhấn mở từ thông báo khi App chạy nền (Background Tap)';
    case 'quit_opened':
      return 'Nhấn mở từ thông báo khi App đã đóng (Terminated Tap)';
    case 'background_headless':
      return 'Xử lý ngầm bởi Background Handler';
  }
}
