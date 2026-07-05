import { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "goldOutline"
  | "copyLink";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  shimmer?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  label,
  onPress,
  variant = "primary",
  shimmer = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const shimmerX = useRef(new Animated.Value(-1)).current;
  const showShimmer = shimmer || variant === "copyLink";

  function runShimmer() {
    if (!showShimmer) return;
    shimmerX.setValue(-1);
    Animated.timing(shimmerX, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }

  const loaderColor =
    variant === "primary"
      ? colors.onGold
      : variant === "danger"
        ? colors.danger
        : variant === "goldOutline" || variant === "copyLink"
          ? colors.gold
          : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={runShimmer}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        fullWidth && styles.fullWidth,
        showShimmer && styles.shimmerBase,
        variant === "copyLink" && styles.copyLinkBase,
        pressed && !isDisabled && variantStyles[variant].pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {showShimmer && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            variant === "primary" && styles.shimmerPrimary,
            {
              transform: [
                {
                  translateX: shimmerX.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-180, 180],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator size="small" color={loaderColor} />
        ) : (
          <Text style={[styles.label, variantStyles[variant].label]}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  copyLinkBase: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  shimmerBase: {
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "45%",
    backgroundColor: "rgba(251, 191, 36, 0.22)",
    transform: [{ skewX: "-18deg" }],
  },
  shimmerPrimary: {
    backgroundColor: "rgba(255, 255, 255, 0.38)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 1,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});

const variantStyles: Record<
  Variant,
  {
    container: ViewStyle;
    label: { color: string };
    pressed?: ViewStyle;
  }
> = {
  primary: {
    container: {
      backgroundColor: colors.gold,
      shadowColor: colors.gold,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    label: { color: colors.onGold },
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  },
  secondary: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    label: { color: colors.textPrimary },
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    label: { color: colors.textSecondary },
    pressed: { opacity: 0.85 },
  },
  danger: {
    container: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    label: { color: colors.danger },
    pressed: {
      backgroundColor: "rgba(239, 68, 68, 0.18)",
      transform: [{ scale: 0.99 }],
    },
  },
  goldOutline: {
    container: {
      backgroundColor: colors.goldMuted,
      borderWidth: 1,
      borderColor: colors.goldBorder,
    },
    label: { color: colors.gold },
    pressed: {
      backgroundColor: colors.goldMutedStrong,
      transform: [{ scale: 0.99 }],
    },
  },
  copyLink: {
    container: {
      backgroundColor: colors.goldMuted,
      borderWidth: 1,
      borderColor: colors.goldBorder,
    },
    label: { color: colors.gold },
    pressed: {
      borderColor: colors.gold,
      backgroundColor: colors.goldMutedStrong,
      shadowColor: colors.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 3,
    },
  },
};
