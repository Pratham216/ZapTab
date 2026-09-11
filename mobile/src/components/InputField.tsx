import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fontSize, radius, spacing } from "../theme";

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  prefix?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export default function InputField({
  label,
  value,
  onChangeText,
  onBlur,
  keyboardType = "default",
  autoCapitalize,
  prefix,
  placeholder,
  style,
}: InputFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.gold}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  prefix: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
});
