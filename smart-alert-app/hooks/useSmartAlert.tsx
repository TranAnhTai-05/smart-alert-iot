import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  FirebaseConnectionState,
  PermissionStatusType,
  SmartAlertNotification,
} from '@/types/notification';
import {
  DEFAULT_FIREBASE_REALTIME_CONFIG,
  FirebaseRealtimeConfig,
} from '@/constants/firebaseConfig';
import {
  clearAllNotificationsInStorage,
  deleteNotificationFromStorage,
  getForegroundBannerSetting,
  getNotificationsMasterEnabled,
  loadStoredNotifications,
  markAllNotificationsAsReadInStorage,
  markNotificationAsReadInStorage,
  setForegroundBannerSetting,
  setNotificationsMasterEnabled,
  upsertIncomingNotification,
} from '@/services/storageService';
import {
  checkNotificationPermissionStatus,
  displayForegroundLocalNotification,
  ensureAndroidNotificationChannel,
  fetchRealFcmToken,
  getEnvironmentSummary,
  getNativeFirebaseMessaging,
  requestNotificationPermission,
} from '@/services/firebaseMessagingService';
import {
  isFirebaseRealtimeConfigured,
  loadFirebaseRealtimeConfig,
  pushTestAlertToFirebase,
  saveFirebaseRealtimeConfig,
  startFirebaseWokwiListener,
  stopFirebaseWokwiListener,
} from '@/services/firebaseWokwiBridge';
import { parseRemoteMessageToSmartAlert } from '@/utils/formatters';

interface SmartAlertContextValue {
  notifications: SmartAlertNotification[];
  unreadCount: number;
  totalCount: number;
  latestAlertBanner: SmartAlertNotification | null;
  dismissLatestAlertBanner: () => void;

  connectionState: FirebaseConnectionState;
  isNativeModuleAvailable: boolean;
  isPhysicalDevice: boolean;
  deviceName: string;
  appOwnership: string;
  permissionStatus: PermissionStatusType;
  fcmToken: string | null;
  tokenUpdatedAt: string | null;
  lastError: string | null;
  isNetworkConnected: boolean;
  isRefreshingToken: boolean;
  foregroundBannerEnabled: boolean;
  notificationsEnabled: boolean;

