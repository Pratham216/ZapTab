export interface BillForShare {
  items: { id: string; price: number; quantity: number }[];
  subtotal?: number;
  tax: number;
  serviceCharge: number;
  cgst?: number;
  sgst?: number;
  vat?: number;
  otherTax?: number;
  grandTotal?: number;
}

/** itemId → { guestId → quantity claimed } */
export type ItemClaims = Record<string, number>;
export type SelectionsMap = Record<string, ItemClaims>;

export interface ShareBreakdown {
  itemsTotal: number;
  tax: number;
  cgst: number;
  sgst: number;
  vat: number;
  otherTax: number;
  serviceCharge: number;
  total: number;
  ratio: number;
}

export function roundMoney(val: number): number {
  return Math.round(val * 100) / 100;
}

export function getTotalTaxForBill(bill: {
  tax?: number;
  cgst?: number;
  sgst?: number;
  vat?: number;
  otherTax?: number;
}): number {
  const cgst = bill.cgst ?? 0;
  const sgst = bill.sgst ?? 0;
  const vat = bill.vat ?? 0;
  const otherTax = bill.otherTax ?? 0;
  const itemTaxSum = roundMoney(cgst + sgst + vat + otherTax);
  return itemTaxSum > 0 ? itemTaxSum : (bill.tax ?? 0);
}

export function getItemUnitPrice(item: { price: number; quantity: number }): number {
  return item.quantity > 0 ? item.price / item.quantity : item.price;
}

export function getTotalClaimedForItem(
  selections: SelectionsMap,
  itemId: string
): number {
  const claims = selections[itemId];
  if (!claims) return 0;
  return Object.values(claims).reduce((sum, qty) => sum + qty, 0);
}

export function getMyQuantity(
  selections: SelectionsMap,
  itemId: string,
  guestId: string
): number {
  return selections[itemId]?.[guestId] ?? 0;
}

export function calculatePersonShare(
  bill: BillForShare,
  selections: SelectionsMap,
  guestId: string
): ShareBreakdown {
  const itemsTotal = bill.items.reduce((sum, item) => sum + item.price, 0);
  const subtotal = bill.subtotal ?? itemsTotal;

  const myItemsTotal = bill.items.reduce((sum, item) => {
    const myQty = getMyQuantity(selections, item.id, guestId);
    return sum + getItemUnitPrice(item) * myQty;
  }, 0);

  const ratio = subtotal > 0 ? myItemsTotal / subtotal : 0;

  const hasGranularTax =
    (bill.cgst ?? 0) > 0 ||
    (bill.sgst ?? 0) > 0 ||
    (bill.vat ?? 0) > 0 ||
    (bill.otherTax ?? 0) > 0;

  let cgst = 0;
  let sgst = 0;
  let vat = 0;
  let otherTax = 0;
  let tax = 0;

  if (hasGranularTax) {
    cgst = roundMoney((bill.cgst ?? 0) * ratio);
    sgst = roundMoney((bill.sgst ?? 0) * ratio);
    vat = roundMoney((bill.vat ?? 0) * ratio);
    otherTax = roundMoney((bill.otherTax ?? 0) * ratio);
    tax = roundMoney(cgst + sgst + vat + otherTax);
  } else {
    tax = roundMoney((bill.tax ?? 0) * ratio);
  }

  const serviceCharge = roundMoney((bill.serviceCharge ?? 0) * ratio);
  const roundedItemsTotal = roundMoney(myItemsTotal);
  const total = roundMoney(roundedItemsTotal + tax + serviceCharge);

  return {
    itemsTotal: roundedItemsTotal,
    tax,
    cgst,
    sgst,
    vat,
    otherTax,
    serviceCharge,
    total,
    ratio,
  };
}

export function calculateRoomShares(
  bill: BillForShare,
  selections: SelectionsMap,
  guestIds: string[]
): Record<string, ShareBreakdown> {
  const results: Record<string, ShareBreakdown> = {};
  if (guestIds.length === 0) return results;

  const itemsTotal = bill.items.reduce((sum, item) => sum + item.price, 0);
  const subtotal = bill.subtotal ?? itemsTotal;
  const totalTax = getTotalTaxForBill(bill);
  const targetGrandTotal = bill.grandTotal ?? roundMoney(subtotal + totalTax + (bill.serviceCharge ?? 0));
  const targetGrandTotalPaise = Math.round(targetGrandTotal * 100);

  for (const guestId of guestIds) {
    results[guestId] = calculatePersonShare(bill, selections, guestId);
  }

  const allItemsClaimed = bill.items.every((item) => {
    const totalClaimed = getTotalClaimedForItem(selections, item.id);
    return totalClaimed === item.quantity;
  });

  if (allItemsClaimed) {
    const sumPaise = guestIds.reduce(
      (sum, id) => sum + Math.round(results[id].total * 100),
      0
    );

    const diffPaise = targetGrandTotalPaise - sumPaise;
    if (diffPaise !== 0 && Math.abs(diffPaise) <= 5) {
      let maxId = guestIds[0];
      let maxTotal = results[maxId].total;
      for (const id of guestIds) {
        if (results[id].total > maxTotal) {
          maxTotal = results[id].total;
          maxId = id;
        }
      }
      const adjustedTotalPaise = Math.round(results[maxId].total * 100) + diffPaise;
      results[maxId] = {
        ...results[maxId],
        total: roundMoney(adjustedTotalPaise / 100),
      };
    }
  }

  return results;
}

export function getUnclaimedUnitsCount(
  bill: BillForShare,
  selections: SelectionsMap
): number {
  return bill.items.reduce((count, item) => {
    const claimed = getTotalClaimedForItem(selections, item.id);
    return count + Math.max(0, item.quantity - claimed);
  }, 0);
}
