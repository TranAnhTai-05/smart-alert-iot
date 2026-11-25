import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface StatusBadgeProps {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  iconName?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone,
  iconName,
}) => {
  const palette = {
    success: {
      bg: COLORS.successSoft,
      border: COLORS.successBorder,
      text: COLORS.success,
      defaultIcon: 'check-circle',
    },
    warning: {
      bg: COLORS.warningSoft,
      border: COLORS.warningBorder,
      text: COLORS.warning,
      defaultIcon: 'alert-circle',
    },
    danger: {
      bg: COLORS.dangerSoft,
      border: COLORS.dangerBorder,
      text: COLORS.danger,
      defaultIcon: 'close-circle',
    },
    info: {
      bg: COLORS.infoSoft,
      border: COLORS.infoBorder,
      text: COLORS.info,
      defaultIcon: 'information',
    },
  }[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={(iconName ?? palette.defaultIcon) as any}
        size={14}
        color={palette.text}
      />
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
