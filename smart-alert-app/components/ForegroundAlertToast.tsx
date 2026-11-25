import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSmartAlert } from '@/hooks/useSmartAlert';
import { ALERT_TYPE_CONFIG } from '@/constants/alerts';
import { COLORS, SHADOWS } from '@/constants/theme';

export const ForegroundAlertToast: React.FC = () => {
  const router = useRouter();
  const { latestAlertBanner, dismissLatestAlertBanner, markAsRead } =
    useSmartAlert();

  if (!latestAlertBanner) return null;

  const meta =
    ALERT_TYPE_CONFIG[latestAlertBanner.alertType] ?? ALERT_TYPE_CONFIG.UNKNOWN;

  const handleOpenDetail = async () => {
    const id = latestAlertBanner.id;
    dismissLatestAlertBanner();
    await markAsRead(id);
    router.push({
      pathname: '/notification/[id]',
      params: { id },
    });
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleOpenDetail}
        style={[
          styles.banner,
          {
            borderLeftColor: meta.accentColor,
          },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            { backgroundColor: meta.backgroundColor },
          ]}
        >
          <MaterialCommunityIcons
            name={meta.iconName as any}
            size={24}
            color={meta.accentColor}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.labelRow}>
            <Text style={[styles.liveBadge, { color: meta.accentColor }]}>
              ● CẢNH BÁO AN TOÀN MỚI
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {latestAlertBanner.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {latestAlertBanner.body}
          </Text>
        </View>

        <TouchableOpacity
          onPress={dismissLatestAlertBanner}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    ...SHADOWS.elevated,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  liveBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});
