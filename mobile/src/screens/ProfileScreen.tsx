import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import MobileHeader from "../components/MobileHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import SupportSheet from "../components/SupportSheet";
import ZapTabWordmark from "../components/ZapTabWordmark";
import { updateUserUpi } from "../api/users";
import { useAuth } from "../contexts/AuthContext";
import { isValidUpiId } from "@zaptab/shared";
import { colors, fontSize, radius, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

export default function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, completeOnboarding } = useAuth();
  const [supportOpen, setSupportOpen] = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);
  const [upiDraft, setUpiDraft] = useState(user?.upiId ?? "");
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  const initial = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();
  const supportUser = { name: user?.name, email: user?.email };

  return (
    <ScreenContainer scroll contentStyle={styles.container} edges={["top"]}>
      <MobileHeader title="Settings" subtitle="your account & app" />

      <View style={styles.avatarSection}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        </View>
        <ZapTabWordmark size="md" />
        <Text style={styles.userName}>{user?.name || "ZapTab user"}</Text>
        {user?.email ? <Text style={styles.userEmail}>{user.email}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <Card>
        <Row label="Name" value={user?.name || "—"} />
        <View style={styles.divider} />
        <Row label="Email" value={user?.email || "—"} />
        <View style={styles.divider} />
        {editingUpi ? (
          <View style={styles.upiEditRow}>
            <View style={styles.upiEditField}>
              <Text style={styles.rowLabel}>UPI ID</Text>
              <TextInput
                style={styles.upiInput}
                value={upiDraft}
                onChangeText={(v) => { setUpiDraft(v); setUpiError(null); }}
                placeholder="you@ybl"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                selectionColor={colors.gold}
                autoFocus
              />
              {upiError ? <Text style={styles.upiError}>{upiError}</Text> : null}
            </View>
            <View style={styles.upiEditActions}>
              <Pressable
                onPress={async () => {
                  const trimmed = upiDraft.trim();
                  if (trimmed && !isValidUpiId(trimmed)) {
                    setUpiError("Use format: name@bank (e.g. you@ybl)");
                    return;
                  }
                  setUpiSaving(true);
                  setUpiError(null);
                  try {
                    const updated = await updateUserUpi(trimmed);
                    completeOnboarding(updated);
                    setEditingUpi(false);
                  } catch (err) {
                    setUpiError(err instanceof Error ? err.message : "Failed to save");
                  } finally {
                    setUpiSaving(false);
                  }
                }}
                style={styles.upiSaveBtn}
                disabled={upiSaving}
              >
                <Ionicons name="checkmark" size={18} color={upiSaving ? colors.textMuted : colors.success} />
              </Pressable>
              <Pressable onPress={() => { setEditingUpi(false); setUpiDraft(user?.upiId ?? ""); setUpiError(null); }} style={styles.upiSaveBtn}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.upiReadRow}>
            <Row label="UPI ID" value={user?.upiId || "Not set"} />
            <Pressable
              onPress={() => { setUpiDraft(user?.upiId ?? ""); setEditingUpi(true); }}
              hitSlop={8}
              style={styles.upiEditBtn}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      </Card>

      <Text style={styles.sectionTitle}>Support</Text>
      <Card style={styles.supportCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Help and feedback"
          onPress={() => setSupportOpen(true)}
          style={({ pressed }) => [
            styles.supportRow,
            pressed && styles.supportRowPressed,
          ]}
        >
          <View style={styles.supportIcon}>
            <Ionicons
              name="chatbubble-ellipses"
              size={18}
              color={colors.onGold}
            />
          </View>
          <View style={styles.supportCopy}>
            <Text style={styles.supportText}>Help & Feedback</Text>
            <Text style={styles.supportHint}>
              Send a message to the ZapTab team
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>

      <View style={styles.actions}>
        {__DEV__ ? (
          <Button
            label="Developer info"
            variant="secondary"
            fullWidth
            onPress={() => navigation.navigate("Status")}
          />
        ) : null}
        <Button
          label="Sign out"
          variant="ghost"
          fullWidth
          onPress={() => void signOut()}
        />
      </View>

      <SupportSheet
        visible={supportOpen}
        onClose={() => setSupportOpen(false)}
        user={supportUser}
      />
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  avatarSection: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  avatarRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.goldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: colors.gold,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  userName: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  userEmail: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  upiReadRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  upiEditBtn: {
    marginTop: spacing.xs,
    padding: 4,
  },
  upiEditRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  upiEditField: {
    flex: 1,
    gap: spacing.xs,
  },
  upiInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: "monospace",
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    minHeight: 38,
  },
  upiError: {
    color: colors.danger,
    fontSize: fontSize.xs,
  },
  upiEditActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.lg + 2,
  },
  upiSaveBtn: {
    padding: spacing.xs,
  },
  supportCard: {
    paddingVertical: spacing.md,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer" } as const)
      : null),
  },
  supportRowPressed: {
    opacity: 0.85,
  },
  supportIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  supportCopy: {
    flex: 1,
    gap: 2,
  },
  supportText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  supportHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  actions: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
});
