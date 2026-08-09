import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ScreenContainer from "./ScreenContainer";
import Button from "./Button";
import GradientGoldText from "./GradientGoldText";
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
import { colors, fontSize, radius, spacing } from "../theme";

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function isTempItemId(id: string): boolean {
  return id.startsWith("temp-");
}

function createTempItemId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isItemReadyToSync(item: BillItem): boolean {
  return (
    item.name.trim().length > 0 &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0 &&
    Number.isInteger(item.quantity) &&
    Number.isFinite(item.price) &&
    item.price > 0
  );
}

function validateBillItems(items: BillItem[]): string | null {
  if (items.length === 0) {
    return "Add at least one item before continuing";
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = items.length > 1 ? `Item ${i + 1}` : "Each item";

    if (!item.name.trim()) {
      return `${label} needs a name`;
    }
    if (
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isInteger(item.quantity)
    ) {
      return `${label}: quantity must be greater than 0`;
    }
    if (!Number.isFinite(item.price) || item.price <= 0) {
      return `${label}: amount must be greater than 0`;
    }
  }

  return null;
}

function hasPendingSync(draft: Bill, lastSaved: Bill): boolean {
  for (const item of draft.items) {
    if (isTempItemId(item.id)) {
      if (isItemReadyToSync(item)) return true;
      continue;
    }
    const saved = lastSaved.items.find((i) => i.id === item.id);
    if (
      !saved ||
      saved.name !== item.name ||
      saved.price !== item.price ||
      saved.quantity !== item.quantity
    ) {
      return true;
    }
  }

  return lastSaved.items.some(
    (saved) => !draft.items.some((item) => item.id === saved.id)
  );
}

