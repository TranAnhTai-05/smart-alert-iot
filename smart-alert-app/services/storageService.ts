import AsyncStorage from '@react-native-async-storage/async-storage';
import { SmartAlertNotification } from '@/types/notification';

const STORAGE_KEYS = {
  NOTIFICATION_HISTORY: '@smart_alert/notification_history_v1',
  SETTINGS_FOREGROUND_BANNER: '@smart_alert/foreground_banner_v1',
  SETTINGS_MASTER_ENABLED: '@smart_alert/notifications_master_enabled_v1',
  LAST_FCM_TOKEN: '@smart_alert/last_fcm_token_v1',
};

const MAX_STORED_NOTIFICATIONS = 200;

/**
 * Đọc toàn bộ lịch sử thông báo đã lưu cục bộ từ AsyncStorage
 */
export async function loadStoredNotifications(): Promise<SmartAlertNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SmartAlertNotification[];
  } catch (error) {
    console.error('[StorageService] Lỗi khi đọc lịch sử thông báo:', error);
    return [];
  }
}

/**
 * Lưu danh sách thông báo vào AsyncStorage
 */
export async function saveNotificationsList(
  notifications: SmartAlertNotification[]
): Promise<void> {
  try {
    const trimmed = notifications.slice(0, MAX_STORED_NOTIFICATIONS);
    await AsyncStorage.setItem(
      STORAGE_KEYS.NOTIFICATION_HISTORY,
      JSON.stringify(trimmed)
    );
  } catch (error) {
    console.error('[StorageService] Lỗi khi lưu danh sách thông báo:', error);
  }
}

/**
 * Thêm một thông báo mới từ Firebase vào AsyncStorage, chống trùng lặp theo messageId / eventId / id.
 * Trả về danh sách mới nhất và bản ghi thông báo đã được hợp nhất.
 */
export async function upsertIncomingNotification(
  incoming: SmartAlertNotification,
  markAsRead = false
): Promise<{
  list: SmartAlertNotification[];
  targetItem: SmartAlertNotification;
  isDuplicate: boolean;
}> {
  const currentList = await loadStoredNotifications();

  const existingIndex = currentList.findIndex((item) => {
    if (incoming.messageId && item.messageId === incoming.messageId) {
      return true;
    }
    if (incoming.eventId && item.eventId === incoming.eventId) {
      return true;
    }
    return item.id === incoming.id;
  });

  if (existingIndex !== -1) {
    const existingItem = currentList[existingIndex];
    const updatedItem: SmartAlertNotification = {
      ...existingItem,
      read: markAsRead ? true : existingItem.read,
      receivedState:
        existingItem.receivedState === 'background_headless' &&
        (incoming.receivedState === 'background_opened' ||
          incoming.receivedState === 'quit_opened')
          ? incoming.receivedState
          : existingItem.receivedState,
    };

    const updatedList = [...currentList];
    updatedList[existingIndex] = updatedItem;
    await saveNotificationsList(updatedList);

    return {
      list: updatedList,
      targetItem: updatedItem,
      isDuplicate: true,
    };
  }

  const finalItem: SmartAlertNotification = {
    ...incoming,
    read: markAsRead ? true : incoming.read,
  };

  const nextList = [finalItem, ...currentList].slice(0, MAX_STORED_NOTIFICATIONS);
  await saveNotificationsList(nextList);

  return {
    list: nextList,
    targetItem: finalItem,
    isDuplicate: false,
  };
}

/**
 * Đánh dấu 1 thông báo là đã đọc
 */
export async function markNotificationAsReadInStorage(
  id: string
): Promise<SmartAlertNotification[]> {
  const current = await loadStoredNotifications();
  const next = current.map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  await saveNotificationsList(next);
  return next;
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export async function markAllNotificationsAsReadInStorage(): Promise<
  SmartAlertNotification[]
> {
  const current = await loadStoredNotifications();
  const next = current.map((item) => ({ ...item, read: true }));
  await saveNotificationsList(next);
  return next;
}

/**
 * Xóa 1 thông báo khỏi lịch sử
 */
export async function deleteNotificationFromStorage(
  id: string
): Promise<SmartAlertNotification[]> {
  const current = await loadStoredNotifications();
  const next = current.filter((item) => item.id !== id);
  await saveNotificationsList(next);
  return next;
}

/**
 * Xóa toàn bộ lịch sử thông báo
 */
export async function clearAllNotificationsInStorage(): Promise<
  SmartAlertNotification[]
> {
  await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
  return [];
}

/**
 * Đọc/lưu cấu hình hiển thị thông báo hệ thống cục bộ khi App đang mở (Foreground)
 */
export async function getForegroundBannerSetting(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_FOREGROUND_BANNER);
    if (val === null) return true; // Mặc định bật cho Foreground
    return val === 'true';
  } catch {
    return true;
  }
}

export async function setForegroundBannerSetting(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SETTINGS_FOREGROUND_BANNER,
      enabled ? 'true' : 'false'
    );
  } catch (error) {
    console.error('[StorageService] Lỗi khi lưu cài đặt Foreground Banner:', error);
  }
}

/**
 * Đọc/lưu công tắc tổng Bật/Tắt nhận thông báo cảnh báo
 */
export async function getNotificationsMasterEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_MASTER_ENABLED);
    if (val === null) return true; // Mặc định bật
    return val === 'true';
  } catch {
    return true;
  }
}

export async function setNotificationsMasterEnabled(
  enabled: boolean
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SETTINGS_MASTER_ENABLED,
      enabled ? 'true' : 'false'
    );
  } catch (error) {
    console.error('[StorageService] Lỗi khi lưu trạng thái bật/tắt thông báo:', error);
  }
}
