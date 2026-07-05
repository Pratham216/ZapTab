import { StyleSheet, Text, type TextStyle } from "react-native";
import { colors } from "../theme";

type WordmarkSize = "sm" | "md" | "lg" | "xl";

const fontSizes: Record<WordmarkSize, number> = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
};

interface SplitSnapWordmarkProps {
  size?: WordmarkSize;
  style?: TextStyle;
}

export default function SplitSnapWordmark({
  size = "lg",
  style,
}: SplitSnapWordmarkProps) {
  const fontSize = fontSizes[size];

  return (
    <Text
      accessibilityLabel="SplitSnap"
      style={[styles.base, { fontSize }, style]}
    >
      <Text style={styles.split}>Split</Text>
      <Text style={styles.snap}>Snap</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  split: {
    color: colors.textPrimary,
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  snap: {
    color: colors.gold,
    textShadowColor: "rgba(0, 0, 0, 0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
