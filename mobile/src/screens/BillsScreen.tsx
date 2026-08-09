import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../components/ScreenContainer";
import MobileHeader from "../components/MobileHeader";
import Button from "../components/Button";
import { useOpenScan } from "../contexts/ScanContext";
import { useAuth } from "../contexts/AuthContext";
import { getBill } from "../api/bills";
import { createRoom } from "../api/rooms";
import { getBillDisplayTotal } from "../lib/billTotals";
import {
  getRecentReceipts,
  removeReceipt,
  saveReceipt,
  saveRoom,
  type ReceiptEntry,
} from "../lib/history";
import { colors, fontSize, radius, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/AppNavigator";

function formatSavedAt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value?: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toFixed(2)}`;
}

export default function BillsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const openScan = useOpenScan();
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [splittingBillId, setSplittingBillId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await getRecentReceipts();
    setReceipts(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openScanSheet() {
    openScan();
  }

  async function handleSplit(receipt: ReceiptEntry) {
    if (receipt.roomCode) {
      navigation.navigate("Room", { code: receipt.roomCode });
      return;
    }

    const hostName = user?.name?.trim();
    if (!hostName) {
      navigation.navigate("BillReview", {
        billId: receipt.billId,
        focusSplit: true,
      });
      return;
    }

    setSplittingBillId(receipt.billId);
    try {
      const bill = await getBill(receipt.billId);
      const room = await createRoom(receipt.billId, hostName, user?.upiId);
      const total = getBillDisplayTotal(bill);
      await saveReceipt({
        billId: receipt.billId,
        restaurantName: bill.restaurantName || receipt.restaurantName,
        total,
        roomCode: room.code,
      });
      await saveRoom({
        code: room.code,
        role: "host",
        restaurantName: bill.restaurantName || receipt.restaurantName,
      });
      navigation.navigate("Room", { code: room.code });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create a split room";
      Alert.alert("Split failed", message);
    } finally {
      setSplittingBillId(null);
    }
  }

  return (
    <ScreenContainer contentStyle={styles.container} edges={["top"]}>
      <MobileHeader
        title="Your Bills"
        goldTitle
        subtitle="Capture Your Receipts"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : receipts.length === 0 ? (
        <View style={styles.empty}>
          <ScanEmptyIllustration />
          <Text style={styles.emptyTitle}>No bills yet</Text>
          <Text style={styles.emptyBody}>
            Scan a receipt to turn it into a bill you can split with friends.
          </Text>
          <Button
            label="Scan receipt"
            shimmer
            onPress={openScanSheet}
            style={styles.scanButton}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
          contentContainerStyle={styles.list}
        >
          {receipts.map((receipt) => (
            <ReceiptCard
              key={receipt.billId}
              receipt={receipt}
              splitting={splittingBillId === receipt.billId}
              onSplit={() => void handleSplit(receipt)}
              onEdit={() =>
                navigation.navigate("BillReview", { billId: receipt.billId })
              }
              onRemove={() => {
                Alert.alert(
                  "Remove bill?",
                  "This will remove the receipt from your history. This can't be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: async () => {
                        await removeReceipt(receipt.billId);
                        await load();
                      },
                    },
                  ]
                );
              }}
            />
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function ScanEmptyIllustration() {
  return (
    <View style={styles.scanFrame} accessibilityElementsHidden>
      <View style={[styles.scanCorner, styles.scanCornerTL]} />
      <View style={[styles.scanCorner, styles.scanCornerTR]} />
      <View style={[styles.scanCorner, styles.scanCornerBL]} />
      <View style={[styles.scanCorner, styles.scanCornerBR]} />
      <View style={styles.scanIconWrap}>
        <Ionicons name="camera" size={36} color={colors.gold} />
      </View>
    </View>
  );
}

function ReceiptCard({
  receipt,
  splitting,
  onSplit,
  onEdit,
  onRemove,
}: {
  receipt: ReceiptEntry;
  splitting: boolean;
  onSplit: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <Ionicons name="document-text" size={24} color={colors.textMuted} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.storeName} numberOfLines={1}>
            {receipt.restaurantName || "Untitled bill"}
          </Text>
          <Text style={styles.date}>{formatSavedAt(receipt.savedAt)}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amount}>{formatMoney(receipt.total)}</Text>
          {receipt.roomCode ? (
            <Text style={styles.roomCode}>{receipt.roomCode}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <ActionChip
          label={splitting ? "splitting…" : "split it"}
          icon="people"
          color={colors.success}
          onPress={onSplit}
          disabled={splitting}
        />
        <ActionChip
          label="edit"
          icon="pencil"
          color="#3B82F6"
          onPress={onEdit}
        />
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function ActionChip({
  label,
  icon,
  color,
  onPress,
  disabled = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: color },
        (pressed || disabled) && styles.chipPressed,
      ]}
    >
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  scanFrame: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  scanCorner: {
    position: "absolute",
    width: 22,
    height: 22,
    borderColor: colors.gold,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.sm,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.sm,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.sm,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.sm,
  },
  scanIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    minWidth: 220,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  amountBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    color: colors.success,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  roomCode: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabel: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "600",
    textTransform: "lowercase",
  },
  removeBtn: {
    marginLeft: "auto",
    padding: spacing.xs,
  },
});
