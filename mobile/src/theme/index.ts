import { tokens } from "@splitsnap/shared";

export const colors = {
  background: tokens.background,
  surface: tokens.surface,
  surfaceElevated: tokens.surfaceElevated,
  border: tokens.border,
  borderStrong: tokens.borderStrong,

  textPrimary: tokens.textPrimary,
  textSecondary: tokens.textSecondary,
  textMuted: tokens.textMuted,

  gold: tokens.gold,
  goldLight: tokens.goldLight,
  goldDark: tokens.goldDark,
  goldMuted: tokens.goldMuted,
  goldMutedStrong: tokens.goldMutedStrong,
  goldBorder: tokens.goldBorder,
  goldTextMuted: tokens.goldTextMuted,

  success: tokens.success,
  successMuted: tokens.successMuted,
  successMutedStrong: tokens.successMutedStrong,
  successBorder: tokens.successBorder,
  successTextMuted: tokens.successTextMuted,

  accent: tokens.gold,
  accentText: tokens.onGold,
  onGold: tokens.onGold,

  danger: tokens.danger,
  dangerBg: tokens.dangerBg,
  dangerBorder: tokens.dangerBorder,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
} as const;

export const typography = {
  kicker: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    fontWeight: "600" as const,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: "700" as const,
    lineHeight: 42,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: "600" as const,
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
} as const;

export const theme = { colors, spacing, radius, fontSize, typography };
export type Theme = typeof theme;
