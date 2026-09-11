import { Platform, type TextStyle, type ViewStyle } from "react-native";

/** Cross-platform box shadow (avoids RN Web shadow* deprecation warnings). */
export function boxShadow(
  offsetY: number,
  blur: number,
  color: string,
  opacity: number,
  elevation = 4
): ViewStyle {
  if (Platform.OS === "web") {
    return {
      boxShadow: `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
}

export function goldGlowShadow(): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: "0px 2px 8px rgba(217, 119, 6, 0.25)" } as ViewStyle;
  }
  return {
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  };
}

export function successGlowShadow(): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: "0px 2px 6px rgba(34, 197, 94, 0.3)" } as ViewStyle;
  }
  return {
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  };
}

export function emeraldGlowShadow(): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: "0px 2px 8px rgba(16, 185, 129, 0.35)" } as ViewStyle;
  }
  return {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  };
}

export function wordmarkTextShadow(dark = false): TextStyle {
  if (Platform.OS === "web") {
    return {
      textShadow: dark
        ? "0 1px 4px rgba(0, 0, 0, 0.65)"
        : "0 1px 3px rgba(0, 0, 0, 0.55)",
    } as TextStyle;
  }
  return {
    textShadowColor: dark ? "rgba(0, 0, 0, 0.65)" : "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: dark ? 4 : 3,
  };
}

export const noPointer: ViewStyle = { pointerEvents: "none" };
