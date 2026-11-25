import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSmartAlert } from '@/hooks/useSmartAlert';
import { NotificationCard } from '@/components/NotificationCard';
import { ALERT_TYPE_CONFIG } from '@/constants/alerts';
import { COLORS, SHADOWS } from '@/constants/theme';
import { AlertType, SmartAlertNotification } from '@/types/notification';

type ReadFilter = 'all' | 'unread';

const ALERT_FILTER_OPTIONS: { key: 'ALL' | AlertType; label: string }[] = [
  { key: 'ALL', label: 'Tất cả loại' },
  { key: 'FIRE', label: 'Báo cháy' },
  { key: 'GAS_LEAK', label: 'Khí Gas' },
  { key: 'HIGH_TEMP', label: 'Nhiệt độ cao' },
  { key: 'LOW_TEMP', label: 'Nhiệt độ thấp' },
  { key: 'INTRUSION', label: 'Người lạ' },
  { key: 'SYSTEM_CHECK', label: 'Kiểm tra HT' },
  { key: 'UNKNOWN', label: 'Khác' },
];

export default function NotificationsListScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    totalCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    reloadHistoryFromStorage,
  } = useSmartAlert();

  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AlertType>('ALL');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const filteredList = useMemo(() => {
    return notifications.filter((item) => {
      if (readFilter === 'unread' && item.read) return false;
      if (typeFilter !== 'ALL' && item.alertType !== typeFilter) return false;
      return true;
    });
  }, [notifications, readFilter, typeFilter]);

  const handleOpenDetail = (item: SmartAlertNotification) => {
    router.push({
      pathname: '/notification/[id]',
      params: { id: item.id },
    });
  };

  const handleConfirmDelete = (id: string) => {
    Alert.alert(
      'Xóa thông báo',
      'Bạn có chắc chắn muốn xóa thông báo này khỏi lịch sử lưu trữ cục bộ?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deleteNotification(id),
        },
      ]
    );
  };

  const handleConfirmClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Xóa toàn bộ lịch sử',
      'Tất cả thông báo lưu trong AsyncStorage sẽ bị xóa. Bạn có muốn tiếp tục?',
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

  const handlePullRefresh = async () => {
    setRefreshing(true);
    await reloadHistoryFromStorage();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Thanh công cụ & Bộ lọc trên cùng */}
      <View style={styles.toolbarContainer}>
        <View style={styles.topActionsRow}>
          <View style={styles.segmentGroup}>
            <TouchableOpacity
              onPress={() => setReadFilter('all')}
              style={[
                styles.segmentButton,
                readFilter === 'all' && styles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  readFilter === 'all' && styles.segmentTextActive,
                ]}
              >
                Tất cả ({totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReadFilter('unread')}
              style={[
                styles.segmentButton,
                readFilter === 'unread' && styles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  readFilter === 'unread' && styles.segmentTextActive,
                ]}
              >
                Chưa đọc ({unreadCount})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bulkButtonsRow}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={markAllAsRead}
                style={styles.bulkReadBtn}
              >
                <MaterialCommunityIcons
                  name="check-all"
                  size={17}
                  color={COLORS.primary}
                />
                <Text style={styles.bulkReadBtnText}>Đọc tất cả</Text>
              </TouchableOpacity>
            )}

            {totalCount > 0 && (
              <TouchableOpacity
                onPress={handleConfirmClearAll}
                style={styles.clearAllBtn}
              >
                <MaterialCommunityIcons
                  name="delete-sweep-outline"
                  size={18}
                  color={COLORS.danger}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Thanh lọc theo loại cảnh báo */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeChipsScroll}
        >
          {ALERT_FILTER_OPTIONS.map((opt) => {
            const isSelected = typeFilter === opt.key;
            const accentColor =
              opt.key === 'ALL'
                ? COLORS.primary
                : ALERT_TYPE_CONFIG[opt.key].accentColor;

            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setTypeFilter(opt.key)}
                style={[
                  styles.typeChip,
                  isSelected && {
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    isSelected && { color: COLORS.textInverse },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Danh sách thông báo */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handlePullRefresh}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={handleOpenDetail}
            onMarkAsRead={markAsRead}
            onDelete={handleConfirmDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="bell-sleep-outline"
                size={42}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {totalCount === 0
                ? 'Chưa có lịch sử thông báo'
                : 'Không có thông báo khớp bộ lọc'}
            </Text>
            <Text style={styles.emptyDesc}>
              {totalCount === 0
                ? 'Khi hệ thống cảm biến phát hiện bất thường, thông báo cảnh báo sẽ tự động hiển thị và lưu trữ tại đây.'
                : 'Hãy chuyển bộ lọc về "Tất cả" để xem toàn bộ lịch sử cảnh báo đã ghi nhận.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  toolbarContainer: {
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.card,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.textInverse,
  },
  bulkButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  bulkReadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  clearAllBtn: {
    padding: 7,
    borderRadius: 10,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  typeChipsScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 14,
    paddingBottom: 30,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  storageNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  storageNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
});