function mergeDraftWithServer(
  serverBill: Bill,
  draft: Bill,
  syncedTempIds: Map<string, string>
): Bill {
  const items = draft.items.map((item) => {
    if (isTempItemId(item.id)) {
      const realId = syncedTempIds.get(item.id);
      if (realId) {
        const fromServer = serverBill.items.find((i) => i.id === realId);
        if (fromServer) return fromServer;
      }
      return item;
    }
    const fromServer = serverBill.items.find((i) => i.id === item.id);
    return fromServer ?? item;
  });

  return recalcBillFromItems({ ...serverBill, items });
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

async function persistBillToServer(
  lastSaved: Bill,
  draft: Bill
): Promise<{ serverBill: Bill; syncedTempIds: Map<string, string> }> {
  let serverBill = lastSaved;
  const syncedTempIds = new Map<string, string>();
  const draftIds = new Set(draft.items.map((item) => item.id));

  for (const savedItem of [...serverBill.items]) {
    if (!draftIds.has(savedItem.id)) {
      serverBill = await deleteBillItem(serverBill.id, savedItem.id);
    }
  }

  for (const item of draft.items) {
    if (!isTempItemId(item.id) || !isItemReadyToSync(item)) continue;

    const beforeIds = new Set(serverBill.items.map((i) => i.id));
    serverBill = await addBillItem(serverBill.id, {
      name: item.name.trim(),
      price: item.price,
      quantity: item.quantity,
    });
    const added = serverBill.items.find((i) => !beforeIds.has(i.id));
    if (added) syncedTempIds.set(item.id, added.id);
  }

  for (const item of draft.items) {
    const serverId = isTempItemId(item.id)
      ? syncedTempIds.get(item.id)
      : item.id;
    if (!serverId) continue;

    const saved = serverBill.items.find((i) => i.id === serverId);
    if (
      !saved ||
      saved.name !== item.name ||
      saved.price !== item.price ||
      saved.quantity !== item.quantity
    ) {
      serverBill = await updateBillItem(serverBill.id, serverId, {
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

  return { serverBill, syncedTempIds };
}

interface BillEditorProps {
  initialBill: Bill;
  onScanAnother: () => void;
  onRoomCreated: (code: string) => void;
  onBillChange?: (bill: Bill) => void;
  focusSplit?: boolean;
  defaultHostName?: string;
  defaultHostUpiId?: string;
}

export default function BillEditor({
  initialBill,
  onScanAnother,
  onRoomCreated,
  onBillChange,
  focusSplit = false,
  defaultHostName = "",
  defaultHostUpiId = "",
}: BillEditorProps) {
  const [draft, setDraft] = useState(initialBill);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hostName, setHostName] = useState(defaultHostName);
  const [hostUpiId, setHostUpiId] = useState(defaultHostUpiId);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const hostNameInputRef = useRef<TextInput>(null);

  const draftRef = useRef(draft);
  const lastSavedRef = useRef(initialBill);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const onBillChangeRef = useRef(onBillChange);

  draftRef.current = draft;
  onBillChangeRef.current = onBillChange;

  function notifyBillChange(bill: Bill) {
    onBillChangeRef.current?.(recalcBillFromItems(bill));
  }

  const notifyHistory = useDebouncedCallback(() => {
    notifyBillChange(draftRef.current);
  }, 150);

  const scheduleSave = useDebouncedCallback(() => {
    void flushSave();
  }, 400);

  useEffect(() => {
    if (defaultHostName) setHostName(defaultHostName);
  }, [defaultHostName]);

  useEffect(() => {
    if (defaultHostUpiId) setHostUpiId(defaultHostUpiId);
  }, [defaultHostUpiId]);

  useEffect(() => {
    if (!focusSplit) return;
    hostNameInputRef.current?.focus();
  }, [focusSplit]);

  useEffect(() => {
    return () => {
      notifyHistory.cancel();
      scheduleSave.cancel();
      void flushSave({ force: true });
    };
  }, []);

  async function flushSave(options?: { force?: boolean }) {
    const shouldSave =
      options?.force ||
      dirtyRef.current ||
      hasPendingSync(draftRef.current, lastSavedRef.current);
    if (!shouldSave || savingRef.current) return;

    const snapshot = draftRef.current;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      const { serverBill, syncedTempIds } = await persistBillToServer(
        lastSavedRef.current,
        snapshot
      );
      lastSavedRef.current = serverBill;
      const merged = mergeDraftWithServer(serverBill, snapshot, syncedTempIds);

      if (billsMatchForSave(draftRef.current, merged)) {
        dirtyRef.current = hasPendingSync(merged, serverBill);
        setDraft(merged);
        notifyBillChange(merged);
        if (dirtyRef.current) scheduleSave();
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
    setDraft((current) => {
      const next = updater(current);
      draftRef.current = next;
      notifyHistory();
      return next;
    });
    scheduleSave();
  }

  function handleItemChange(
    itemId: string,
    data: { name?: string; price?: number; quantity?: number }
  ) {
    setRoomError(null);
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

  function handleAddItem() {
    const newItemId = createTempItemId();
    setRoomError(null);
    updateDraft((current) =>
      recalcBillFromItems({
        ...current,
        items: [
          ...current.items,
          { id: newItemId, name: "", price: 0, quantity: 1 },
        ],
      })
    );
    setFocusItemId(newItemId);
  }

  async function handleDeleteItem(itemId: string) {
    if (isTempItemId(itemId)) {
      setRoomError(null);
      updateDraft((current) =>
        recalcBillFromItems({
          ...current,
          items: current.items.filter((item) => item.id !== itemId),
        })
      );
      return;
    }

    try {
      const serverBill = await deleteBillItem(draft.id, itemId);
      lastSavedRef.current = serverBill;
      setDraft((current) => {
        const temps = current.items.filter((item) => isTempItemId(item.id));
        const next = recalcBillFromItems({
          ...serverBill,
          items: [...serverBill.items, ...temps],
        });
        notifyBillChange(next);
        return next;
      });
      dirtyRef.current = hasPendingSync(draftRef.current, serverBill);
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

    const itemError = validateBillItems(draft.items);
    if (itemError) {
      setRoomError(itemError);
      return;
    }

    if (dirtyRef.current || hasPendingSync(draft, lastSavedRef.current)) {
      await flushSave();
    }

    const postSaveError = validateBillItems(draftRef.current.items);
    if (postSaveError) {
      setRoomError(postSaveError);
      return;
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
        <GradientGoldText size="title">Review your bill</GradientGoldText>
        <Text style={styles.subtitle}>
          Fix any mistakes before sharing with friends.
        </Text>
        {saving ? <Text style={styles.savingText}>Saving…</Text> : null}
      </View>

      <View style={styles.billCard}>
        <View style={styles.metaGrid}>
          <BillField
            label="Restaurant"
            value={draft.restaurantName}
            onChangeText={(v) => handleBillFieldChange({ restaurantName: v })}
          />
          <BillField
            label="Date"
            value={draft.billDate}
            onChangeText={(v) => handleBillFieldChange({ billDate: v })}
          />
        </View>
      </View>

      <View style={styles.billCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items</Text>
          <Pressable onPress={handleAddItem} hitSlop={8}>
            <Text style={styles.addLink}>
              <Text style={styles.addPlus}>+</Text> Add item
            </Text>
          </Pressable>
        </View>

        {draft.items.length > 0 ? (
          <View style={styles.gridRowHeader}>
            <View style={styles.colItem}>
              <Text style={styles.itemColumnHeaderText}>Item</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.itemColumnHeaderText}>Qty</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.itemColumnHeaderText}>Amount</Text>
            </View>
            <View style={styles.colAction} />
          </View>
        ) : null}

        {draft.items.length === 0 ? (
          <Text style={styles.emptyText}>
            No items extracted. Add items manually.
          </Text>
        ) : (
          <View style={styles.itemList}>
            {draft.items.map((item) => (
              <EditableItemRow
                key={item.id}
                item={item}
                onChange={handleItemChange}
                onDelete={handleDeleteItem}
                autoFocusName={focusItemId === item.id}
                onNameFocused={() => setFocusItemId(null)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.totalsCard}>
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
          highlight
        />
      </View>

      <View style={styles.premiumCard}>
        <Text style={styles.itemsTotalLabel}>Items total</Text>
        <GradientGoldText size="display">{formatCurrency(itemsTotal)}</GradientGoldText>

        <View style={styles.shareFields}>
          <BillField
            label="Your name (host)"
            value={hostName}
            onChangeText={setHostName}
            placeholder="e.g. Rahul"
            inputRef={hostNameInputRef}
          />
          <BillField
            label="Your UPI ID (optional)"
            value={hostUpiId}
            onChangeText={setHostUpiId}
            placeholder="you@ybl"
          />
        </View>

        <Button
          label="Create room & share"
          fullWidth
          shimmer
          loading={creatingRoom}
          disabled={creatingRoom}
          onPress={handleCreateRoom}
        />
        {roomError ? <Text style={styles.errorText}>{roomError}</Text> : null}
        {saveError ? <Text style={styles.saveWarn}>{saveError}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          label="Scan another bill"
          variant="ghost"
          fullWidth
          onPress={onScanAnother}
        />
      </View>
    </ScreenContainer>
  );
}

function BillField({
  label,
  value,
  onChangeText,
  placeholder,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  inputRef?: RefObject<TextInput | null>;
}) {
  return (
    <View style={styles.billField}>
      <Text style={styles.billLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={styles.billInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.gold}
      />
    </View>
  );
}

function EditableItemRow({
  item,
  onChange,
  onDelete,
  autoFocusName = false,
  onNameFocused,
}: {
  item: BillItem;
  onChange: (itemId: string, data: Partial<BillItem>) => void;
  onDelete: (itemId: string) => void;
  autoFocusName?: boolean;
  onNameFocused?: () => void;
}) {
  const nameInputRef = useRef<TextInput>(null);
  const [qtyText, setQtyText] = useState(
    item.quantity > 0 ? String(item.quantity) : ""
  );
  const [priceText, setPriceText] = useState(
    item.price > 0 ? String(item.price) : ""
  );
  const priceFocusedRef = useRef(false);

  useEffect(() => {
    if (!autoFocusName) return;
    nameInputRef.current?.focus();
    onNameFocused?.();
  }, [autoFocusName, onNameFocused]);

  useEffect(() => {
    setQtyText(item.quantity > 0 ? String(item.quantity) : "");
  }, [item.quantity]);

  useEffect(() => {
    if (!priceFocusedRef.current) {
      setPriceText(item.price > 0 ? String(item.price) : "");
    }
  }, [item.price]);

  function applyQuantity(quantity: number) {
    setQtyText(String(quantity));
    onChange(item.id, { quantity });
  }

  function commitQty(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setQtyText("");
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQtyText(item.quantity > 0 ? String(item.quantity) : "");
      return;
    }
    applyQuantity(parsed);
  }

  function commitPrice(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setPriceText("");
      onChange(item.id, { price: 0 });
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPriceText(item.price > 0 ? String(item.price) : "");
      return;
    }
    setPriceText(String(parsed));
    onChange(item.id, { price: parsed });
  }

  return (
    <View style={styles.gridRow}>
      <View style={styles.colItem}>
        <TextInput
          ref={nameInputRef}
          style={styles.billInput}
          value={item.name}
          onChangeText={(v) => onChange(item.id, { name: v })}
          placeholder="Item name"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      <View style={styles.colQty}>
        <TextInput
          style={[styles.billInput, styles.qtyInput]}
          value={qtyText}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={colors.textMuted}
          onChangeText={(v) => {
            if (v !== "" && !/^\d+$/.test(v)) return;
            setQtyText(v);
            if (v === "") return;
            const parsed = parseInt(v, 10);
            if (Number.isFinite(parsed) && parsed > 0) {
              applyQuantity(parsed);
            }
          }}
          onBlur={() => commitQty(qtyText)}
        />
      </View>
      <View style={styles.colAmount}>
        <View style={styles.priceRow}>
          <Text style={styles.pricePrefix}>₹</Text>
          <TextInput
            style={styles.itemPriceInput}
            value={priceText}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            onFocus={() => {
              priceFocusedRef.current = true;
            }}
            onChangeText={(v) => {
              if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
              setPriceText(v);
              if (v === "" || v === ".") {
                onChange(item.id, { price: 0 });
                return;
              }
              const parsed = parseFloat(v);
              if (Number.isFinite(parsed) && parsed > 0) {
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
      <View style={styles.colAction}>
        <Pressable onPress={() => onDelete(item.id)} hitSlop={8}>
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  highlight = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  highlight?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <View style={[styles.billField, styles.totalsField]}>
      <Text style={[styles.billLabel, highlight && styles.billLabelHighlight]}>
        {label}
      </Text>
      <View style={[styles.numberInputRow, highlight && styles.numberInputHighlight]}>
        <Text style={[styles.pricePrefix, highlight && styles.pricePrefixGold]}>₹</Text>
        <TextInput
          style={[styles.numberInput, highlight && styles.numberInputTextHighlight]}
          value={text}
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
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.gold}
        />
      </View>
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: "500",
  },
  savingText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  billCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  metaGrid: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  billField: {
    gap: spacing.xs,
    flex: 1,
  },
  billLabel: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  billLabelHighlight: {
    color: colors.gold,
    fontWeight: "600",
  },
  billInput: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  addLink: {
    color: colors.goldLight,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  addPlus: {
    fontSize: fontSize.md,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colItem: {
    flex: 6,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  colQty: {
    flex: 2,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  colAmount: {
    flex: 3,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  colAction: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  itemColumnHeaderText: {
    color: colors.goldTextMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "500",
  },
  itemList: {
    borderTopWidth: 0,
  },
  qtyInput: {
    textAlign: "center",
  },
  itemPriceInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
    minHeight: 0,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    minHeight: 40,
    width: "100%",
  },
  pricePrefix: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  pricePrefixGold: {
    color: colors.gold,
  },
  deleteText: {
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: 24,
    textAlign: "center",
  },
  totalsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  totalsField: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 140,
  },
  numberInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: "transparent",
  },
  numberInputHighlight: {
    borderColor: colors.borderStrong,
  },
  numberInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  numberInputTextHighlight: {
    fontWeight: "600",
    color: colors.goldLight,
  },
  premiumCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldMuted,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  itemsTotalLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  shareFields: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  saveWarn: {
    color: colors.gold,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  actions: {
    marginTop: spacing.sm,
  },
});
