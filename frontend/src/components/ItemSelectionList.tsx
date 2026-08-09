import { useEffect, useMemo, useState } from "react";
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

export function applySelectionChange(
  room: Room,
  itemId: string,
  guestId: string,
  quantity: number
): Room {
  const selections = { ...room.selections };
  const entry = { ...(selections[itemId] ?? {}) };

  if (quantity <= 0) {
    delete entry[guestId];
  } else {
    entry[guestId] = quantity;
  }

  if (Object.keys(entry).length === 0) {
    delete selections[itemId];
  } else {
    selections[itemId] = entry;
  }

  return { ...room, selections };
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
  compact,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 ${compact ? "" : "shrink-0"}`}>
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:border-amber-500/40 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:border-amber-500/40 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

function ClaimBadges({
  item,
  selections,
  participants,
  myGuestId,
}: {
  item: BillItem;
  selections: Room["selections"];
  participants: Participant[];
  myGuestId: string | null;
}) {
  const claims = selections[item.id];
  if (!claims) return null;

  const participantByGuestId = new Map(
    participants.map((p) => [p.guestId, p])
  );

  return (
    <>
      {Object.entries(claims).map(([guestId, qty]) => {
        const person = participantByGuestId.get(guestId);
        if (!person || qty <= 0) return null;
        const isMine = guestId === myGuestId;
        return (
          <span
            key={guestId}
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              isMine
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-200"
            }`}
          >
            {person.name}
            {qty > 1 || item.quantity > 1 ? ` ×${qty}` : ""}
          </span>
        );
      })}
    </>
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
    ? calculatePersonShare(billForShare, displaySelections, myGuestId)
    : null;

  const unclaimedUnits = getUnclaimedUnitsCount(billForShare, displaySelections);

  return (
    <div className="rounded-2xl border border-neutral-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-neutral-100">Tap what you had</h3>
          {unclaimedUnits > 0 && (
            <span className="text-xs text-amber-400 shrink-0 font-medium">
              {unclaimedUnits} unclaimed
            </span>
          )}
        </div>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-neutral-500"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              applySearch(e.target.value);
            }}
            placeholder="Search dishes..."
            className="w-full input-field py-2 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="divide-y divide-neutral-800/70">
        {filteredItems.length === 0 && (
          <p className="px-4 py-6 text-sm text-neutral-500 text-center">
            {searchQuery
              ? `No items match "${searchInput.trim()}"`
              : "No items on this bill."}
          </p>
        )}
        {filteredItems.map((item) => {
          const myQty = myGuestId
            ? getMyQuantity(displaySelections, item.id, myGuestId)
            : 0;
          const totalClaimed = getTotalClaimedForItem(displaySelections, item.id);
          const remaining = item.quantity - totalClaimed;
          const maxForMe = myQty + remaining;
          const isStepperBusy = updatingItemId === item.id;
          const unitPrice = getItemUnitPrice(item);
          const isMultiQty = item.quantity > 1;
          const isFullyTaken = myQty === 0 && remaining === 0;
          const canToggle = !!myGuestId && !isFullyTaken;

          function handleToggle() {
            if (!canToggle) return;
            if (myQty > 0) {
              handleSetQuantity(item.id, 0);
            } else {
              handleSetQuantity(item.id, 1);
            }
          }

          return (
            <div
              key={item.id}
              role={canToggle ? "button" : undefined}
              tabIndex={canToggle ? 0 : undefined}
              onClick={canToggle ? handleToggle : undefined}
              onKeyDown={
                canToggle
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle();
                      }
                    }
                  : undefined
              }
              className={`flex gap-3 px-4 py-3 text-sm transition-colors border-l-2 ${
                myQty > 0 && isMultiQty ? "items-start" : "items-center"
              } ${canToggle ? "cursor-pointer" : "cursor-default"} ${
                myQty > 0
                  ? "bg-emerald-500/10 border-emerald-400/50"
                  : "border-transparent"
              }`}
            >
              <div
                className={`shrink-0 ${myQty > 0 && isMultiQty ? "pt-0.5" : ""}`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={myQty > 0}
                  disabled={!canToggle}
                  onChange={(e) =>
                    handleSetQuantity(item.id, e.target.checked ? 1 : 0)
                  }
                  className="w-4 h-4 rounded border-neutral-500 text-emerald-400 focus:ring-emerald-500/30 disabled:opacity-50"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={
                      canToggle || myQty > 0 ? "text-neutral-100" : "text-neutral-400"
                    }
                  >
                    {isMultiQty && (
                      <span className="text-neutral-500">{item.quantity}× </span>
                    )}
                    {item.name}
                  </span>
                  <ClaimBadges
                    item={item}
                    selections={displaySelections}
                    participants={participants}
                    myGuestId={myGuestId}
                  />
                </div>

                {isMultiQty && myQty > 0 && (
                  <div
                    className="flex items-center gap-2 pt-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-neutral-400">You had</span>
                    <QuantityStepper
                      compact
                      value={myQty}
                      min={0}
                      max={maxForMe}
                      disabled={isStepperBusy || !myGuestId}
                      onChange={(qty) => handleSetQuantity(item.id, qty)}
                    />
                    <span className="text-xs text-neutral-500">
                      · ₹{unitPrice.toFixed(2)} each
                    </span>
                  </div>
                )}
              </div>

              <span className="text-neutral-300 shrink-0">
                ₹{item.price.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {myShare && (
        <div className="share-footer px-4 py-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-emerald-300/80">
              Your share
            </span>
            <span className="text-2xl font-bold text-emerald-300">
              ₹{myShare.total.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-neutral-100">
            Items ₹{myShare.itemsTotal.toFixed(2)}
            {myShare.tax > 0 && ` · Tax ₹${myShare.tax.toFixed(2)}`}
            {myShare.serviceCharge > 0 &&
              ` · Service ₹${myShare.serviceCharge.toFixed(2)}`}
          </p>
        </div>
      )}
    </div>
  );
}