  // Liên kết thời gian thực Wokwi <-> Firebase <-> Expo App
  realtimeConfig: FirebaseRealtimeConfig;
  isWokwiFirebaseConnected: boolean;
  wokwiFirebaseError: string | null;
  lastWokwiSnapshot: Record<string, unknown> | null;
  updateRealtimeConfig: (newConfig: FirebaseRealtimeConfig) => Promise<void>;
  sendTestAlertViaFirebaseWokwi: (sample: {
    title: string;
    body: string;
    type: string;
    severity: string;
    eventId: string;
    location: string;
    sensorValue?: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  refreshFcmToken: () => Promise<void>;
  requestPermissionAndInit: () => Promise<PermissionStatusType>;
  openSystemNotificationSettings: () => Promise<void>;
  toggleForegroundBanner: (enabled: boolean) => Promise<void>;
  toggleNotificationsEnabled: (enabled: boolean) => Promise<void>;
  reloadHistoryFromStorage: () => Promise<void>;

  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const SmartAlertContext = createContext<SmartAlertContextValue | undefined>(
  undefined
);

export const SmartAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const envInfo = useMemo(() => getEnvironmentSummary(), []);

  const [notifications, setNotifications] = useState<SmartAlertNotification[]>(
    []
  );
  const [latestAlertBanner, setLatestAlertBanner] =
    useState<SmartAlertNotification | null>(null);

  const [connectionState, setConnectionState] =
    useState<FirebaseConnectionState>('initializing');
  const [isNativeModuleAvailable, setIsNativeModuleAvailable] =
    useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatusType>('checking');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [tokenUpdatedAt, setTokenUpdatedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isNetworkConnected, setIsNetworkConnected] = useState<boolean>(true);
  const [isRefreshingToken, setIsRefreshingToken] = useState<boolean>(false);
  const [foregroundBannerEnabled, setForegroundBannerState] =
    useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabledState] =
    useState<boolean>(true);
  const notificationsEnabledRef = useRef<boolean>(true);

  // State cho kết nối Firebase Realtime Database (Wokwi -> Firebase -> Expo)
  const [realtimeConfig, setRealtimeConfig] = useState<FirebaseRealtimeConfig>(
    DEFAULT_FIREBASE_REALTIME_CONFIG
  );
  const [isWokwiFirebaseConnected, setIsWokwiFirebaseConnected] =
    useState<boolean>(false);
  const [wokwiFirebaseError, setWokwiFirebaseError] = useState<string | null>(
    null
  );
  const [lastWokwiSnapshot, setLastWokwiSnapshot] = useState<Record<
    string,
    unknown
  > | null>(null);

  const listenersRegisteredRef = useRef<boolean>(false);
  const initialNotificationCheckedRef = useRef<boolean>(false);

  const reloadHistoryFromStorage = useCallback(async () => {
    const stored = await loadStoredNotifications();
    setNotifications(stored);
  }, []);

  /**
   * Xử lý khi có cảnh báo mới đổ về từ Firebase (cả FCM lẫn Firebase Realtime Database liên kết Wokwi)
   * Hiển thị Banner lên giao diện NGAY LẬP TỨC (0ms) trước khi ghi đĩa AsyncStorage để không bị trễ!
   */
  const handleIncomingAlert = useCallback(
    async (incoming: SmartAlertNotification) => {
      if (!notificationsEnabledRef.current) {
        return;
      }

      // 1. Hiển thị Banner cảnh báo lên màn hình ngay lập tức (0ms delay)
      setLatestAlertBanner(incoming);
      setNotifications((prev) => {
        const exists = prev.some(
          (item) =>
            item.id === incoming.id ||
            (incoming.messageId && item.messageId === incoming.messageId) ||
            (incoming.eventId && item.eventId === incoming.eventId)
        );
        if (exists) return prev;
        return [incoming, ...prev];
      });

      // 2. Phát chuông/thông báo hệ thống và lưu xuống bộ nhớ ngầm song song
      displayForegroundLocalNotification(incoming);
      const { list } = await upsertIncomingNotification(incoming, false);
      setNotifications(list);
    },
    []
  );

  /**
   * Kết nối listener Firebase Realtime Database (Wokwi)
   */
  const connectWokwiBridge = useCallback(
    async (cfg: FirebaseRealtimeConfig) => {
      await startFirebaseWokwiListener(
        cfg,
        (newAlert) => {
          handleIncomingAlert(newAlert);
        },
        (status) => {
          setIsWokwiFirebaseConnected(status.connected);
          setWokwiFirebaseError(status.error);
          if (status.lastRawSnapshot !== undefined) {
            setLastWokwiSnapshot(status.lastRawSnapshot);
          }
          if (status.connected) {
            setConnectionState('connected');
            setLastError(null);
          }
        }
      );
    },
    [handleIncomingAlert]
  );

  const updateRealtimeConfig = useCallback(
    async (newConfig: FirebaseRealtimeConfig) => {
      const saved = await saveFirebaseRealtimeConfig(newConfig);
      setRealtimeConfig(saved);
      await connectWokwiBridge(saved);
    },
    [connectWokwiBridge]
  );

  const sendTestAlertViaFirebaseWokwi = useCallback(
    async (sample: {
      title: string;
      body: string;
      type: string;
      severity: string;
      eventId: string;
      location: string;
      sensorValue?: string;
    }) => {
      return pushTestAlertToFirebase(realtimeConfig, sample);
    },
    [realtimeConfig]
  );

  /**
   * Hàm lấy FCM Token thật và cập nhật trạng thái kết nối Firebase
   */
  const refreshFcmToken = useCallback(async () => {
    setIsRefreshingToken(true);
    try {
      const netState = await NetInfo.fetch();
      const online = Boolean(
        netState.isConnected && netState.isInternetReachable !== false
      );
      setIsNetworkConnected(online);

      const perm = await checkNotificationPermissionStatus();
      setPermissionStatus(perm);

      const nativeMessaging = getNativeFirebaseMessaging();
      const hasNative = Boolean(nativeMessaging);
      setIsNativeModuleAvailable(hasNative);

      if (!online) {
        setConnectionState('offline');
        setLastError('Thiết bị đang mất kết nối mạng Internet.');
        return;
      }

      if (hasNative) {
        const { token, error } = await fetchRealFcmToken();
        if (token) {
          setFcmToken(token);
          setTokenUpdatedAt(new Date().toISOString());
          setLastError(null);
          setConnectionState(
            perm === 'granted' ? 'connected' : 'missing_permission'
          );
          return;
        } else {
          setLastError(error);
        }
      }

      // Nếu đang chạy trên Expo Go hoặc Web, kiểm tra xem đã kết nối Firebase Realtime (Wokwi) chưa
      const currentRtdbCfg = await loadFirebaseRealtimeConfig();
      if (isFirebaseRealtimeConfigured(currentRtdbCfg)) {
        setConnectionState('connected');
        setLastError(null);
      } else if (!hasNative) {
        setConnectionState('missing_native_module');
        setLastError(
          'Bạn đang chạy trực tiếp trên Expo (Expo Go / Web). Hãy nhập Database URL của Firebase liên kết Wokwi tại tab "Cài đặt Firebase" để nhận cảnh báo thời gian thực ngay trên Expo!'
        );
      }
    } finally {
      setIsRefreshingToken(false);
    }
  }, []);

  /**
   * Yêu cầu quyền thông báo và khởi tạo lại
   */
  const requestPermissionAndInit =
    useCallback(async (): Promise<PermissionStatusType> => {
      const perm = await requestNotificationPermission();
      setPermissionStatus(perm);
      await refreshFcmToken();
      return perm;
    }, [refreshFcmToken]);

  /**
   * Mở phần Cài đặt ứng dụng của điện thoại Android
   */
  const openSystemNotificationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('[useSmartAlert] Không thể mở cài đặt hệ thống:', error);
    }
  }, []);

  const toggleForegroundBanner = useCallback(async (enabled: boolean) => {
    setForegroundBannerState(enabled);
    await setForegroundBannerSetting(enabled);
  }, []);

  const toggleNotificationsEnabled = useCallback(async (enabled: boolean) => {
    notificationsEnabledRef.current = enabled;
    setNotificationsEnabledState(enabled);
    if (!enabled) {
      setLatestAlertBanner(null);
    }
    await setNotificationsMasterEnabled(enabled);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const next = await markNotificationAsReadInStorage(id);
    setNotifications(next);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const next = await markAllNotificationsAsReadInStorage();
    setNotifications(next);
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const next = await deleteNotificationFromStorage(id);
    setNotifications(next);
  }, []);

  const clearAllNotifications = useCallback(async () => {
    const next = await clearAllNotificationsInStorage();
    setNotifications(next);
  }, []);

  const dismissLatestAlertBanner = useCallback(() => {
    setLatestAlertBanner(null);
  }, []);

  /**
   * Khởi tạo dữ liệu lịch sử, cài đặt, kết nối Wokwi Firebase và theo dõi mạng
   */
  useEffect(() => {
    let isMounted = true;

    (async () => {
      await ensureAndroidNotificationChannel();
      const [storedList, bannerSetting, masterEnabled, savedRtdbConfig] =
        await Promise.all([
          loadStoredNotifications(),
          getForegroundBannerSetting(),
          getNotificationsMasterEnabled(),
          loadFirebaseRealtimeConfig(),
        ]);
      if (!isMounted) return;
      setNotifications(storedList);
      setForegroundBannerState(bannerSetting);
      notificationsEnabledRef.current = masterEnabled;
      setNotificationsEnabledState(masterEnabled);
      setRealtimeConfig(savedRtdbConfig);

      const currentPerm = await checkNotificationPermissionStatus();
      if (!isMounted) return;
      setPermissionStatus(currentPerm);

      if (currentPerm === 'undetermined') {
        const requested = await requestNotificationPermission();
        if (isMounted) setPermissionStatus(requested);
      }

      if (isFirebaseRealtimeConfigured(savedRtdbConfig)) {
        await connectWokwiBridge(savedRtdbConfig);
      }

      await refreshFcmToken();
    })();

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setIsNetworkConnected(online);
      if (!online) {
        setConnectionState('offline');
      }
    });

    const appStateSub = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          await reloadHistoryFromStorage();
          const perm = await checkNotificationPermissionStatus();
          setPermissionStatus(perm);
          await refreshFcmToken();
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeNetInfo();
      appStateSub.remove();
      stopFirebaseWokwiListener();
    };
  }, [connectWokwiBridge, refreshFcmToken, reloadHistoryFromStorage]);

  /**
   * Đăng ký các listener của Firebase Cloud Messaging (chỉ đăng ký 1 lần và cleanup đầy đủ)
   */
  useEffect(() => {
    if (listenersRegisteredRef.current) return;

    const nativeMessaging = getNativeFirebaseMessaging();
    const localNotificationTapSub =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, string>
          | undefined;
        const targetId = data?.localNotificationForFcmId;
        if (targetId) {
          router.push({
            pathname: '/notification/[id]',
            params: { id: String(targetId) },
          });
        }
      });

    if (!nativeMessaging) {
      return () => {
        localNotificationTapSub.remove();
      };
    }

    listenersRegisteredRef.current = true;

    const unsubscribeTokenRefresh = nativeMessaging.onTokenRefresh(
      (newToken: string) => {
        if (newToken) {
          setFcmToken(newToken);
          setTokenUpdatedAt(new Date().toISOString());
          setConnectionState('connected');
          setLastError(null);
        }
      }
    );

    const unsubscribeOnMessage = nativeMessaging.onMessage(
      async (remoteMessage) => {
        try {
          const parsed = parseRemoteMessageToSmartAlert(
            remoteMessage,
            'foreground'
          );
          await handleIncomingAlert(parsed);
        } catch (error) {
          console.error('[useSmartAlert] Lỗi khi xử lý foreground message:', error);
        }
      }
    );

    const unsubscribeOnNotificationOpened =
      nativeMessaging.onNotificationOpenedApp(async (remoteMessage) => {
        if (!remoteMessage) return;
        try {
          const parsed = parseRemoteMessageToSmartAlert(
            remoteMessage,
            'background_opened'
          );
          const { list, targetItem } = await upsertIncomingNotification(
            parsed,
            true
          );
          setNotifications(list);
          router.push({
            pathname: '/notification/[id]',
            params: { id: targetItem.id },
          });
        } catch (error) {
          console.error(
            '[useSmartAlert] Lỗi khi xử lý onNotificationOpenedApp:',
            error
          );
        }
      });

    if (!initialNotificationCheckedRef.current) {
      initialNotificationCheckedRef.current = true;
      nativeMessaging
        .getInitialNotification()
        .then(async (remoteMessage) => {
          if (!remoteMessage) return;
          const parsed = parseRemoteMessageToSmartAlert(
            remoteMessage,
            'quit_opened'
          );
          const { list, targetItem } = await upsertIncomingNotification(
            parsed,
            true
          );
          setNotifications(list);
          setTimeout(() => {
            router.push({
              pathname: '/notification/[id]',
              params: { id: targetItem.id },
            });
          }, 350);
        })
        .catch((err: unknown) => {
          console.warn(
            '[useSmartAlert] Lỗi khi kiểm tra getInitialNotification:',
            err
          );
        });
    }

    return () => {
      listenersRegisteredRef.current = false;
      unsubscribeTokenRefresh();
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpened();
      localNotificationTapSub.remove();
    };
  }, [handleIncomingAlert, router]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const value = useMemo<SmartAlertContextValue>(
    () => ({
      notifications,
      unreadCount,
      totalCount: notifications.length,
      latestAlertBanner,
      dismissLatestAlertBanner,
      connectionState: isWokwiFirebaseConnected ? 'connected' : connectionState,
      isNativeModuleAvailable,
      isPhysicalDevice: envInfo.isPhysicalDevice,
      deviceName: envInfo.deviceName,
      appOwnership: envInfo.appOwnership,
      permissionStatus,
      fcmToken,
      tokenUpdatedAt,
      lastError: isWokwiFirebaseConnected ? null : lastError,
      isNetworkConnected,
      isRefreshingToken,
      foregroundBannerEnabled,
      notificationsEnabled,
      realtimeConfig,
      isWokwiFirebaseConnected,
      wokwiFirebaseError,
      lastWokwiSnapshot,
      updateRealtimeConfig,
      sendTestAlertViaFirebaseWokwi,
      refreshFcmToken,
      requestPermissionAndInit,
      openSystemNotificationSettings,
      toggleForegroundBanner,
      toggleNotificationsEnabled,
      reloadHistoryFromStorage,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
    }),
    [
      notifications,
      unreadCount,
      latestAlertBanner,
      dismissLatestAlertBanner,
      isWokwiFirebaseConnected,
      connectionState,
      isNativeModuleAvailable,
      envInfo.isPhysicalDevice,
      envInfo.deviceName,
      envInfo.appOwnership,
      permissionStatus,
      fcmToken,
      tokenUpdatedAt,
      lastError,
      isNetworkConnected,
      isRefreshingToken,
      foregroundBannerEnabled,
      notificationsEnabled,
      realtimeConfig,
      wokwiFirebaseError,
      lastWokwiSnapshot,
      updateRealtimeConfig,
      sendTestAlertViaFirebaseWokwi,
      refreshFcmToken,
      requestPermissionAndInit,
      openSystemNotificationSettings,
      toggleForegroundBanner,
      toggleNotificationsEnabled,
      reloadHistoryFromStorage,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
    ]
  );

  return (
    <SmartAlertContext.Provider value={value}>
      {children}
    </SmartAlertContext.Provider>
  );
};

export function useSmartAlert(): SmartAlertContextValue {
  const ctx = useContext(SmartAlertContext);
  if (!ctx) {
    throw new Error('useSmartAlert phải được sử dụng bên trong SmartAlertProvider');
  }
  return ctx;
}
