import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import {
  calculatePersonShare,
  getItemUnitPrice,
  getMyQuantity,
  getTotalClaimedForItem,
  getUnclaimedUnitsCount,
} from "@zaptab/shared";
import type { Bill, BillItem } from "../api/bills";
import type { Participant, Room } from "../api/rooms";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { getBillForShare } from "../lib/payments";
import { colors, fontSize, radius, spacing } from "../theme";

interface ItemSelectionListProps {
  bill: Bill;
  selections: Room["selections"];
  participants: Participant[];
  myGuestId: string | null;
  onSetQuantity: (itemId: string, quantity: number) => void;
  updatingItemId: string | null;
}

function mergePendingSelections(
  selections: Room["selections"],
  pendingQty: Record<string, number>,
  guestId: string
): Room["selections"] {
  if (Object.keys(pendingQty).length === 0) return selections;

  const merged = { ...selections };
  for (const [itemId, quantity] of Object.entries(pendingQty)) {
    const entry = { ...(merged[itemId] ?? {}) };
    if (quantity <= 0) {
      delete entry[guestId];
    } else {
      entry[guestId] = quantity;
    }
    if (Object.keys(entry).length === 0) {
      delete merged[itemId];
    } else {
      merged[itemId] = entry;
    }
  }
  return merged;
}

function QuantityStepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        disabled={disabled || value <= min}
        onPress={() => onChange(value - 1)}
        style={[styles.stepBtn, (disabled || value <= min) && styles.stepBtnDisabled]}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        disabled={disabled || value >= max}
        onPress={() => onChange(value + 1)}
        style={[styles.stepBtn, (disabled || value >= max) && styles.stepBtnDisabled]}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

