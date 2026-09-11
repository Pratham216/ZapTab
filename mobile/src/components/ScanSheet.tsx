import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize, radius, spacing } from "../theme";

interface ScanSheetProps {
  visible: boolean;
  uploading: boolean;
  error: string | null;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
}

export default function ScanSheet({
  visible,
  uploading,
  error,
  onClose,
  onTakePhoto,
  onChooseLibrary,
}: ScanSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="document-text" size={32} color={colors.gold} />
            </View>
            <Text style={styles.title}>Scan your bill</Text>
            <Text style={styles.subtitle}>
              We'll read the receipt and extract every line item automatically.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {uploading ? (
            <View style={styles.uploading}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.uploadingText}>Uploading receipt…</Text>
            </View>
          ) : (
            <View style={styles.options}>
              <OptionRow
                icon="camera"
                title="Take Photo"
                description="Capture a receipt photo for instant processing."
                onPress={onTakePhoto}
              />
              <OptionRow
                icon="images"
                title="Choose from Library"
                description="Select an existing receipt photo to extract details."
                onPress={onChooseLibrary}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={22} color={colors.onGold} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    alignItems: "flex-end",
    marginBottom: spacing.md,
  },
  cancel: {
    color: colors.gold,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  uploading: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  uploadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  options: {
    gap: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  optionPressed: {
    opacity: 0.85,
    backgroundColor: colors.surfaceElevated,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  optionDesc: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  optionText: {
    flex: 1,
  },
});
