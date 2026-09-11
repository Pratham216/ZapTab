import { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";
import {
  SUPPORT_EMAIL,
  buildSupportMessage,
  formatSupportClipboard,
  openSupportInMailApp,
} from "../lib/support";
import { colors, fontSize, radius, spacing } from "../theme";

interface SupportSheetProps {
  visible: boolean;
  onClose: () => void;
  user?: { name?: string; email?: string };
}

export default function SupportSheet({
  visible,
  onClose,
  user,
}: SupportSheetProps) {
  const [message, setMessage] = useState(() => buildSupportMessage(user));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setMessage(buildSupportMessage(user));
      setCopied(false);
    }
  }, [visible, user]);

  async function handleCopy() {
    await Clipboard.setStringAsync(formatSupportClipboard(message));
    setCopied(true);
  }

  function handleOpenMail() {
    void openSupportInMailApp(message);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="chatbubble-ellipses"
                size={20}
                color={colors.onGold}
              />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Help & Feedback</Text>
              <Text style={styles.subtitle}>
                Questions, ideas, or bugs — we read every message.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={12}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.label}>Send to</Text>
          <Text style={styles.email}>{SUPPORT_EMAIL}</Text>

          <Text style={styles.label}>Your message</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            placeholder="Tell us what's on your mind..."
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.gold}
          />

          <View style={styles.actions}>
            <Button
              label={copied ? "Copied!" : "Copy message"}
              variant="secondary"
              fullWidth
              onPress={() => void handleCopy()}
            />
            <Button
              label="Open in mail app"
              fullWidth
              shimmer
              onPress={handleOpenMail}
            />
          </View>

          {Platform.OS === "web" ? (
            <Text style={styles.hint}>
              Tip: use Copy message if no mail app opens in the browser.
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  closeButton: {
    padding: spacing.xs,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as const) : null),
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "500",
  },
  email: {
    color: colors.gold,
    fontSize: fontSize.md,
    fontWeight: "600",
    marginTop: -spacing.xs,
  },
  input: {
    minHeight: 140,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    lineHeight: 16,
  },
});
