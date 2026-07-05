import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ScreenContainer from "./ScreenContainer";
import Button from "./Button";
import Card from "./Card";
import InputField from "./InputField";
import {
  addBillItem,
  deleteBillItem,
  updateBill,
  updateBillItem,
  type Bill,
  type BillItem,
} from "../api/bills";
import { createRoom } from "../api/rooms";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import {
  applyItemFieldUpdate,
  getLineUnitPrice,
  recalcBillFromItems,
  recalcGrandTotal,
  sumItemPrices,
} from "../lib/billTotals";
import { colors, fontSize, radius, spacing, typography } from "../theme";

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function billsMatchForSave(a: Bill, b: Bill): boolean {
  if (
    a.restaurantName !== b.restaurantName ||
    a.billDate !== b.billDate ||
    a.tax !== b.tax ||
    a.serviceCharge !== b.serviceCharge ||
    a.subtotal !== b.subtotal ||
    a.grandTotal !== b.grandTotal ||
    a.items.length !== b.items.length
  ) {
    return false;
  }
  return a.items.every((item, i) => {
    const other = b.items[i];
    return (
      item.id === other.id &&
      item.name === other.name &&
      item.price === other.price &&
      item.quantity === other.quantity
    );
  });
}

async function persistBillToServer(lastSaved: Bill, draft: Bill): Promise<Bill> {
  let serverBill = lastSaved;

  for (const item of draft.items) {
    const saved = serverBill.items.find((i) => i.id === item.id);
    if (
      !saved ||
      saved.name !== item.name ||
      saved.price !== item.price ||
      saved.quantity !== item.quantity
    ) {
      serverBill = await updateBillItem(serverBill.id, item.id, {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      });
    }
  }

  const billPatch: Parameters<typeof updateBill>[1] = {};
  if (serverBill.restaurantName !== draft.restaurantName) {
    billPatch.restaurantName = draft.restaurantName;
  }
  if (serverBill.billDate !== draft.billDate) {
    billPatch.billDate = draft.billDate;
  }
  if (serverBill.tax !== draft.tax) billPatch.tax = draft.tax;
  if (serverBill.serviceCharge !== draft.serviceCharge) {
    billPatch.serviceCharge = draft.serviceCharge;
  }
  if (serverBill.subtotal !== draft.subtotal) billPatch.subtotal = draft.subtotal;
  if (serverBill.grandTotal !== draft.grandTotal) {
    billPatch.grandTotal = draft.grandTotal;
  }

  if (Object.keys(billPatch).length > 0) {
    serverBill = await updateBill(serverBill.id, billPatch);
  }

  return serverBill;
}

interface BillEditorProps {
  initialBill: Bill;
  onScanAnother: () => void;
  onRoomCreated: (code: string) => void;
}

