import { useEffect, useState } from "react";
import { Text, type TextStyle } from "react-native";

const DOT_PATTERN = [".", "..", "...", "....", "...", "..", "."] as const;

export default function AnimatedEllipsis({
  intervalMs = 350,
  style,
}: {
  intervalMs?: number;
  style?: TextStyle;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % DOT_PATTERN.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <Text style={[{ minWidth: 28, textAlign: "left" }, style]} aria-hidden>
      {DOT_PATTERN[index]}
    </Text>
  );
}
