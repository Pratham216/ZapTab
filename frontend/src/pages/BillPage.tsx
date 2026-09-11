import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBill,
  getBillStatus,
  updateBill,
  addBillItem,
  updateBillItem,
  deleteBillItem,
  retryBill,
  type Bill,
  type BillItem,
} from "../api/bills";
import { createRoom } from "../api/rooms";
import { getCurrentUser } from "../api/users";
import { recalcBillFromItems, recalcGrandTotal, sumItemPrices, applyItemFieldUpdate, getTotalTax } from "../lib/billTotals";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import AnimatedEllipsis from "../components/AnimatedEllipsis";
import { trackEvent } from "../lib/analytics";

export default function BillPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(true);

  const { data: status } = useQuery({
    queryKey: ["bill-status", id],
    queryFn: () => getBillStatus(id!),
    enabled: !!id && polling,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "processing" || s === "uploading" ? 1500 : false;
    },
  });

  useEffect(() => {
    if (status?.status === "parsed" || status?.status === "failed") {
      setPolling(false);
      queryClient.invalidateQueries({ queryKey: ["bill", id] });
    }
  }, [status, id, queryClient]);

  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => getBill(id!),
    enabled: !!id,
  });

  if (!id) return null;

  if (isLoading && !bill) {
    return <LoadingState />;
  }

  if (status?.status === "processing" || status?.status === "uploading") {
    return <ProcessingState />;
  }

  if (status?.status === "failed" || bill?.status === "failed") {
    return (
      <FailedState
        message={bill?.errorMessage || status?.errorMessage}
        onRetry={async () => {
          await retryBill(id);
          setPolling(true);
          queryClient.invalidateQueries({ queryKey: ["bill-status", id] });
        }}
      />
    );
  }

  if (!bill || bill.status !== "parsed") {
    return <ProcessingState />;
  }

  return <BillEditor key={bill.id} bill={bill} />;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-neutral-400">Loading bill...</p>
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-amber-500/10" />
        <span className="absolute inset-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <svg
          className="h-7 w-7 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      </span>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-neutral-100">
          Analyzing your bill
          <AnimatedEllipsis />
        </h2>
        <p className="text-neutral-400 text-sm max-w-xs">
          We're reading the receipt and itemizing everything. This only takes a
          few seconds.
        </p>
      </div>
    </div>
  );
}

function FailedState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center space-y-4">
      <h2 className="text-lg font-semibold text-red-300">Processing failed</h2>
      <p className="text-sm text-red-200/80">{message || "Something went wrong."}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm"
      >
        Retry
      </button>
    </div>
  );
}

