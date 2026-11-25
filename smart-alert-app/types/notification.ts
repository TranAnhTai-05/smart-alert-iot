/**
 * Định nghĩa kiểu dữ liệu cho hệ thống Smart Alert (LAB 1 - Firebase FCM)
 * Thiết kế sẵn sàng mở rộng cho LAB 2 (Node.js REST API) và LAB 3 (IoT Sensor Gateway)
 */

export type AlertType =
  | 'HIGH_TEMP'
  | 'LOW_TEMP'
  | 'INTRUSION'
  | 'FIRE'
  | 'GAS_LEAK'
  | 'SYSTEM_CHECK'
  | 'UNKNOWN';

/**
 * Mức độ nguy hiểm thực tế từ payload (hoặc null nếu payload không cung cấp)
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Phân biệt rõ loại payload FCM gửi tới ứng dụng
 */
export type FcmPayloadKind =
  | 'notification-only'
  | 'data-only'
  | 'notification+data';

/**
 * Trạng thái của ứng dụng tại thời điểm nhận hoặc mở thông báo
 */
export type AppReceiveState =
  | 'foreground'
  | 'background_opened'
  | 'quit_opened'
  | 'background_headless';

/**
 * Bản ghi thông báo lưu trong AsyncStorage và hiển thị trên UI
 */
export interface SmartAlertNotification {
  /** ID định danh duy nhất cục bộ (ưu tiên lấy từ messageId hoặc eventId) */
  id: string;
  /** messageId gốc do FCM cấp (nếu có) */
  messageId: string | null;
  /** Mã sự kiện từ payload data.eventId (null nếu payload không gửi) */
  eventId: string | null;
  /** Tiêu đề thông báo */
  title: string;
  /** Nội dung thông báo */
  body: string;
  /** Loại cảnh báo đã phân loại để hiển thị icon/màu sắc */
  alertType: AlertType;
  /** Giá trị data.type gốc trong payload (null nếu người gửi không truyền) */
  rawTypeFromPayload: string | null;
  /** Mức độ nguy hiểm lấy trực tiếp từ data.severity (null nếu payload không cung cấp) */
  severityFromPayload: AlertSeverity | null;
  /** Loại payload nhận được từ FCM */
  payloadKind: FcmPayloadKind;
  /** Trạng thái ứng dụng khi ghi nhận thông báo */
  receivedState: AppReceiveState;
  /** Thời điểm ứng dụng nhận thông báo (ISO 8601) */
  receivedAt: string;
  /** Thời điểm gửi gốc từ FCM sentTime (ISO 8601 hoặc null) */
  sentAt: string | null;
  /** Đánh dấu đã đọc hay chưa */
  read: boolean;
  /** Toàn bộ dữ liệu key-value trong remoteMessage.data để kiểm tra và mở rộng cho LAB 2, LAB 3 */
  rawData: Record<string, string>;
  /** Trường mở rộng sẵn cho LAB 2 & LAB 3 (chỉ hiển thị nếu payload thực sự có) */
  deviceId?: string | null;
  location?: string | null;
  sensorValue?: string | null;
}

export type PermissionStatusType =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'checking';

export type FirebaseConnectionState =
  | 'initializing'
  | 'connected'
  | 'missing_native_module'
  | 'missing_permission'
  | 'offline'
  | 'error';

export interface FirebaseDiagnostics {
  connectionState: FirebaseConnectionState;
  isNativeModuleAvailable: boolean;
  isPhysicalDevice: boolean;
  appOwnership: string | null;
  permissionStatus: PermissionStatusType;
  fcmToken: string | null;
  tokenUpdatedAt: string | null;
  lastError: string | null;
  isNetworkConnected: boolean;
  foregroundBannerEnabled: boolean;
}
