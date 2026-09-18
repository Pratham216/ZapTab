import { useEffect, useId, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { colors, fontSize, radius, spacing } from "../theme";
import { goldGlowShadow, noPointer } from "../lib/platformStyles";

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
  shimmer = true,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const showShimmer = shimmer !== false;
  const rawId = useId();
  const gradientId = `btn-shimmer-${rawId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const [buttonWidth, setButtonWidth] = useState(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [shimmering, setShimmering] = useState(false);
  const isMounted = useRef(true);
  const shimmerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (shimmerTimeoutRef.current) {
        clearTimeout(shimmerTimeoutRef.current);
      }
    };
  }, []);

  function runShimmer() {
    if (!showShimmer || isDisabled) return;

    if (shimmerTimeoutRef.current) {
      clearTimeout(shimmerTimeoutRef.current);
    }

    shimmerAnim.stopAnimation();
    shimmerAnim.setValue(0);
    setShimmering(true);

    Animated.timing(shimmerAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (isMounted.current && finished) {
        setShimmering(false);
      }
    });

    shimmerTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        setShimmering(false);
      }
    }, 1050);
  }

  // Periodic ambient glow every 5s for primary and marked CTA buttons
  useEffect(() => {
    if (!showShimmer || isDisabled) return;

    const firstTimer = setTimeout(() => {
      runShimmer();
    }, 1200);

    const interval = setInterval(() => {
      runShimmer();
    }, 5000);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [showShimmer, isDisabled]);

  const handlePress = () => {
    runShimmer();
    onPress?.();
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== buttonWidth) {
      setButtonWidth(w);
    }
  };

  const loaderColor =
    variant === "primary"
      ? colors.onGold
      : variant === "danger"
        ? colors.danger
        : variant === "goldOutline" || variant === "copyLink"
          ? colors.gold
          : colors.textPrimary;

  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const isGoldVariant = variant === "copyLink" || variant === "goldOutline";

  const sheenColor = isPrimary
    ? "#FFFFFF"
    : isDanger
      ? colors.danger
      : isGoldVariant
        ? colors.goldLight
        : "#FFFFFF";

  const sheenOpacity = isPrimary ? 0.85 : isGoldVariant ? 0.8 : 0.65;

  const effectiveWidth = buttonWidth || 320;
  const shimmerWidth = Math.max(Math.round(effectiveWidth * 0.55), 200);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-shimmerWidth - 60, effectiveWidth + 60],
  });

  const sheenWebGradient = isPrimary
    ? "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.6) 38%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0.6) 62%, rgba(255,255,255,0.18) 82%, rgba(255,255,255,0) 100%)"
    : isGoldVariant
      ? "linear-gradient(90deg, rgba(253,230,138,0) 0%, rgba(253,230,138,0.2) 18%, rgba(253,230,138,0.65) 38%, rgba(253,230,138,0.95) 50%, rgba(253,230,138,0.65) 62%, rgba(253,230,138,0.2) 82%, rgba(253,230,138,0) 100%)"
      : isDanger
        ? "linear-gradient(90deg, rgba(248,113,113,0) 0%, rgba(248,113,113,0.18) 18%, rgba(248,113,113,0.55) 38%, rgba(248,113,113,0.85) 50%, rgba(248,113,113,0.55) 62%, rgba(248,113,113,0.18) 82%, rgba(248,113,113,0) 100%)"
        : "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 18%, rgba(255,255,255,0.48) 38%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.48) 62%, rgba(255,255,255,0.15) 82%, rgba(255,255,255,0) 100%)";

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={runShimmer}
      onHoverIn={runShimmer}
      onLayout={handleLayout}
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
      {showShimmer && shimmering && (
        <Animated.View
          style={[
            styles.shimmerContainer,
            noPointer,
            {
              width: shimmerWidth,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.shimmerTilt}>
            {Platform.OS === "web" ? (
              <View
                style={[
                  styles.webSheen,
                  {
                    backgroundImage: sheenWebGradient,
                  } as any,
                ]}
              />
            ) : (
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={sheenColor} stopOpacity="0" />
                    <Stop
                      offset="15%"
                      stopColor={sheenColor}
                      stopOpacity={(sheenOpacity * 0.15).toFixed(3)}
                    />
                    <Stop
                      offset="35%"
                      stopColor={sheenColor}
                      stopOpacity={(sheenOpacity * 0.55).toFixed(3)}
                    />
                    <Stop
                      offset="50%"
                      stopColor={sheenColor}
                      stopOpacity={sheenOpacity.toFixed(3)}
                    />
                    <Stop
                      offset="65%"
                      stopColor={sheenColor}
                      stopOpacity={(sheenOpacity * 0.55).toFixed(3)}
                    />
                    <Stop
                      offset="85%"
                      stopColor={sheenColor}
                      stopOpacity={(sheenOpacity * 0.15).toFixed(3)}
                    />
                    <Stop offset="100%" stopColor={sheenColor} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
              </Svg>
            )}
          </View>
        </Animated.View>
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
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          userSelect: "none",
          transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease",
        } as const)
      : {}),
  },
  copyLinkBase: {
    borderRadius: radius.md,
    overflow: "hidden",
  },
  shimmerBase: {
    overflow: "hidden",
  },
  shimmerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  shimmerTilt: {
    position: "absolute",
    top: -12,
    bottom: -12,
    left: 0,
    right: 0,
    transform: [{ skewX: "-20deg" }],
  },
  webSheen: {
    width: "100%",
    height: "100%",
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
      ...goldGlowShadow(),
    },
    label: { color: colors.onGold },
    pressed: { opacity: 0.9, transform: [{ scale: 0.965 }] },
  },
  secondary: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    label: { color: colors.textPrimary },
    pressed: { opacity: 0.88, transform: [{ scale: 0.965 }] },
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    label: { color: colors.textSecondary },
    pressed: { opacity: 0.8, transform: [{ scale: 0.965 }] },
  },
  danger: {
    container: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    label: { color: colors.danger },
    pressed: {
      backgroundColor: "rgba(239, 68, 68, 0.22)",
      transform: [{ scale: 0.965 }],
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
      transform: [{ scale: 0.965 }],
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
      transform: [{ scale: 0.965 }],
      ...(Platform.OS === "web"
        ? ({ boxShadow: "0 0 14px rgba(217, 119, 6, 0.45)" } as const)
        : {
            shadowColor: colors.gold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: 14,
            elevation: 4,
          }),
    },
  },
};