export default function ItemSelectionList({
  bill,
  selections,
  participants,
  myGuestId,
  onSetQuantity,
  updatingItemId,
}: ItemSelectionListProps) {
  const [pendingQty, setPendingQty] = useState<Record<string, number>>({});
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const applySearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value.trim().toLowerCase());
  }, 300);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return bill.items;
    return bill.items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery)
    );
  }, [bill.items, searchQuery]);

  const displaySelections = useMemo(
    () =>
      myGuestId
        ? mergePendingSelections(selections, pendingQty, myGuestId)
        : selections,
    [selections, pendingQty, myGuestId]
  );

  useEffect(() => {
    if (!myGuestId) return;
    setPendingQty((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const itemId of Object.keys(prev)) {
        const serverQty = getMyQuantity(selections, itemId, myGuestId);
        if (serverQty === prev[itemId]) {
          delete next[itemId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selections, myGuestId]);

  function handleSetQuantity(itemId: string, quantity: number) {
    setPendingQty((prev) => ({ ...prev, [itemId]: quantity }));
    onSetQuantity(itemId, quantity);
  }

  const billForShare = getBillForShare(bill);

  const myShare = myGuestId
    ? calculatePersonShare(billForShare, displaySelections, myGuestId)
    : null;

  const unclaimedUnits = getUnclaimedUnitsCount(billForShare, displaySelections);
  const participantByGuestId = useMemo(
    () => new Map(participants.map((p) => [p.guestId, p])),
    [participants]
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Tap what you had</Text>
          {unclaimedUnits > 0 ? (
            <Text style={styles.unclaimed}>{unclaimedUnits} unclaimed</Text>
          ) : null}
        </View>
        <View style={styles.searchWrap}>
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textMuted}
            strokeWidth={2}
            strokeLinecap="round"
            style={styles.searchIcon}
          >
            <Circle cx="11" cy="11" r="7" />
            <Path d="M20 20l-4-4" />
          </Svg>
          <TextInput
            value={searchInput}
            onChangeText={(value) => {
              setSearchInput(value);
              applySearch(value);
            }}
            placeholder="Search dishes..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.list}>
        {filteredItems.length === 0 ? (
          <Text style={styles.emptySearch}>
            {searchQuery
              ? `No items match "${searchInput.trim()}"`
              : "No items on this bill."}
          </Text>
        ) : null}
        {filteredItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            selections={displaySelections}
            myGuestId={myGuestId}
            participantByGuestId={participantByGuestId}
            isUpdating={updatingItemId === item.id}
            onSetQuantity={handleSetQuantity}
          />
        ))}
      </View>

      {myShare ? (
        <View style={styles.shareBox}>
          <View style={styles.shareTop}>
            <Text style={styles.shareLabel}>Your share</Text>
            <Text style={styles.shareValue}>₹{myShare.total.toFixed(2)}</Text>
          </View>
          <Text style={styles.shareMeta}>
            Items ₹{myShare.itemsTotal.toFixed(2)}
            {myShare.tax > 0 ? ` · Tax ₹${myShare.tax.toFixed(2)}` : ""}
            {myShare.serviceCharge > 0
              ? ` · Service ₹${myShare.serviceCharge.toFixed(2)}`
              : ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const ItemRow = memo(function ItemRow({
  item,
  selections,
  myGuestId,
  participantByGuestId,
  isUpdating,
  onSetQuantity,
}: {
  item: BillItem;
  selections: Room["selections"];
  myGuestId: string | null;
  participantByGuestId: Map<string, Participant>;
  isUpdating: boolean;
  onSetQuantity: (itemId: string, quantity: number) => void;
}) {
  const myQty = myGuestId ? getMyQuantity(selections, item.id, myGuestId) : 0;
  const totalClaimed = getTotalClaimedForItem(selections, item.id);
  const remaining = item.quantity - totalClaimed;
  const maxForMe = myQty + remaining;
  const unitPrice = getItemUnitPrice(item);
  const isMultiQty = item.quantity > 1;
  const isFullyTaken = myQty === 0 && remaining === 0;
  const canToggle = !!myGuestId && !isFullyTaken;
  const claims = selections[item.id];
  const isSelected = myQty > 0;

  function handleToggle() {
    if (!canToggle) return;
    onSetQuantity(item.id, myQty > 0 ? 0 : 1);
  }

  return (
    <Pressable
      onPress={handleToggle}
      disabled={!canToggle}
      style={[
        styles.itemRow,
        isSelected && styles.itemRowSelected,
        isMultiQty && isSelected && styles.itemRowMulti,
      ]}
    >
      <Pressable
        onPress={handleToggle}
        disabled={!canToggle}
        style={[styles.checkbox, isSelected && styles.checkboxChecked]}
        hitSlop={4}
      >
        {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>

      <View style={styles.itemBody}>
        <View style={styles.itemTitleRow}>
          <View style={styles.itemNameWrap}>
            <Text
              style={[
                styles.itemName,
                !canToggle && !isSelected && styles.itemNameMuted,
              ]}
            >
              {isMultiQty ? (
                <Text style={styles.itemQtyPrefix}>{item.quantity}× </Text>
              ) : null}
              {item.name}
            </Text>
            {claims ? (
              <View style={styles.badges}>
                {Object.entries(claims).map(([guestId, qty]) => {
                  const person = participantByGuestId.get(guestId);
                  if (!person || qty <= 0) return null;
                  const isMine = guestId === myGuestId;
                  return (
                    <View
                      key={guestId}
                      style={[
                        styles.badge,
                        isMine ? styles.badgeMine : styles.badgeOther,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isMine ? styles.badgeTextMine : styles.badgeTextOther,
                        ]}
                      >
                        {person.name}
                        {qty > 1 || item.quantity > 1 ? ` ×${qty}` : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
          <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
        </View>

        {isMultiQty && isSelected ? (
          <View
            style={styles.multiQtyRow}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.multiQtyLabel}>You had</Text>
            <QuantityStepper
              value={myQty}
              min={0}
              max={maxForMe}
              disabled={isUpdating || !myGuestId}
              onChange={(qty) => onSetQuantity(item.id, qty)}
            />
            <Text style={styles.unitHint}>· ₹{unitPrice.toFixed(2)} each</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  unclaimed: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xs,
  },
  emptySearch: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  list: {},
  itemRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
    alignItems: "center",
  },
  itemRowSelected: {
    backgroundColor: colors.successMuted,
    borderLeftColor: colors.success,
  },
  itemRowMulti: {
    alignItems: "flex-start",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  itemBody: {
    flex: 1,
    gap: spacing.sm,
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  itemNameWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  itemQtyPrefix: {
    color: colors.textMuted,
  },
  itemNameMuted: {
    color: colors.textMuted,
  },
  itemPrice: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flexShrink: 0,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMine: {
    backgroundColor: colors.successMutedStrong,
  },
  badgeOther: {
    backgroundColor: colors.goldMuted,
  },
  badgeText: {
    fontSize: fontSize.xs,
  },
  badgeTextMine: {
    color: colors.success,
  },
  badgeTextOther: {
    color: colors.goldLight,
  },
  multiQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
    paddingTop: spacing.xs,
  },
  multiQtyLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  unitHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  stepValue: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "600",
    minWidth: 16,
    textAlign: "center",
  },
  shareBox: {
    backgroundColor: colors.successMuted,
    borderTopWidth: 1,
    borderTopColor: colors.successBorder,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  shareTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shareLabel: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  shareValue: {
    color: colors.success,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  shareMeta: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
  },
});
