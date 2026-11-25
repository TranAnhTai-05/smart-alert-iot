import { Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  PermissionStatusType,
  SmartAlertNotification,
} from '@/types/notification';
import { parseRemoteMessageToSmartAlert } from '@/utils/formatters';
import {
  getForegroundBannerSetting,
  upsertIncomingNotification,
} from '@/services/storageService';
import { ALERT_TYPE_CONFIG } from '@/constants/alerts';

export const ANDROID_NOTIFICATION_CHANNEL_ID = 'smart_alert_high_importance';

/**
 * Cấu hình hiển thị thông báo cục bộ khi App đang ở trạng thái Foreground.
 * LƯU Ý QUAN TRỌNG:
 * - Chúng ta KHÔNG dùng Expo Push Service hay Expo Push Token.
 * - `expo-notifications` ở đây chỉ đóng vai trò tạo Notification Channel trên Android 8+
 *   và hiển thị Heads-up Banner cục bộ khi nhận được message FCM lúc App đang mở (Foreground),
 *   vì mặc định FCM không tự bung thanh thông báo hệ thống khi App đang ở Foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type FirebaseMessagingModule = typeof import('@react-native-firebase/messaging');

/**
 * Kiểm tra an toàn xem module native @react-native-firebase/messaging đã được liên kết chưa.
 * Trong Expo Go, module native này không tồn tại (cần dùng Expo Development Build).
 */
export function getNativeFirebaseMessaging(): ReturnType<
  FirebaseMessagingModule['default']
> | null {
  try {
    if (Constants.appOwnership === 'expo') {
      // Đang chạy trong ứng dụng Expo Go (không hỗ trợ native @react-native-firebase)
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingModule = require('@react-native-firebase/messaging');
    const messagingFn = messagingModule?.default ?? messagingModule;
    if (typeof messagingFn !== 'function') {
      return null;
    }
    const instance = messagingFn();
    return instance ?? null;
  } catch (error) {
    console.warn(
      '[FirebaseMessagingService] Không thể khởi tạo native @react-native-firebase/messaging:',
      error
    );
    return null;
  }
}

/**
 * Đăng ký Background Message Handler ở mức top-level (chỉ đăng ký 1 lần duy nhất).
 * Lưu ý về cơ chế FCM trên Android:
 * - Khi App ở Background/Terminated và nhận "Data-only message" hoặc một số message có kèm data,
 *   background handler sẽ được Android đánh thức để lưu lịch sử vào AsyncStorage.
 * - Khi nhận "Notification message", hệ điều hành Android tự động hiển thị thông báo lên thanh trạng thái;
 *   chúng ta KHÔNG gọi presentLocalNotification ở đây để tránh hiển thị thông báo trùng lặp!
 */
let isBackgroundHandlerRegistered = false;

export function registerTopLevelBackgroundHandler(): void {
  if (isBackgroundHandlerRegistered) return;
  const messagingInstance = getNativeFirebaseMessaging();
  if (!messagingInstance) return;

  try {
    messagingInstance.setBackgroundMessageHandler(async (remoteMessage) => {
      try {
        const parsed = parseRemoteMessageToSmartAlert(
          remoteMessage,
          'background_headless'
        );
        await upsertIncomingNotification(parsed, false);
      } catch (err) {
        console.error(
          '[FirebaseMessagingService] Lỗi trong setBackgroundMessageHandler:',
          err
        );
      }
    });
    isBackgroundHandlerRegistered = true;
  } catch (error) {
    console.warn(
      '[FirebaseMessagingService] Không thể đăng ký setBackgroundMessageHandler:',
      error
    );
  }
}

/**
 * Thiết lập kênh thông báo độ ưu tiên cao cho Android 8.0+ (API 26+)
 */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(
      ANDROID_NOTIFICATION_CHANNEL_ID,
      {
        name: 'Cảnh báo khẩn cấp Smart Alert',
        description:
          'Kênh nhận thông báo đẩy mức độ ưu tiên cao từ hệ thống Firebase Cloud Messaging',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 200, 250],
        lightColor: '#1D4ED8',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      }
    );
  } catch (error) {
    console.warn(
      '[FirebaseMessagingService] Không thể tạo Android Notification Channel:',
      error
    );
  }
}

