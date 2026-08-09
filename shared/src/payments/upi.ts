const UPI_ID_PATTERN = /^[a-z0-9._-]+@[a-z0-9]+$/i;

export function normalizeUpiId(upiId: string): string {
  return upiId.trim().toLowerCase();
}

export function isValidUpiId(upiId: string): boolean {
  return UPI_ID_PATTERN.test(normalizeUpiId(upiId));
}

export function buildUpiIntentUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
}): string {
  if (params.amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  const pa = encodeURIComponent(normalizeUpiId(params.upiId));
  const pn = encodeURIComponent(params.payeeName.trim().slice(0, 50));
  const am = params.amount.toFixed(2);
  const tn = encodeURIComponent((params.note ?? "ZapTab").trim().slice(0, 50));

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}
