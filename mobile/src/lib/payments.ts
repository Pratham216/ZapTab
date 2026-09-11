import { buildUpiIntentUrl, calculatePersonShare, isValidUpiId } from "@zaptab/shared";
import type { Bill } from "../api/bills";
import type { Room } from "../api/rooms";

export function getBillForShare(bill: Bill) {
  return {
    items: bill.items.map((i) => ({
      id: i.id,
      price: i.price,
      quantity: i.quantity,
    })),
    subtotal: bill.subtotal,
    tax: bill.tax,
    serviceCharge: bill.serviceCharge,
    cgst: bill.cgst,
    sgst: bill.sgst,
    vat: bill.vat,
    otherTax: bill.otherTax,
    grandTotal: bill.grandTotal,
  };
}

export function getMyShare(room: Room, guestId: string | null) {
  if (!guestId || !room.bill) return null;
  return calculatePersonShare(getBillForShare(room.bill), room.selections, guestId);
}

export function getParticipantShare(room: Room, guestId: string) {
  if (!room.bill) return null;
  return calculatePersonShare(getBillForShare(room.bill), room.selections, guestId);
}

export function getHostName(room: Room): string {
  const host = room.participants.find((p) => p.guestId === room.hostGuestId);
  return host?.name ?? "Host";
}

export function buildPaymentUpiUrl(room: Room, amount: number): string | null {
  if (!room.hostUpiId || !isValidUpiId(room.hostUpiId)) return null;
  return buildUpiIntentUrl({
    upiId: room.hostUpiId,
    payeeName: getHostName(room),
    amount,
    note: `ZapTab ${room.code}`,
  });
}