/**
 * Kiểm tra trạng thái quyền nhận thông báo hiện tại (hỗ trợ chuẩn Android 13+ POST_NOTIFICATIONS)
 */
export async function checkNotificationPermissionStatus(): Promise<PermissionStatusType> {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted) return 'granted';
    }

    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) {
      return 'granted';
    }
    if (settings.canAskAgain === false) {
      return 'denied';
    }
    return 'undetermined';
  } catch (error) {
    console.warn(
      '[FirebaseMessagingService] Lỗi khi kiểm tra quyền thông báo:',
      error
    );
    return 'undetermined';
  }
}

/**
 * Yêu cầu cấp quyền nhận thông báo trên Android 13+ (API 33+) và Firebase Messaging
 */
export async function requestNotificationPermission(): Promise<PermissionStatusType> {
  try {
    await ensureAndroidNotificationChannel();

    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return 'denied';
      }
    }

    const expoPerm = await Notifications.requestPermissionsAsync();
    const messagingInstance = getNativeFirebaseMessaging();

    if (messagingInstance) {
      const authStatus = await messagingInstance.requestPermission();
      // AuthorizationStatus.AUTHORIZED = 1, PROVISIONAL = 2
      if (authStatus === 1 || authStatus === 2) {
        return 'granted';
      }
    }

    return expoPerm.granted ? 'granted' : 'denied';
  } catch (error) {
    console.error(
      '[FirebaseMessagingService] Lỗi khi yêu cầu quyền thông báo:',
      error
    );
    return 'denied';
  }
}

/**
 * Lấy FCM Token thật trực tiếp từ Firebase Cloud Messaging
 * Tuyệt đối không dùng Expo Push Token và không hardcode token giả.
 */
export async function fetchRealFcmToken(): Promise<{
  token: string | null;
  error: string | null;
}> {
  const messagingInstance = getNativeFirebaseMessaging();
  if (!messagingInstance) {
    if (Constants.appOwnership === 'expo') {
      return {
        token: null,
        error:
          'Ứng dụng đang mở trong Expo Go. Expo Go không hỗ trợ native module @react-native-firebase/messaging. Vui lòng chạy bằng bản dựng Expo Development Build (APK) trên điện thoại Android thật.',
      };
    }
    return {
      token: null,
      error:
        'Chưa tìm thấy native module Firebase Messaging hoặc thiếu cấu hình google-services.json khi build ứng dụng.',
    };
  }

  try {
    if (!messagingInstance.isDeviceRegisteredForRemoteMessages) {
      await messagingInstance.registerDeviceForRemoteMessages();
    }
    const token = await messagingInstance.getToken();
    if (!token || token.trim().length === 0) {
      return {
        token: null,
        error: 'Firebase chưa trả về FCM Token. Hãy kiểm tra kết nối mạng và Google Play Services trên thiết bị.',
      };
    }
    return { token, error: null };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Lỗi không xác định khi lấy FCM Token';
    return {
      token: null,
      error: `Không thể lấy FCM Token từ Firebase: ${message}`,
    };
  }
}

/**
 * Hiển thị thông báo hệ thống cục bộ CHỈ KHI App đang ở Foreground.
 * Khi App ở Background hoặc Terminated, FCM/Android đã tự hiển thị Notification Message,
 * nên ta không gọi hàm này ở Background để tránh bị trùng lặp 2 thông báo!
 */
export async function displayForegroundLocalNotification(
  alertItem: SmartAlertNotification
): Promise<void> {
  try {
    const shouldDisplay = await getForegroundBannerSetting();
    if (!shouldDisplay) return;

    const typeMeta = ALERT_TYPE_CONFIG[alertItem.alertType];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alertItem.title,
        body: alertItem.body,
        data: {
          localNotificationForFcmId: alertItem.id,
          isLocalForegroundCopy: 'true',
        },
        sound: 'default',
        color: typeMeta.accentColor,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn(
      '[FirebaseMessagingService] Không thể hiển thị banner thông báo cục bộ ở Foreground:',
      error
    );
  }
}

export function getEnvironmentSummary() {
  return {
    isPhysicalDevice: Device.isDevice,
    deviceName: Device.deviceName ?? Device.modelName ?? 'Thiết bị Android',
    osName: Platform.OS,
    osVersion: String(Platform.Version),
    appOwnership: Constants.appOwnership ?? 'standalone_or_dev_client',
  };
}
