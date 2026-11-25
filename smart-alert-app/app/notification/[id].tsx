import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSmartAlert } from '@/hooks/useSmartAlert';
import { ALERT_TYPE_CONFIG, SEVERITY_CONFIG } from '@/constants/alerts';
import { COLORS, SHADOWS } from '@/constants/theme';
import { formatDateTimeVN } from '@/utils/formatters';

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { notifications, markAsRead, deleteNotification } = useSmartAlert();

  const item = useMemo(
    () => notifications.find((n) => n.id === id),
    [notifications, id]
  );

  useEffect(() => {
    if (item && !item.read) {
      markAsRead(item.id);
    }
  }, [item, markAsRead]);

  if (!item) {
    return (
      <View style={styles.notFoundContainer}>
        <MaterialCommunityIcons
          name="file-question-outline"
          size={52}
          color={COLORS.textMuted}
        />
        <Text style={styles.notFoundTitle}>Không tìm thấy cảnh báo</Text>
        <Text style={styles.notFoundDesc}>
          Bản ghi cảnh báo này đã được xóa khỏi danh sách.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeMeta = ALERT_TYPE_CONFIG[item.alertType] ?? ALERT_TYPE_CONFIG.UNKNOWN;
  const effectiveSeverity =
    item.severityFromPayload ?? typeMeta.defaultVisualSeverity;
  const severityMeta = SEVERITY_CONFIG[effectiveSeverity];

  const handleDelete = () => {
    Alert.alert(
      'Xóa cảnh báo này?',
      'Cảnh báo sẽ bị xóa khỏi danh sách lưu trữ trên thiết bị.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(item.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Hero Banner Chi tiết cảnh báo */}
      <View
        style={[
          styles.heroCard,
          {
            borderTopColor: typeMeta.accentColor,
          },
        ]}
      >
        <View
          style={[
            styles.largeIconCircle,
            {
              backgroundColor: typeMeta.backgroundColor,
              borderColor: typeMeta.borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={typeMeta.iconName as any}
            size={40}
            color={typeMeta.accentColor}
          />
        </View>

        <View
          style={[
            styles.typePill,
            {
              backgroundColor: typeMeta.backgroundColor,
              borderColor: typeMeta.borderColor,
            },
          ]}
        >
          <Text style={[styles.typePillText, { color: typeMeta.accentColor }]}>
            {typeMeta.label}
          </Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>

        <View style={styles.bodyBox}>
          <Text style={styles.bodyLabel}>NỘI DUNG CẢNH BÁO:</Text>
          <Text style={styles.bodyText}>{item.body}</Text>
        </View>
      </View>

      {/* Thông tin chi tiết sự kiện gọn gàng, chuyên nghiệp */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.sectionTitle}>Thông tin sự cố</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thời gian ghi nhận:</Text>
          <Text style={styles.infoValue}>
            {formatDateTimeVN(item.receivedAt)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Hạng mục cảnh báo:</Text>
          <Text style={[styles.infoValue, { color: typeMeta.accentColor }]}>
            {typeMeta.label}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mức độ cảnh báo:</Text>
          <View
            style={[
              styles.severityTag,
              {
                backgroundColor: severityMeta.bgColor,
                borderColor: severityMeta.borderColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={severityMeta.icon as any}
              size={14}
              color={severityMeta.color}
            />
            <Text
              style={[styles.severityTagText, { color: severityMeta.color }]}
            >
              {severityMeta.label}
            </Text>
          </View>
        </View>

        {item.sensorValue && item.sensorValue !== 'N/A' && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thông số đo từ cảm biến:</Text>
            <Text style={styles.infoValueMono}>{item.sensorValue}</Text>
          </View>
        )}

        {item.location && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Khu vực giám sát:</Text>
            <Text style={styles.infoValue}>{item.location}</Text>
          </View>
        )}

        {item.deviceId && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thiết bị phát hiện:</Text>
            <Text style={styles.infoValueMono}>{item.deviceId}</Text>
          </View>
        )}

        {item.eventId && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã sự kiện:</Text>
            <Text style={styles.infoValueMono}>{item.eventId}</Text>
          </View>
        )}
      </View>

      {/* Nút xóa thông báo */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={20}
          color={COLORS.danger}
        />
        <Text style={styles.deleteButtonText}>Xóa cảnh báo này</Text>
      </TouchableOpacity>
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
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  notFoundDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  largeIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  typePillText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 14,
  },
  bodyBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bodyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  bodyText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
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
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoValueMono: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: 'monospace',
  },
  severityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  severityTagText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