export default function BillEditor({
  initialBill,
  onScanAnother,
  onRoomCreated,
}: BillEditorProps) {
  const [draft, setDraft] = useState(initialBill);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hostName, setHostName] = useState("");
  const [hostUpiId, setHostUpiId] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const draftRef = useRef(draft);
  const lastSavedRef = useRef(initialBill);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);

  draftRef.current = draft;

  const scheduleSave = useDebouncedCallback(() => {
    void flushSave();
  }, 500);

  async function flushSave() {
    if (!dirtyRef.current || savingRef.current) return;

    const snapshot = draftRef.current;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      const serverBill = await persistBillToServer(lastSavedRef.current, snapshot);
      lastSavedRef.current = serverBill;

      if (billsMatchForSave(draftRef.current, snapshot)) {
        dirtyRef.current = false;
        setDraft(serverBill);
      } else {
        scheduleSave();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function updateDraft(updater: (current: Bill) => Bill) {
    dirtyRef.current = true;
    setDraft((current) => updater(current));
    scheduleSave();
  }

  function handleItemChange(
    itemId: string,
    data: { name?: string; price?: number; quantity?: number }
  ) {
    updateDraft((current) => {
      const items = current.items.map((item) =>
        item.id === itemId ? applyItemFieldUpdate(item, data) : item
      );
      return recalcBillFromItems({ ...current, items });
    });
  }

  function handleBillFieldChange(
    fields: Partial<
      Pick<
        Bill,
        "restaurantName" | "billDate" | "tax" | "serviceCharge" | "subtotal" | "grandTotal"
      >
    >
  ) {
    updateDraft((current) => recalcGrandTotal({ ...current, ...fields }));
  }

  async function handleAddItem() {
    try {
      const serverBill = await addBillItem(draft.id, {
        name: "New item",
        price: 0,
        quantity: 1,
      });
      lastSavedRef.current = serverBill;
      dirtyRef.current = false;
      setDraft(recalcBillFromItems(serverBill));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const serverBill = await deleteBillItem(draft.id, itemId);
      lastSavedRef.current = serverBill;
      dirtyRef.current = false;
      setDraft(recalcBillFromItems(serverBill));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  const itemsTotal = sumItemPrices(draft.items);
  const displaySubtotal = draft.subtotal ?? itemsTotal;
  const displayGrandTotal =
    draft.grandTotal ?? displaySubtotal + draft.tax + draft.serviceCharge;

  async function handleCreateRoom() {
    if (!hostName.trim()) {
      setRoomError("Enter your name to create the room");
      return;
    }

    if (dirtyRef.current) {
      await flushSave();
    }

    setRoomError(null);
    setCreatingRoom(true);
    try {
      const room = await createRoom(
        draft.id,
        hostName.trim(),
        hostUpiId.trim() || undefined
      );
      onRoomCreated(room.code);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  }

  return (
    <ScreenContainer scroll contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={[typography.heading, styles.title]}>Review your bill</Text>
            <Text style={styles.subtitle}>
              Fix any mistakes before sharing with friends.
            </Text>
          </View>
          <View style={styles.parsedBadge}>
            <Text style={styles.parsedBadgeText}>Parsed</Text>
          </View>
        </View>
        {saving ? <Text style={styles.savingText}>Saving…</Text> : null}
      </View>

      <InputField
        label="Restaurant"
        value={draft.restaurantName}
        onChangeText={(v) => handleBillFieldChange({ restaurantName: v })}
        placeholder="Restaurant name"
        style={styles.field}
      />
      <InputField
        label="Date"
        value={draft.billDate}
        onChangeText={(v) => handleBillFieldChange({ billDate: v })}
        placeholder="Bill date"
        style={styles.field}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Items</Text>
        <Pressable onPress={handleAddItem} hitSlop={8}>
          <Text style={styles.addLink}>+ Add item</Text>
        </Pressable>
      </View>

      {draft.items.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            No items extracted. Tap "+ Add item" to add manually.
          </Text>
        </Card>
      ) : (
        <>
          <View style={styles.itemColumnHeader}>
            <Text style={[styles.itemColumnHeaderText, styles.itemColumnItem]}>
              Item
            </Text>
            <Text style={[styles.itemColumnHeaderText, styles.itemColumnQty]}>
              Qty
            </Text>
            <Text style={[styles.itemColumnHeaderText, styles.itemColumnAmount]}>
              Amount
            </Text>
          </View>
          <View style={styles.itemList}>
            {draft.items.map((item) => (
              <EditableItemRow
                key={item.id}
                item={item}
                onChange={handleItemChange}
                onDelete={handleDeleteItem}
              />
            ))}
          </View>
        </>
      )}

      <Card style={styles.totalsCard}>
        <NumberField
          label="Tax (GST)"
          value={draft.tax}
          onChange={(v) => handleBillFieldChange({ tax: v })}
        />
        <NumberField
          label="Service charge"
          value={draft.serviceCharge}
          onChange={(v) => handleBillFieldChange({ serviceCharge: v })}
        />
        <NumberField
          label="Subtotal"
          value={displaySubtotal}
          onChange={(v) => handleBillFieldChange({ subtotal: v })}
        />
        <NumberField
          label="Grand total"
          value={displayGrandTotal}
          onChange={(v) => handleBillFieldChange({ grandTotal: v })}
        />
      </Card>

      <Card style={styles.itemsTotalCard}>
        <Text style={styles.itemsTotalLabel}>Items total</Text>
        <Text style={styles.itemsTotalValue}>{formatCurrency(itemsTotal)}</Text>
        <View style={styles.breakdown}>
          <BreakdownRow label="Subtotal" value={formatCurrency(displaySubtotal)} />
          <BreakdownRow label="Tax" value={formatCurrency(draft.tax)} />
          <BreakdownRow
            label="Service charge"
            value={formatCurrency(draft.serviceCharge)}
          />
          <View style={styles.divider} />
          <BreakdownRow
            label="Grand total"
            value={formatCurrency(displayGrandTotal)}
            bold
          />
        </View>
      </Card>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

      <Card style={styles.shareCard}>
        <Text style={styles.shareCardTitle}>Create room & share</Text>
        <InputField
          label="Your name (host)"
          value={hostName}
          onChangeText={setHostName}
          placeholder="e.g. Rahul"
        />
        <InputField
          label="Your UPI ID (optional)"
          value={hostUpiId}
          onChangeText={setHostUpiId}
          placeholder="you@ybl"
        />
        <Button
          label="Create room & share"
          fullWidth
          shimmer
          loading={creatingRoom}
          disabled={creatingRoom}
          onPress={handleCreateRoom}
        />
        {roomError ? <Text style={styles.errorText}>{roomError}</Text> : null}
      </Card>

      <View style={styles.actions}>
        <Button
          label="Scan another bill"
          variant="secondary"
          fullWidth
          onPress={onScanAnother}
        />
      </View>
    </ScreenContainer>
  );
}

function EditableItemRow({
  item,
  onChange,
  onDelete,
}: {
  item: BillItem;
  onChange: (itemId: string, data: Partial<BillItem>) => void;
  onDelete: (itemId: string) => void;
}) {
  const [qtyText, setQtyText] = useState(String(item.quantity));
  const [priceText, setPriceText] = useState(String(item.price));
  const priceFocusedRef = useRef(false);
  const unitPrice = getLineUnitPrice(item);

  useEffect(() => {
    setQtyText(String(item.quantity));
  }, [item.quantity]);

  useEffect(() => {
    if (!priceFocusedRef.current) {
      setPriceText(String(item.price));
    }
  }, [item.price]);

  function applyQuantity(quantity: number) {
    setQtyText(String(quantity));
    onChange(item.id, { quantity });
  }

  function commitQty(raw: string) {
    const parsed = parseInt(raw, 10);
    const quantity = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
    applyQuantity(quantity);
  }

  function commitPrice(raw: string) {
    const parsed = parseFloat(raw);
    const price = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setPriceText(String(price));
    onChange(item.id, { price });
  }

  return (
    <Card style={styles.itemCard}>
      <TextInput
        style={styles.itemNameInput}
        value={item.name}
        onChangeText={(v) => onChange(item.id, { name: v })}
        placeholder="Item name"
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.itemFields}>
        <View style={styles.itemFieldCol}>
          <Text style={styles.itemFieldLabel}>Qty</Text>
          <TextInput
            style={styles.itemFieldInput}
            value={qtyText}
            keyboardType="number-pad"
            onChangeText={(v) => {
              setQtyText(v);
              const parsed = parseInt(v, 10);
              if (Number.isFinite(parsed) && parsed >= 1) {
                applyQuantity(parsed);
              }
            }}
            onBlur={() => commitQty(qtyText)}
          />
        </View>

        <View style={[styles.itemFieldCol, styles.itemFieldColWide]}>
          <Text style={styles.itemFieldLabel}>Amount</Text>
          <View style={styles.priceRow}>
            <Text style={styles.pricePrefix}>₹</Text>
            <TextInput
              style={styles.itemFieldInput}
              value={priceText}
              keyboardType="decimal-pad"
              onFocus={() => {
                priceFocusedRef.current = true;
              }}
              onChangeText={(v) => {
                setPriceText(v);
                const parsed = parseFloat(v);
                if (Number.isFinite(parsed) && parsed >= 0) {
                  onChange(item.id, { price: parsed });
                }
              }}
              onBlur={() => {
                priceFocusedRef.current = false;
                commitPrice(priceText);
              }}
            />
          </View>
        </View>

        <Pressable onPress={() => onDelete(item.id)} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.unitPrice}>
        {formatCurrency(unitPrice)} per unit
      </Text>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <InputField
      label={label}
      value={text}
      prefix="₹"
      keyboardType="decimal-pad"
      onChangeText={(v) => {
        setText(v);
        const parsed = parseFloat(v);
        if (Number.isFinite(parsed) && parsed >= 0) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        const parsed = parseFloat(text);
        const final = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        setText(String(final));
        onChange(final);
      }}
    />
  );
}

function BreakdownRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, bold && styles.breakdownBold]}>
        {label}
      </Text>
      <Text style={[styles.breakdownValue, bold && styles.breakdownBold]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    lineHeight: 26,
    fontWeight: "500",
    marginTop: spacing.sm,
  },
  parsedBadge: {
    backgroundColor: colors.successMutedStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.lg,
  },
  parsedBadgeText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  savingText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  field: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  addLink: {
    color: colors.gold,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  itemList: {
    gap: spacing.md,
  },
  itemColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemColumnHeaderText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  itemColumnItem: {
    flex: 1,
  },
  itemColumnQty: {
    width: 72,
  },
  itemColumnAmount: {
    flex: 2,
  },
  itemCard: {
    gap: spacing.sm,
  },
  itemNameInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  itemFields: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  itemFieldCol: {
    flex: 1,
    gap: spacing.xs,
  },
  itemFieldColWide: {
    flex: 2,
  },
  itemFieldLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  itemFieldInput: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    minHeight: 44,
  },
  pricePrefix: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: colors.textMuted,
    fontSize: 28,
    lineHeight: 30,
  },
  unitPrice: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  totalsCard: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  itemsTotalCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  itemsTotalLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  itemsTotalValue: {
    color: colors.goldLight,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    textShadowColor: "rgba(217, 119, 6, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  breakdown: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  breakdownValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  breakdownBold: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    textAlign: "center",
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  shareCard: {
    marginTop: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  shareCardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  hintText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
    textAlign: "center",
  },
});
