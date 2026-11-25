/**
 * Bảng màu & Hệ thống Typography chuẩn hiện đại (Nền sáng, xanh dương chủ đạo)
 */

export const COLORS = {
  // Primary Blue Palette
  primaryDark: '#0F4C81',
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  primarySoft: '#EFF6FF',
  primaryBorder: '#BFDBFE',

  // Backgrounds & Surfaces
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Semantic / Status Colors
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',

  warning: '#D97706',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',

  success: '#16A34A',
  successSoft: '#F0FDF4',
  successBorder: '#BBF7D0',

  info: '#0284C7',
  infoSoft: '#F0F9FF',
  infoBorder: '#BAE6FD',

  purple: '#7C3AED',
  purpleSoft: '#F5F3FF',
  purpleBorder: '#DDD6FE',

  // Borders & Dividers
  border: '#E2E8F0',
  divider: '#F1F5F9',
};

export const SHADOWS = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
};
