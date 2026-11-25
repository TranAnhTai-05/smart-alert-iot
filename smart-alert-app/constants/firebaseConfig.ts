/**
 * Cấu hình kết nối Firebase JavaScript SDK (Dùng cho Expo Go, Web và liên kết thời gian thực với Wokwi IoT)
 * Bạn có thể điền trực tiếp thông số Firebase Project của bạn tại đây,
 * HOẶC nhập trực tiếp ngay trên màn hình "Cài đặt Firebase" bên trong ứng dụng!
 */

export interface FirebaseRealtimeConfig {
  apiKey: string;
  projectId: string;
  databaseURL: string;
  appId?: string;
  messagingSenderId?: string;
  /**
   * Đường dẫn node trên Firebase Realtime Database mà mạch Wokwi / Firebase gửi cảnh báo vào.
   * Ví dụ: "/alerts" hoặc "/wokwi" hoặc "/sensor" hoặc "/"
   */
  watchPath: string;
  /**
   * Ngưỡng nhiệt độ cao (°C) nếu Wokwi gửi trực tiếp giá trị cảm biến { temperature / nhietDo }
   */
  highTempThreshold: number;
  /**
   * Ngưỡng nhiệt độ thấp (°C) nếu Wokwi gửi trực tiếp giá trị cảm biến { temperature / nhietDo }
   */
  lowTempThreshold: number;
  /**
   * Ngưỡng khí Gas (ppm / analog) nếu Wokwi gửi trực tiếp { gas / khiGas / mq2 }
   */
  gasThreshold: number;
}

export const DEFAULT_FIREBASE_REALTIME_CONFIG: FirebaseRealtimeConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'realtimewokwi',
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ??
    'https://realtimewokwi-default-rtdb.asia-southeast1.firebasedatabase.app',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  watchPath: process.env.EXPO_PUBLIC_FIREBASE_WATCH_PATH ?? '/alerts',
  highTempThreshold: 38,
  lowTempThreshold: 12,
  gasThreshold: 600,
};
