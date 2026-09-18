import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
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
import { getBill, getBillImageUrl } from "../api/bills";
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

async function handleDownloadImage(imageUri: string, restaurantName?: string) {
  try {
    const cleanName = (restaurantName || "receipt")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 30);
    const filename = `${cleanName || "receipt"}-bill.jpg`;

    if (Platform.OS === "web") {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } catch {
        const link = document.createElement("a");
        link.href = imageUri;
        link.download = filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    }

    if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
      const can = await Linking.canOpenURL(imageUri);
      if (can) {
        await Linking.openURL(imageUri);
        return;
      }
    }

    Alert.alert("Receipt Saved", "Receipt image is available on your device.");
  } catch (err) {
    Alert.alert("Download Error", "Could not download receipt image.");
  }
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
  const [previewReceipt, setPreviewReceipt] = useState<{
    receipt: ReceiptEntry;
    imageUri: string;
  } | null>(null);

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
              onOpenImage={(imageUri) =>
                setPreviewReceipt({ receipt, imageUri })
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

      {previewReceipt ? (
        <BillImageModal
          visible={Boolean(previewReceipt)}
          receipt={previewReceipt.receipt}
          imageUri={previewReceipt.imageUri}
          onClose={() => setPreviewReceipt(null)}
        />
      ) : null}
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
  onOpenImage,
}: {
  receipt: ReceiptEntry;
  splitting: boolean;
  onSplit: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onOpenImage: (imageUri: string) => void;
}) {
  const imageSource =
    receipt.imageUri ||
    receipt.imageUrl ||
    getBillImageUrl(receipt.billId);

  const [hasError, setHasError] = useState(false);
  const showImage = Boolean(imageSource && !hasError);

  const handleThumbPress = () => {
    if (showImage && imageSource) {
      onOpenImage(imageSource);
    } else {
      Alert.alert(
        "Receipt Image",
        "Original receipt image is not available for this bill."
      );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Pressable
          onPress={handleThumbPress}
          style={({ pressed }) => [
            styles.thumb,
            showImage && styles.thumbWithImage,
            pressed && styles.thumbPressed,
          ]}
          accessibilityLabel="View receipt image"
          accessibilityRole="button"
        >
          {showImage ? (
            <>
              <Image
                source={{ uri: imageSource }}
                style={styles.thumbImage}
                resizeMode="cover"
                onError={() => setHasError(true)}
              />
              <View style={styles.thumbBadge}>
                <Ionicons name="expand-outline" size={11} color="#FFFFFF" />
              </View>
            </>
          ) : (
            <Ionicons name="document-text" size={24} color={colors.textMuted} />
          )}
        </Pressable>

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

function BillImageModal({
  visible,
  receipt,
  imageUri,
  onClose,
}: {
  visible: boolean;
  receipt: ReceiptEntry;
  imageUri: string;
  onClose: () => void;
}) {
  const [loadingImg, setLoadingImg] = useState(true);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {receipt.restaurantName || "Receipt"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {formatMoney(receipt.total)} · {formatSavedAt(receipt.savedAt)}
              </Text>
            </View>
            <View style={styles.modalHeaderActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalDownloadChip,
                  pressed && styles.chipPressed,
                ]}
                onPress={() =>
                  void handleDownloadImage(imageUri, receipt.restaurantName)
                }
              >
                <Ionicons
                  name="download-outline"
                  size={15}
                  color={colors.onGold}
                />
                <Text style={styles.modalDownloadChipText}>Download</Text>
              </Pressable>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={onClose}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.modalImageWrap}>
            {loadingImg ? (
              <ActivityIndicator
                size="large"
                color={colors.gold}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <Image
              source={{ uri: imageUri }}
              style={styles.modalFullImage}
              resizeMode="contain"
              onLoadStart={() => setLoadingImg(true)}
              onLoadEnd={() => setLoadingImg(false)}
            />
          </View>

          <View style={styles.modalFooter}>
            <Button
              label="Download receipt image"
              variant="primary"
              fullWidth
              onPress={() =>
                void handleDownloadImage(imageUri, receipt.restaurantName)
              }
            />
            <Button
              label="Close"
              variant="secondary"
              fullWidth
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
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
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  thumbWithImage: {
    borderColor: colors.goldBorder,
  },
  thumbPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: radius.pill,
    padding: 3,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalContent: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  modalHeaderInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: colors.gold,
    fontSize: fontSize.xs,
    marginTop: 2,
    fontWeight: "600",
  },
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalDownloadChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  modalDownloadChipText: {
    color: colors.onGold,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalImageWrap: {
    width: "100%",
    height: 380,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  modalFullImage: {
    width: "100%",
    height: "100%",
  },
  modalFooter: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
