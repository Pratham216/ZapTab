import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GradientGoldText from "./GradientGoldText";
import { colors, fontSize, spacing } from "../theme";
import { emeraldGlowShadow, successGlowShadow } from "../lib/platformStyles";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  goldTitle?: boolean;
  onAction?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  actionTone?: "emerald" | "success";
  right?: ReactNode;
}

export default function MobileHeader({
  title,
  subtitle,
  goldTitle = false,
  onAction,
  actionIcon = "add",
  actionLabel,
  actionTone = "success",
  right,
}: MobileHeaderProps) {
  const actionStyles =
    actionTone === "emerald" ? styles.actionEmerald : styles.actionSuccess;

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        {goldTitle ? (
          <GradientGoldText size="title">{title}</GradientGoldText>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ??
        (onAction ? (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [
              styles.actionBtn,
              actionStyles,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={actionLabel ?? "Action"}
          >
            <Ionicons
              name={actionIcon}
              size={22}
              color={actionTone === "emerald" ? "#fff" : colors.onGold}
            />
          </Pressable>
        ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSuccess: {
    backgroundColor: colors.success,
    ...successGlowShadow(),
  },
  actionEmerald: {
    backgroundColor: "#10B981",
    ...emeraldGlowShadow(),
  },
  actionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
