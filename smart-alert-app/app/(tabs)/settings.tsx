import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSmartAlert } from '@/hooks/useSmartAlert';
import { StatusBadge } from '@/components/StatusBadge';
import { COLORS, SHADOWS } from '@/constants/theme';

export default function SettingsScreen() {
  const {
    totalCount,
    unreadCount,
    connectionState,
    permissionStatus,
    fcmToken,
    isNetworkConnected,
    foregroundBannerEnabled,
    notificationsEnabled,
    realtimeConfig,
    isWokwiFirebaseConnected,
    updateRealtimeConfig,
    requestPermissionAndInit,
    openSystemNotificationSettings,
    toggleForegroundBanner,
    toggleNotificationsEnabled,
    markAllAsRead,
    clearAllNotifications,
  } = useSmartAlert();

  const [highTempThreshold, setHighTempThreshold] = useState<string>(
    String(realtimeConfig.highTempThreshold)
  );
  const [lowTempThreshold, setLowTempThreshold] = useState<string>(
    String(realtimeConfig.lowTempThreshold)
  );
  const [gasThreshold, setGasThreshold] = useState<string>(
    String(realtimeConfig.gasThreshold)
  );
  const [databaseURL, setDatabaseURL] = useState<string>(
    realtimeConfig.databaseURL
  );
  const [watchPath, setWatchPath] = useState<string>(realtimeConfig.watchPath);
  const [isSavingThresholds, setIsSavingThresholds] = useState<boolean>(false);
  const [showAdvancedTech, setShowAdvancedTech] = useState<boolean>(false);

  useEffect(() => {
    setHighTempThreshold(String(realtimeConfig.highTempThreshold));
    setLowTempThreshold(String(realtimeConfig.lowTempThreshold));
    setGasThreshold(String(realtimeConfig.gasThreshold));
    setDatabaseURL(realtimeConfig.databaseURL);
    setWatchPath(realtimeConfig.watchPath);
  }, [realtimeConfig]);

  const handleSaveThresholds = async () => {
    setIsSavingThresholds(true);
    try {
      await updateRealtimeConfig({
        ...realtimeConfig,
        databaseURL: databaseURL.trim() || realtimeConfig.databaseURL,
        watchPath: watchPath.trim() || '/alerts',
        highTempThreshold: Number(highTempThreshold) || 38,
        lowTempThreshold: Number(lowTempThreshold) || 12,
        gasThreshold: Number(gasThreshold) || 600,
      });
      Alert.alert(
        'Đã lưu cài đặt',
        'Các ngưỡng cảnh báo cảm biến đã được cập nhật thành công.'
      );
    } finally {
      setIsSavingThresholds(false);
    }
  };

  const handleConfirmClearAll = () => {
    if (totalCount === 0) {
      Alert.alert('Thông báo', 'Lịch sử cảnh báo hiện đang trống.');
      return;
    }
    Alert.alert(
      'Xóa lịch sử cảnh báo',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử cảnh báo đã lưu trên thiết bị?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: () => clearAllNotifications(),
        },
      ]
    );
  };

  const handleCopyToken = async () => {
    if (!fcmToken) return;
    await Clipboard.setStringAsync(fcmToken);
    Alert.alert('Đã sao chép', 'Đã sao chép mã định danh thiết bị.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. ĐIỀU KHIỂN THÔNG BÁO & CẢNH BÁO */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="bell-cog-outline"
            size={22}
            color={COLORS.primary}
          />
          <Text style={styles.sectionTitle}>Chế độ thông báo cảnh báo</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>Nhận thông báo cảnh báo</Text>
            <Text style={styles.switchDesc}>
              {notificationsEnabled
                ? 'Đang bật: Ứng dụng sẽ nhận và báo động ngay khi cảm biến phát hiện sự cố.'
                : 'Đang tắt: Đã tạm dừng nhận toàn bộ thông báo cảnh báo mới.'}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotificationsEnabled}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={notificationsEnabled ? COLORS.primary : '#94A3B8'}
          />
        </View>

        <View style={styles.divider} />

        <View
          style={[
            styles.switchRow,
            !notificationsEnabled && { opacity: 0.45 },
          ]}
        >
          <View style={styles.switchTextCol}>
            <Text style={styles.switchTitle}>
              Hiển thị Banner & Chuông báo khẩn cấp
            </Text>
            <Text style={styles.switchDesc}>
              Phát âm thanh cảnh báo và bung thông báo nổi trên màn hình khi có
              sự cố mới.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled && foregroundBannerEnabled}
            disabled={!notificationsEnabled}
            onValueChange={toggleForegroundBanner}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={
              notificationsEnabled && foregroundBannerEnabled
                ? COLORS.primary
                : '#94A3B8'
            }
          />
        </View>
      </View>

      {/* 2. NGƯỠNG CẢNH BÁO AN TOÀN CỦA CẢM BIẾN (ĐỒNG BỘ TRỰC TIẾP VỚI WOKWI) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="tune-vertical"
            size={22}
            color={COLORS.primary}
          />
          <Text style={styles.sectionTitle}>Thiết lập ngưỡng an toàn</Text>
        </View>

        <Text style={styles.helperText}>
          Khi bạn thay đổi và nhấn Lưu, ngưỡng mới sẽ tự động đồng bộ xuống mạch
          cảm biến Wokwi:
        </Text>

        <View style={styles.thresholdGrid}>
          <View style={styles.thresholdItem}>
            <Text style={styles.inputLabel}>Nhiệt độ cao (°C)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={highTempThreshold}
              onChangeText={setHighTempThreshold}
            />
          </View>

          <View style={styles.thresholdItem}>
            <Text style={styles.inputLabel}>Nhiệt độ thấp (°C)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={lowTempThreshold}
              onChangeText={setLowTempThreshold}
            />
          </View>

          <View style={styles.thresholdItem}>
            <Text style={styles.inputLabel}>Khí Gas (ppm)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={gasThreshold}
              onChangeText={setGasThreshold}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn, { marginTop: 12 }]}
          onPress={handleSaveThresholds}
          disabled={isSavingThresholds}
        >
          {isSavingThresholds ? (
            <ActivityIndicator size="small" color={COLORS.textInverse} />
          ) : (
            <MaterialCommunityIcons
              name="content-save-check-outline"
              size={18}
              color={COLORS.textInverse}
            />
          )}
          <Text style={styles.primaryBtnText}>Lưu thiết lập ngưỡng an toàn</Text>
        </TouchableOpacity>
      </View>

      {/* 3. QUẢN LÝ DỮ LIỆU & QUYỀN THIẾT BỊ */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="shield-account-outline"
            size={22}
            color={COLORS.primary}
          />
          <Text style={styles.sectionTitle}>Trạng thái & Dữ liệu thiết bị</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kết nối máy chủ đám mây:</Text>
          {connectionState === 'connected' || isWokwiFirebaseConnected ? (
            <StatusBadge
              label="Đã kết nối"
              tone="success"
              iconName="cloud-check"
            />
          ) : (
            <StatusBadge
              label="Đang kiểm tra"
              tone="warning"
              iconName="cloud-sync"
            />
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kết nối mạng Internet:</Text>
          {isNetworkConnected ? (
            <StatusBadge label="Trực tuyến" tone="success" iconName="wifi" />
          ) : (
            <StatusBadge
              label="Ngoại tuyến"
              tone="warning"
              iconName="wifi-off"
            />
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Quyền thông báo điện thoại:</Text>
          {permissionStatus === 'granted' ? (
            <StatusBadge
              label="Đã cho phép"
              tone="success"
              iconName="check-circle"
            />
          ) : (
            <TouchableOpacity onPress={requestPermissionAndInit}>
              <StatusBadge
                label="Chạm để cấp quyền"
                tone="warning"
                iconName="bell-alert"
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.buttonGroupRow}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={markAllAsRead}
            >
              <MaterialCommunityIcons
                name="check-all"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.secondaryBtnText}>
                Đánh dấu đã xem ({unreadCount})
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={openSystemNotificationSettings}
          >
            <MaterialCommunityIcons
              name="cellphone-cog"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.secondaryBtnText}>Cài đặt điện thoại</Text>
          </TouchableOpacity>

          {totalCount > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={handleConfirmClearAll}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={18}
                color={COLORS.danger}
              />
              <Text style={styles.dangerBtnText}>
                Xóa lịch sử ({totalCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. NÚT ẨN/HIỆN THÔNG SỐ KỸ THUẬT NÂNG CAO (Mặc định đóng gọn gàng) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowAdvancedTech((prev) => !prev)}
        style={styles.advancedToggleBtn}
      >
        <MaterialCommunityIcons
          name={showAdvancedTech ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textMuted}
        />
        <Text style={styles.advancedToggleText}>
          {showAdvancedTech
            ? 'Ẩn cấu hình kết nối máy chủ nâng cao'
            : 'Cấu hình kết nối máy chủ nâng cao'}
        </Text>
      </TouchableOpacity>

      {showAdvancedTech && (
        <View style={styles.advancedCard}>
          <Text style={styles.inputLabel}>Máy chủ dữ liệu (Cloud URL):</Text>
          <TextInput
            style={styles.textInputMono}
            value={databaseURL}
            onChangeText={setDatabaseURL}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.inputLabel, { marginTop: 8 }]}>
            Kênh nhận sự kiện (Node Path):
          </Text>
          <TextInput
            style={styles.textInputMono}
            value={watchPath}
            onChangeText={setWatchPath}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {fcmToken && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn, { marginTop: 10 }]}
              onPress={handleCopyToken}
            >
              <MaterialCommunityIcons
                name="content-copy"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.secondaryBtnText}>
                Sao chép mã định danh FCM
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn, { marginTop: 10 }]}
            onPress={handleSaveThresholds}
          >
            <Text style={styles.primaryBtnText}>Cập nhật kết nối máy chủ</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchTextCol: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  switchDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 14,
  },
  helperText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  thresholdGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  thresholdItem: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  textInputMono: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 8,
  },
  infoLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  buttonGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexGrow: 1,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  secondaryBtn: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  dangerBtn: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  advancedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  advancedToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  advancedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
});
