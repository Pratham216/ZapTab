import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius } from "../theme";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<
  AvatarSize,
  { inner: number; ringPad: number; border: number; fontSize: number }
> = {
  xs: { inner: 24, ringPad: 1, border: 1.5, fontSize: fontSize.xs },
  sm: { inner: 32, ringPad: 2, border: 2, fontSize: fontSize.sm },
  md: { inner: 44, ringPad: 2, border: 2, fontSize: fontSize.lg },
  lg: { inner: 72, ringPad: 3, border: 2, fontSize: fontSize.xxl },
};

export function getNameInitial(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

interface UserAvatarProps {
  name: string;
  size?: AvatarSize;
}

export default function UserAvatar({ name, size = "sm" }: UserAvatarProps) {
  const spec = SIZES[size];
  const initial = getNameInitial(name);

  return (
    <View
      style={[
        styles.ring,
        {
          padding: spec.ringPad,
          borderRadius: radius.pill,
          borderWidth: spec.border,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: spec.inner,
            height: spec.inner,
            borderRadius: radius.pill,
          },
        ]}
      >
        <Text style={[styles.letter, { fontSize: spec.fontSize }]}>
          {initial}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderColor: colors.gold,
  },
  inner: {
    backgroundColor: colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: colors.gold,
    fontWeight: "700",
  },
});
