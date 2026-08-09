import { Platform, StyleSheet, Text, type TextStyle } from "react-native";
import { fontSize } from "../theme";

const WEB_GRADIENT = {
  backgroundImage:
    "linear-gradient(90deg, #fef3c7 0%, #fde68a 22%, #fbbf24 52%, #f59e0b 78%, #d97706 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
} as TextStyle;

interface GradientGoldTextProps {
  children: string;
  style?: TextStyle;
  size?: "title" | "display";
}

export default function GradientGoldText({
  children,
  style,
  size = "title",
}: GradientGoldTextProps) {
  const sizeStyle = size === "display" ? styles.display : styles.title;

  return (
    <Text style={[styles.base, sizeStyle, Platform.OS === "web" && WEB_GRADIENT, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: "700",
    letterSpacing: -0.5,
    ...(Platform.OS !== "web"
      ? {
          color: "#fbbf24",
        }
      : null),
  },
  title: {
    fontSize: fontSize.xxl,
  },
  display: {
    fontSize: fontSize.display,
  },
});
