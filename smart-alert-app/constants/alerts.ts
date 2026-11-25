import { AlertSeverity, AlertType } from '@/types/notification';
import { COLORS } from './theme';

export interface AlertTypeMetadata {
  type: AlertType;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string; // MaterialCommunityIcons name
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  defaultVisualSeverity: AlertSeverity;
  sampleDataTypeKey: string;
}

export const ALERT_TYPE_CONFIG: Record<AlertType, AlertTypeMetadata> = {
  HIGH_TEMP: {
    type: 'HIGH_TEMP',
    label: 'Cảnh báo nhiệt độ cao',
    shortLabel: 'Nhiệt độ cao',
    description: 'Nhiệt độ khu vực vượt ngưỡng an toàn cài đặt.',
    iconName: 'thermometer-alert',
    accentColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    defaultVisualSeverity: 'warning',
    sampleDataTypeKey: 'HIGH_TEMP',
  },
  LOW_TEMP: {
    type: 'LOW_TEMP',
    label: 'Cảnh báo nhiệt độ thấp',
    shortLabel: 'Nhiệt độ thấp',
    description: 'Nhiệt độ môi trường xuống thấp hơn ngưỡng cho phép.',
    iconName: 'snowflake-alert',
    accentColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    defaultVisualSeverity: 'info',
    sampleDataTypeKey: 'LOW_TEMP',
  },
  INTRUSION: {
    type: 'INTRUSION',
    label: 'Cảnh báo phát hiện người lạ',
    shortLabel: 'Người lạ xâm nhập',
    description: 'Phát hiện chuyển động hoặc xâm nhập trái phép.',
    iconName: 'shield-alert-outline',
    accentColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    defaultVisualSeverity: 'critical',
    sampleDataTypeKey: 'INTRUSION',
  },
  FIRE: {
    type: 'FIRE',
    label: 'Cảnh báo cháy',
    shortLabel: 'Báo cháy',
    description: 'Cảnh báo khẩn cấp phát hiện lửa hoặc khói dày đặc.',
    iconName: 'fire-alert',
    accentColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    defaultVisualSeverity: 'critical',
    sampleDataTypeKey: 'FIRE',
  },
  GAS_LEAK: {
    type: 'GAS_LEAK',
    label: 'Cảnh báo rò rỉ khí gas',
    shortLabel: 'Rò rỉ khí Gas',
    description: 'Nồng độ khí dễ cháy/khí gas vượt mức an toàn.',
    iconName: 'gas-cylinder',
    accentColor: '#D97706',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    defaultVisualSeverity: 'critical',
    sampleDataTypeKey: 'GAS_LEAK',
  },
  SYSTEM_CHECK: {
    type: 'SYSTEM_CHECK',
    label: 'Thông báo kiểm tra hệ thống',
    shortLabel: 'Kiểm tra hệ thống',
    description: 'Bản tin kiểm tra kết nối từ Firebase Cloud Messaging.',
    iconName: 'check-decagram-outline',
    accentColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
    defaultVisualSeverity: 'info',
    sampleDataTypeKey: 'SYSTEM_CHECK',
  },
  UNKNOWN: {
    type: 'UNKNOWN',
    label: 'Thông báo chung từ Firebase',
    shortLabel: 'Thông báo FCM',
    description: 'Thông báo đẩy nhận trực tiếp từ Firebase Cloud Messaging.',
    iconName: 'bell-ring-outline',
    accentColor: COLORS.primaryDark,
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    defaultVisualSeverity: 'info',
    sampleDataTypeKey: 'UNKNOWN',
  },
};

export const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
  }
> = {
  critical: {
    label: 'Nguy hiểm cao (Critical)',
    color: COLORS.danger,
    bgColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
    icon: 'alert-octagon',
  },
  warning: {
    label: 'Cảnh báo (Warning)',
    color: COLORS.warning,
    bgColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    icon: 'alert',
  },
  info: {
    label: 'Thông tin / Kiểm tra (Info)',
    color: COLORS.primary,
    bgColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
    icon: 'information-outline',
  },
};

/**
 * Danh sách gợi ý cấu hình Custom Data trên Firebase Console khi demo cho giảng viên
 */
export const FIREBASE_CONSOLE_TEST_TEMPLATES = [
  {
    title: 'Cảnh báo cháy khẩn cấp!',
    body: 'Phát hiện khói và nhiệt tăng đột ngột tại Phòng Lab IoT A204.',
    data: {
      type: 'FIRE',
      severity: 'critical',
      eventId: 'EVT-FIRE-001',
      location: 'Phòng Lab IoT A204',
    },
  },
  {
    title: 'Cảnh báo rò rỉ khí Gas',
    body: 'Nồng độ khí LPG vượt ngưỡng cảnh báo tại khu vực kho.',
    data: {
      type: 'GAS_LEAK',
      severity: 'critical',
      eventId: 'EVT-GAS-002',
      location: 'Kho thiết bị tầng 1',
    },
  },
  {
    title: 'Cảnh báo nhiệt độ cao',
    body: 'Nhiệt độ tủ server hiện tại vượt ngưỡng cài đặt.',
    data: {
      type: 'HIGH_TEMP',
      severity: 'warning',
      eventId: 'EVT-TEMP-003',
    },
  },
  {
    title: 'Cảnh báo nhiệt độ thấp',
    body: 'Nhiệt độ phòng bảo quản xuống dưới mức tiêu chuẩn.',
    data: {
      type: 'LOW_TEMP',
      severity: 'info',
      eventId: 'EVT-LOWTEMP-004',
    },
  },
  {
    title: 'Cảnh báo phát hiện người lạ',
    body: 'Cảm biến chuyển động ghi nhận xâm nhập ngoài giờ hành chính.',
    data: {
      type: 'INTRUSION',
      severity: 'critical',
      eventId: 'EVT-SEC-005',
    },
  },
  {
    title: 'Thông báo kiểm tra hệ thống',
    body: 'Kiểm tra kết nối Firebase Cloud Messaging (LAB 1) hoạt động ổn định.',
    data: {
      type: 'SYSTEM_CHECK',
      severity: 'info',
      eventId: 'EVT-SYS-006',
    },
  },
];
