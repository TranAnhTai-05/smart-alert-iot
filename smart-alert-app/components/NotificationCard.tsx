import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SmartAlertNotification } from '@/types/notification';
import { ALERT_TYPE_CONFIG, SEVERITY_CONFIG } from '@/constants/alerts';
import { COLORS, SHADOWS } from '@/constants/theme';
import { formatDateTimeVN, formatRelativeTimeVN } from '@/utils/formatters';

interface NotificationCardProps {
  item: SmartAlertNotification;
  onPress: (item: SmartAlertNotification) => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  item,
  onPress,
  onMarkAsRead,
  onDelete,
  compact = false,
}) => {
  const typeMeta = ALERT_TYPE_CONFIG[item.alertType] ?? ALERT_TYPE_CONFIG.UNKNOWN;
  const effectiveSeverity =
    item.severityFromPayload ?? typeMeta.defaultVisualSeverity;
  const severityMeta = SEVERITY_CONFIG[effectiveSeverity];

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => onPress(item)}
      style={[
        styles.card,
        {
          borderLeftColor: typeMeta.accentColor,
          backgroundColor: item.read ? COLORS.surface : '#F8FBFF',
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: typeMeta.backgroundColor,
              borderColor: typeMeta.borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={typeMeta.iconName as any}
            size={24}
            color={typeMeta.accentColor}
          />
        </View>

        <View style={styles.headerTextContainer}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: typeMeta.backgroundColor,
                  borderColor: typeMeta.borderColor,
                },
              ]}
            >
              <Text
                style={[styles.typeBadgeText, { color: typeMeta.accentColor }]}
              >
                {typeMeta.shortLabel}
              </Text>
            </View>

            {item.severityFromPayload && (
              <View
                style={[
                  styles.severityBadge,
                  {
                    backgroundColor: severityMeta.bgColor,
                    borderColor: severityMeta.borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.severityBadgeText,
                    { color: severityMeta.color },
                  ]}
                >
                  {item.severityFromPayload.toUpperCase()}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.readBadge,
                item.read ? styles.readBadgeDone : styles.readBadgeUnread,
              ]}
            >
              {!item.read && <View style={styles.unreadDot} />}
              <Text
                style={[
                  styles.readBadgeText,
                  item.read
                    ? styles.readBadgeTextDone
                    : styles.readBadgeTextUnread,
                ]}
              >
                {item.read ? 'Đã đọc' : 'Chưa đọc'}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.title,
              !item.read && styles.titleUnread,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
      </View>

      <Text
        style={styles.body}
        numberOfLines={compact ? 2 : 3}
      >
        {item.body}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.timeWrapper}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={COLORS.textMuted}
          />
          <Text style={styles.timeText}>
            {formatRelativeTimeVN(item.receivedAt)} ({formatDateTimeVN(item.receivedAt)})
          </Text>
        </View>

        {!compact && (
          <View style={styles.actionsRow}>
            {!item.read && onMarkAsRead && (
              <TouchableOpacity
                onPress={() => onMarkAsRead(item.id)}
                style={styles.actionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={styles.actionButtonText}>Đã đọc</Text>
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(item.id)}
                style={[styles.actionButton, styles.deleteActionButton]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={16}
                  color={COLORS.danger}
                />
                <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>
                  Xóa
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 'auto',
  },
  readBadgeUnread: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  readBadgeDone: {
    backgroundColor: COLORS.divider,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 4,
  },
  readBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readBadgeTextUnread: {
    color: COLORS.primary,
  },
  readBadgeTextDone: {
    color: COLORS.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  titleUnread: {
    fontWeight: '800',
    color: '#0B2545',
  },
  body: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 8,
    gap: 8,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  timeText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
  },
  deleteActionButton: {
    backgroundColor: COLORS.dangerSoft,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
