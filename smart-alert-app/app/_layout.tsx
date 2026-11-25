import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SmartAlertProvider } from '@/hooks/useSmartAlert';
import { registerTopLevelBackgroundHandler } from '@/services/firebaseMessagingService';
import { ForegroundAlertToast } from '@/components/ForegroundAlertToast';
import { COLORS } from '@/constants/theme';

// Đăng ký Background Message Handler ở top-level cho Firebase Cloud Messaging
registerTopLevelBackgroundHandler();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SmartAlertProvider>
        <StatusBar style="light" />
        <View style={styles.root}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.primaryDark,
              },
              headerTintColor: COLORS.textInverse,
              headerTitleStyle: {
                fontWeight: '700',
                fontSize: 17,
              },
              contentStyle: {
                backgroundColor: COLORS.background,
              },
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="notification/[id]"
              options={{
                title: 'Chi tiết thông báo',
                headerBackTitle: 'Quay lại',
              }}
            />
          </Stack>
          <View style={styles.toastOverlay} pointerEvents="box-none">
            <ForegroundAlertToast />
          </View>
        </View>
      </SmartAlertProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  toastOverlay: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 999,
  },
});
