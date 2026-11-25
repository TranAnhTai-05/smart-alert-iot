import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSmartAlert } from '@/hooks/useSmartAlert';
import { NotificationCard } from '@/components/NotificationCard';
import { StatusBadge } from '@/components/StatusBadge';
import { ALERT_TYPE_CONFIG } from '@/constants/alerts';
import { COLORS, SHADOWS } from '@/constants/theme';
import { SmartAlertNotification } from '@/types/notification';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    notifications,
    totalCount,
    unreadCount,
    connectionState,
    isNetworkConnected,
    isRefreshingToken,
    notificationsEnabled,
    toggleNotificationsEnabled,
    refreshFcmToken,
    reloadHistoryFromStorage,
    markAsRead,
  } = useSmartAlert();

  const recentNotifications = notifications.slice(0, 5);

  const handleRefresh = async () => {
    await Promise.all([reloadHistoryFromStorage(), refreshFcmToken()]);
  };

  const handleOpenNotification = (item: SmartAlertNotification) => {
    router.push({
      pathname: '/notification/[id]',
      params: { id: item.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingToken}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header Hero — Giao diện sản phẩm hoàn chỉnh */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name={notificationsEnabled ? 'shield-check' : 'shield-off'}
                size={32}
                color={COLORS.textInverse}
              />
            </View>
            <View style={styles.heroTitleBox}>
              <Text style={styles.appTitle}>Smart Alert</Text>
              <Text style={styles.appSubtitle}>
                Hệ thống giám sát & cảnh báo an toàn thông minh
              </Text>
            </View>
            <View
              style={[
                styles.livePill,
                !notificationsEnabled && styles.livePillPaused,
              ]}
            >
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: notificationsEnabled
                      ? '#4ADE80'
                      : '#FBBF24',
                  },
                ]}
              />
              <Text style={styles.livePillText}>
                {notificationsEnabled ? 'ĐANG BẢO VỆ' : 'TẠM TẮT'}
              </Text>
            </View>
          </View>

          {/* Thanh gạt Bật/Tắt nhanh nhận thông báo ngay trên Trang chủ */}
          <View style={styles.masterSwitchCard}>
            <View style={styles.masterSwitchLeft}>
              <MaterialCommunityIcons
                name={
                  notificationsEnabled
                    ? 'bell-ring-outline'
                    : 'bell-sleep-outline'
                }
                size={22}
                color={
                  notificationsEnabled ? COLORS.primary : COLORS.textMuted
                }
              />
              <View style={styles.masterSwitchTextBox}>
                <Text style={styles.masterSwitchTitle}>
                  {notificationsEnabled
                    ? 'Đang bật nhận thông báo cảnh báo'
                    : 'Đã tắt nhận thông báo cảnh báo'}
                </Text>
                <Text style={styles.masterSwitchDesc}>
                  {notificationsEnabled
                    ? 'Tự động phát cảnh báo khi cảm biến phát hiện sự cố'
                    : 'Ứng dụng đang tạm dừng nhận mọi cảnh báo mới'}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotificationsEnabled}
              trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
              thumbColor={notificationsEnabled ? COLORS.primary : '#94A3B8'}
            />
          </View>
        </View>

        {/* Cảnh báo nếu mất mạng */}
        {!isNetworkConnected && (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons
              name="wifi-off"
              size={22}
              color={COLORS.warning}
            />
            <View style={styles.bannerTextCol}>
              <Text style={styles.offlineTitle}>
                Thiết bị đang mất kết nối Internet
              </Text>
              <Text style={styles.offlineDesc}>
                Vui lòng kiểm tra kết nối Wi-Fi/4G để nhận cảnh báo thời gian
                thực từ hệ thống cảm biến.
              </Text>
            </View>
          </View>
        )}

        {/* Thống kê cảnh báo */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/notifications')}
            style={[styles.statCard, styles.statCardTotal]}
          >
            <View style={styles.statIconCircleBlue}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Tổng cảnh báo ghi nhận</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/notifications')}
            style={[styles.statCard, styles.statCardUnread]}
          >
            <View style={styles.statIconCircleRed}>
              <MaterialCommunityIcons
                name="bell-badge"
                size={24}
                color={COLORS.danger}
              />
            </View>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>
              {unreadCount}
            </Text>
            <Text style={styles.statLabel}>Cảnh báo chưa xem</Text>
          </TouchableOpacity>
        </View>

        {/* Trạng thái hệ thống gọn gàng, chỉn chu */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <MaterialCommunityIcons
                name="radar"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Trạng thái giám sát</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/settings')}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>Tuỳ chỉnh</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.statusRowItem}>
            <Text style={styles.statusLabel}>Kết nối trung tâm cảm biến:</Text>
            {connectionState === 'connected' && isNetworkConnected ? (
              <StatusBadge
                label="Hoạt động ổn định"
                tone="success"
                iconName="check-decagram"
              />
            ) : !isNetworkConnected ? (
              <StatusBadge
                label="Mất kết nối mạng"
                tone="warning"
                iconName="wifi-off"
              />
            ) : (
              <StatusBadge
                label="Đang đồng bộ..."
                tone="info"
                iconName="sync"
              />
            )}
          </View>

          <View style={styles.statusRowItem}>
            <Text style={styles.statusLabel}>Chế độ thông báo đẩy:</Text>
            {notificationsEnabled ? (
              <StatusBadge
                label="Đang kích hoạt"
                tone="success"
                iconName="bell-check"
              />
            ) : (
              <StatusBadge
                label="Đang tạm tắt"
                tone="warning"
                iconName="bell-off-outline"
              />
            )}
          </View>

          {/* Danh mục 6 nhóm cảm biến an toàn */}
          <Text style={styles.sensorGroupLabel}>
            Các hạng mục an toàn đang giám sát:
          </Text>
          <View style={styles.alertTypesGrid}>
            {(
              [
                'FIRE',
                'GAS_LEAK',
                'HIGH_TEMP',
                'LOW_TEMP',
                'INTRUSION',
                'SYSTEM_CHECK',
              ] as const
            ).map((typeKey) => {
              const cfg = ALERT_TYPE_CONFIG[typeKey];
              return (
                <View
                  key={typeKey}
                  style={[
                    styles.alertTypeChip,
                    {
                      backgroundColor: cfg.backgroundColor,
                      borderColor: cfg.borderColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={cfg.iconName as any}
                    size={15}
                    color={cfg.accentColor}
                  />
                  <Text
                    style={[
                      styles.alertTypeChipText,
                      { color: cfg.accentColor },
                    ]}
                  >
                    {cfg.shortLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Cảnh báo gần đây */}
        <View style={styles.recentHeaderRow}>
          <Text style={styles.recentSectionTitle}>Cảnh báo mới nhất</Text>
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/notifications')}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>
                Xem tất cả ({totalCount})
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={16}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {recentNotifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={40}
                color={COLORS.success}
              />
            </View>
            <Text style={styles.emptyTitle}>Khu vực đang an toàn</Text>
            <Text style={styles.emptySubtitle}>
              Hiện chưa có sự cố nào được ghi nhận. Khi hệ thống cảm biến phát
              hiện bất thường, cảnh báo khẩn cấp sẽ hiển thị ngay tại đây.
            </Text>
          </View>
        ) : (
          recentNotifications.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              compact
              onPress={handleOpenNotification}
              onMarkAsRead={markAsRead}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.elevated,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroTitleBox: {
    flex: 1,
  },
  appTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textInverse,
    letterSpacing: 0.2,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#BFDBFE',
    fontWeight: '500',
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 163, 74, 0.25)',
    borderColor: 'rgba(74, 222, 128, 0.45)',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePillPaused: {
    backgroundColor: 'rgba(217, 119, 6, 0.28)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  livePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.textInverse,
  },
  masterSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  masterSwitchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  masterSwitchTextBox: {
    flex: 1,
  },
  masterSwitchTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  masterSwitchDesc: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  bannerTextCol: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 2,
  },
  offlineDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  statCardTotal: {
    borderColor: COLORS.primaryBorder,
  },
  statCardUnread: {
    borderColor: COLORS.dangerBorder,
  },
  statIconCircleBlue: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconCircleRed: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 8,
  },
  statusLabel: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sensorGroupLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
  },
  alertTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertTypeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recentSectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
