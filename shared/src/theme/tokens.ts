/** SplitSnap design tokens — black, white, gray, gold */
export const tokens = {
  background: "#0a0a0a",
  surface: "#171717",
  surfaceElevated: "#262626",

  border: "#262626",
  borderStrong: "#404040",

  textPrimary: "#fafafa",
  textSecondary: "#a3a3a3",
  textMuted: "#737373",

  gold: "#fbbf24",
  goldLight: "#fcd34d",
  goldDark: "#f59e0b",
  onGold: "#0a0a0a",

  goldMuted: "rgba(251, 191, 36, 0.12)",
  goldMutedStrong: "rgba(251, 191, 36, 0.2)",
  goldBorder: "rgba(251, 191, 36, 0.25)",
  goldTextMuted: "rgba(251, 191, 36, 0.75)",

  /** Success states: paid, connected, selected items */
  success: "#4ade80",
  successMuted: "rgba(74, 222, 128, 0.12)",
  successMutedStrong: "rgba(74, 222, 128, 0.2)",
  successBorder: "rgba(74, 222, 128, 0.25)",
  successTextMuted: "rgba(74, 222, 128, 0.75)",

  danger: "#fca5a5",
  dangerBg: "rgba(239, 68, 68, 0.1)",
  dangerBorder: "rgba(239, 68, 68, 0.3)",
} as const;

export type ThemeTokens = typeof tokens;
