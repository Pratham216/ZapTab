import { useEffect } from "react";
import { Platform, StyleSheet, Text, type TextStyle } from "react-native";
import { fontSize } from "../theme";

const WEB_SHIMMER: TextStyle = {
  backgroundImage:
    "linear-gradient(110deg, #71717a 0%, #fafafa 22%, #d4d4d8 44%, #ffffff 56%, #a1a1aa 78%, #e4e4e7 100%)",
  backgroundSize: "200% auto",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  animationDuration: "4s",
  animationIterationCount: "infinite",
  animationTimingFunction: "ease-in-out",
  animationName: "authWelcomeShimmer",
} as TextStyle;

const SHIMMER_KEYFRAMES = `
@keyframes authWelcomeShimmer {
  0%, 100% { background-position: 0% center; }
  50% { background-position: 100% center; }
}
`;

export default function ShimmerWelcomeText({ children }: { children: string }) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "auth-welcome-shimmer-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = SHIMMER_KEYFRAMES;
    document.head.appendChild(style);
  }, []);

  return (
    <Text
      style={[
        styles.base,
        Platform.OS === "web" ? WEB_SHIMMER : styles.nativeFallback,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  nativeFallback: {
    color: "#e4e4e7",
    textShadowColor: "rgba(255, 255, 255, 0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