function billsMatchForSave(a: Bill, b: Bill): boolean {
  if (
    a.restaurantName !== b.restaurantName ||
    a.billDate !== b.billDate ||
    a.tax !== b.tax ||
    a.serviceCharge !== b.serviceCharge ||
    a.cgst !== b.cgst ||
    a.sgst !== b.sgst ||
    a.vat !== b.vat ||
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
  if (serverBill.cgst !== draft.cgst) billPatch.cgst = draft.cgst;
  if (serverBill.sgst !== draft.sgst) billPatch.sgst = draft.sgst;
  if (serverBill.vat !== draft.vat) billPatch.vat = draft.vat;
  if (serverBill.subtotal !== draft.subtotal) billPatch.subtotal = draft.subtotal;
  if (serverBill.grandTotal !== draft.grandTotal) {
    billPatch.grandTotal = draft.grandTotal;
  }

  if (Object.keys(billPatch).length > 0) {
    serverBill = await updateBill(serverBill.id, billPatch);
  }

  return serverBill;
}

function BillEditor({ bill: initialBill }: { bill: Bill }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = initialBill.id;
  const [draft, setDraft] = useState(initialBill);
  const [hostName, setHostName] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (currentUser?.name && !hostName) {
      setHostName(currentUser.name);
    }
  }, [currentUser?.name, hostName]);

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
    setSaveError(null);

    try {
      const serverBill = await persistBillToServer(lastSavedRef.current, snapshot);
      lastSavedRef.current = serverBill;

      if (billsMatchForSave(draftRef.current, snapshot)) {
        dirtyRef.current = false;
        setDraft(serverBill);
        queryClient.setQueryData(["bill", id], serverBill);
      } else {
        scheduleSave();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      savingRef.current = false;
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
        | "restaurantName"
        | "billDate"
        | "tax"
        | "serviceCharge"
        | "subtotal"
        | "grandTotal"
        | "cgst"
        | "sgst"
        | "vat"
      >
    >
  ) {
    updateDraft((current) => recalcGrandTotal({ ...current, ...fields }));
  }

  async function handleAddItem() {
    try {
      const serverBill = await addBillItem(id, {
        name: "",
        price: 0,
        quantity: 1,
      });
      lastSavedRef.current = serverBill;
      dirtyRef.current = false;
      setDraft(recalcBillFromItems(serverBill));
      queryClient.setQueryData(["bill", id], serverBill);
      const newItem = serverBill.items.at(-1);
      if (newItem) setFocusItemId(newItem.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to add item");
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const serverBill = await deleteBillItem(id, itemId);
      lastSavedRef.current = serverBill;
      dirtyRef.current = false;
      setDraft(recalcBillFromItems(serverBill));
      queryClient.setQueryData(["bill", id], serverBill);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  const itemsTotal = sumItemPrices(draft.items);
  const displaySubtotal = draft.subtotal ?? itemsTotal;
  const displayTotalTax = getTotalTax(draft);
  const displayGrandTotal =
    draft.grandTotal ?? Math.round((displaySubtotal + displayTotalTax + draft.serviceCharge) * 100) / 100;

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
      const room = await createRoom(id, hostName.trim());
      trackEvent("room_created", { code: room.code, hostName: hostName.trim() });
      navigate(`/room/${room.code}`);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  }

  const receiptSubtotal = draft.receiptSubtotal ?? draft.subtotal ?? 0;
  const subtotalMismatch = receiptSubtotal > 0 && Math.abs(receiptSubtotal - itemsTotal) > 0.5;
  const showVerification = draft.requiresVerification || !draft.isItemSubtotalValid || subtotalMismatch;
  const mismatchDiff = Math.abs(receiptSubtotal - itemsTotal);

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-brand">
          Review your bill
        </h2>
        <p className="bill-subtitle">
          Fix any mistakes before sharing with friends.
        </p>
      </div>

      {showVerification && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-amber-200 space-y-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-lg">
              ⚠️
            </span>
            <div>
              <h4 className="font-semibold text-amber-100 text-base">Receipt needs verification</h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Extracted item subtotal (₹{itemsTotal.toFixed(2)}) does not match receipt subtotal (₹{receiptSubtotal.toFixed(2)}).
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-neutral-950/60 p-3.5 border border-amber-500/20 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-neutral-400">Extracted items total:</span>
              <span className="text-amber-200 font-semibold">₹{itemsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Receipt subtotal:</span>
              <span className="text-amber-200 font-semibold">₹{receiptSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-800 pt-1.5 text-amber-400 font-bold">
              <span>Difference (Possible missing item):</span>
              <span>₹{mismatchDiff.toFixed(2)}</span>
            </div>
          </div>

          {draft.validationWarnings && draft.validationWarnings.length > 0 && (
            <div className="space-y-1 text-xs text-amber-300/90 pl-1">
              {draft.validationWarnings.map((w, i) => (
                <p key={i}>• {w}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-neutral-400">
            Please check the line items below and add any missing items before creating the room.
          </p>
        </div>
      )}

      <div className="bill-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Restaurant"
            value={draft.restaurantName}
            onChange={(v) => handleBillFieldChange({ restaurantName: v })}
          />
          <Field
            label="Date"
            value={draft.billDate}
            onChange={(v) => handleBillFieldChange({ billDate: v })}
          />
        </div>
      </div>

      <div className="bill-card">
        <div className="bill-card-header">
          <h3 className="font-semibold text-neutral-100">Items</h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors"
          >
            <span className="text-base leading-none">+</span> Add item
          </button>
        </div>

        <div className="bill-col-header">
          <span className="col-span-6">Item</span>
          <span className="col-span-2">Qty</span>
          <span className="col-span-3">Amount</span>
          <span className="col-span-1" />
        </div>

        <div className="divide-y divide-neutral-800">
          {draft.items.length === 0 && (
            <p className="px-4 py-6 text-sm text-neutral-500 text-center">
              No items extracted. Add items manually.
            </p>
          )}
          {draft.items.map((item) => (
            <BillItemRow
              key={item.id}
              item={item}
              onChange={handleItemChange}
              onDelete={handleDeleteItem}
              autoFocusName={focusItemId === item.id}
              onNameFocused={() => setFocusItemId(null)}
            />
          ))}
        </div>
      </div>

      <div className="bill-totals-card">
        <NumberField
          label="Service charge"
          value={draft.serviceCharge}
          onChange={(v) => handleBillFieldChange({ serviceCharge: v })}
        />

        {(draft.cgst !== undefined && draft.cgst > 0) ||
        (draft.sgst !== undefined && draft.sgst > 0) ||
        (draft.vat !== undefined && draft.vat > 0) ? (
          <>
            {draft.cgst !== undefined && (
              <NumberField
                label="CGST"
                value={draft.cgst}
                onChange={(v) =>
                  handleBillFieldChange({
                    cgst: v,
                    tax: (v || 0) + (draft.sgst || 0) + (draft.vat || 0),
                  })
                }
              />
            )}
            {draft.sgst !== undefined && (
              <NumberField
                label="SGST"
                value={draft.sgst}
                onChange={(v) =>
                  handleBillFieldChange({
                    sgst: v,
                    tax: (draft.cgst || 0) + (v || 0) + (draft.vat || 0),
                  })
                }
              />
            )}
            {draft.vat !== undefined && (
              <NumberField
                label="VAT"
                value={draft.vat}
                onChange={(v) =>
                  handleBillFieldChange({
                    vat: v,
                    tax: (draft.cgst || 0) + (draft.sgst || 0) + (v || 0),
                  })
                }
              />
            )}
            <NumberField
              label="Total Tax"
              value={displayTotalTax}
              onChange={(v) => handleBillFieldChange({ tax: v })}
            />
          </>
        ) : (
          <NumberField
            label="Tax (GST)"
            value={displayTotalTax}
            onChange={(v) => handleBillFieldChange({ tax: v })}
          />
        )}

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
      </div>

      <div className="card-premium p-5 space-y-5">
        <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-neutral-100">
            Items total
          </p>
          <p className="text-3xl font-bold text-brand">
            ₹{itemsTotal.toFixed(2)}
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 input-field"
            placeholder="Your name (host)"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
          {currentUser?.upiId && (
            <div className="flex-1 input-field font-mono text-neutral-300 flex items-center">
              {currentUser.upiId}
            </div>
          )}
          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={creatingRoom}
            className="btn-primary-shimmer px-5 py-2.5 text-sm whitespace-nowrap sm:w-auto w-full"
          >
            {creatingRoom ? "Creating..." : "Create room & share"}
          </button>
        </div>

        {roomError && <p className="relative text-sm text-red-300">{roomError}</p>}
        {saveError && <p className="relative text-sm text-amber-300">{saveError}</p>}
      </div>
    </div>
  );
}

function BillItemRow({
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
  const [qtyText, setQtyText] = useState(String(item.quantity));
  const [priceText, setPriceText] = useState(String(item.price));
  const priceFocusedRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocusName) return;
    nameInputRef.current?.focus();
    onNameFocused?.();
  }, [autoFocusName, onNameFocused]);

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
    <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
      <input
        ref={nameInputRef}
        className="col-span-6 bill-input"
        value={item.name}
        placeholder="Item name"
        onChange={(e) => onChange(item.id, { name: e.target.value })}
      />
      <input
        type="text"
        inputMode="numeric"
        className="col-span-2 bill-input"
        value={qtyText}
        onChange={(e) => {
          setQtyText(e.target.value);
          const parsed = parseInt(e.target.value, 10);
          if (Number.isFinite(parsed) && parsed >= 1) {
            applyQuantity(parsed);
          }
        }}
        onBlur={() => commitQty(qtyText)}
      />
      <div className="col-span-3 flex items-center gap-1">
        <span className="bill-rupee">₹</span>
        <input
          type="text"
          inputMode="decimal"
          className="w-full bill-input"
          value={priceText}
          onFocus={() => {
            priceFocusedRef.current = true;
          }}
          onChange={(e) => {
            setPriceText(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (Number.isFinite(parsed) && parsed >= 0) {
              onChange(item.id, { price: parsed });
            }
          }}
          onBlur={() => {
            priceFocusedRef.current = false;
            commitPrice(priceText);
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="col-span-1 text-neutral-500 hover:text-red-400 text-lg transition-colors"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="bill-label">{label}</span>
      <input
        className="w-full bill-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
    <label className="block space-y-1.5">
      <span className={highlight ? "text-xs font-semibold uppercase tracking-wider text-amber-300" : "bill-label"}>
        {label}
      </span>
      <div
        className={`flex items-center gap-1.5 border rounded-xl px-3 py-2.5 transition shadow-sm shadow-black/20 focus-within:border-amber-400/60 focus-within:ring-1 focus-within:ring-amber-400/30 ${
          highlight
            ? "bill-total-highlight"
            : "bg-transparent border-neutral-700"
        }`}
      >
        <span className="bill-rupee">₹</span>
        <input
          type="text"
          inputMode="decimal"
          className={`w-full bg-transparent text-sm outline-none ${
            highlight ? "font-semibold text-amber-100" : "text-neutral-100"
          }`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const parsed = parseFloat(e.target.value);
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
      </div>
    </label>
  );
}
