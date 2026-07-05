import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import {
  calculatePersonShare,
  getItemUnitPrice,
  getMyQuantity,
  getTotalClaimedForItem,
  getUnclaimedUnitsCount,
} from "@splitsnap/shared";
import Card from "./Card";
import type { Bill, BillItem } from "../api/bills";
import type { Participant, Room } from "../api/rooms";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { colors, fontSize, radius, spacing } from "../theme";

interface ItemSelectionListProps {
  bill: Bill;
  selections: Room["selections"];
  participants: Participant[];
  myGuestId: string | null;
  onSetQuantity: (itemId: string, quantity: number) => void;
  updatingItemId: string | null;
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

  const billForShare = {
    items: bill.items.map((i) => ({
      id: i.id,
      price: i.price,
      quantity: i.quantity,
    })),
    subtotal: bill.subtotal,
    tax: bill.tax,
    serviceCharge: bill.serviceCharge,
  };

  const myShare = myGuestId
    ? calculatePersonShare(billForShare, selections, myGuestId)
    : null;

  const unclaimedUnits = getUnclaimedUnitsCount(billForShare, selections);
  const participantByGuestId = new Map(participants.map((p) => [p.guestId, p]));

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
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
            selections={selections}
            myGuestId={myGuestId}
            participantByGuestId={participantByGuestId}
            isUpdating={updatingItemId === item.id}
            onSetQuantity={onSetQuantity}
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
    </Card>
  );
}

function ItemRow({
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

  function handleToggle() {
    if (!canToggle) return;
    onSetQuantity(item.id, myQty > 0 ? 0 : 1);
  }

  return (
    <Pressable
      onPress={handleToggle}
      disabled={!canToggle}
      style={[styles.itemRow, myQty > 0 && styles.itemRowSelected]}
    >
      <Pressable
        onPress={handleToggle}
        disabled={!canToggle}
        style={[styles.checkbox, myQty > 0 && styles.checkboxChecked]}
      >
        {myQty > 0 ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>

      <View style={styles.itemBody}>
        <View style={styles.itemTitleRow}>
          <Text style={[styles.itemName, !canToggle && myQty === 0 && styles.itemNameMuted]}>
            {isMultiQty ? `${item.quantity}× ` : ""}
            {item.name}
          </Text>
          <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
        </View>

        {claims ? (
          <View style={styles.badges}>
            {Object.entries(claims).map(([guestId, qty]) => {
              const person = participantByGuestId.get(guestId);
              if (!person || qty <= 0) return null;
              const isMine = guestId === myGuestId;
              return (
                <View
                  key={guestId}
                  style={[styles.badge, isMine ? styles.badgeMine : styles.badgeOther]}
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

        {isMultiQty && myQty > 0 ? (
          <View style={styles.multiQtyRow}>
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
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  list: {
    borderTopWidth: 0,
  },
  itemRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemRowSelected: {
    backgroundColor: colors.successMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "700",
  },
  itemBody: {
    flex: 1,
    gap: spacing.sm,
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  itemName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  itemNameMuted: {
    color: colors.textMuted,
  },
  itemPrice: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
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
    fontSize: fontSize.sm,
    fontWeight: "600",
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
