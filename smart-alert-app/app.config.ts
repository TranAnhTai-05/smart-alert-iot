import { ExpoConfig, ConfigContext } from 'expo/config';
import * as fs from 'fs';
import * as path from 'path';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesPath = path.resolve(__dirname, 'google-services.json');
  const hasGoogleServices = fs.existsSync(googleServicesPath);

  if (!hasGoogleServices) {
    console.warn(
      '⚠️ [Smart Alert] Chưa tìm thấy file google-services.json tại thư mục gốc smart-alert-app/. ' +
        'Hãy tải file google-services.json từ Firebase Console (package: com.smartalert.app) và đặt vào thư mục gốc trước khi chạy prebuild hoặc EAS Build.'
    );
  }

  return {
    ...config,
    name: 'Smart Alert',
    slug: 'smart-alert-app',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'smartalert',
    userInterfaceStyle: 'light',
    android: {
      package: 'com.smartalert.app',
      googleServicesFile: hasGoogleServices ? './google-services.json' : undefined,
      adaptiveIcon: {
        backgroundColor: '#0F4C81',
      },
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
      ],
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.smartalert.app',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          resizeMode: 'contain',
          backgroundColor: '#0F4C81',
        },
      ],
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      [
        'expo-notifications',
        {
          color: '#1D4ED8',
          defaultChannel: 'smart_alert_high_importance',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      labPhase: 'LAB_1_FIREBASE_FCM',
      futureApiBaseUrlPlaceholder: 'https://your-lab2-nodejs-api.example.com/api/v1',
    },
  };
};
