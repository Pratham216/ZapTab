export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unitPrice?: number;
}

export interface Bill {
  id: string;
  restaurantName: string;
  billDate: string;
  items: BillItem[];
  subtotal?: number;
  tax: number;
  serviceCharge: number;
  cgst?: number;
  sgst?: number;
  vat?: number;
  otherTax?: number;
  discount?: number;
  tip?: number;
  grandTotal?: number;
  receiptSubtotal?: number;
  calculatedItemSubtotal?: number;
  printedBillTotal?: number;
  roundedPayableTotal?: number;
  isItemSubtotalValid?: boolean;
  requiresVerification?: boolean;
  validationWarnings?: string[];
  status: "uploading" | "processing" | "parsed" | "failed";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function uploadBill(file: File): Promise<{ id: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return request("/bills/upload", { method: "POST", body: formData });
}

export async function getBill(id: string): Promise<Bill> {
  return request(`/bills/${id}`);
}

export async function getBillStatus(id: string): Promise<{
  status: Bill["status"];
  errorMessage?: string;
}> {
  return request(`/bills/${id}/status`);
}

export async function updateBill(
  id: string,
  data: Partial<
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
): Promise<Bill> {
  return request(`/bills/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function addBillItem(
  billId: string,
  item: { name: string; price: number; quantity?: number }
): Promise<Bill> {
  return request(`/bills/${billId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
}

export async function updateBillItem(
  billId: string,
  itemId: string,
  data: Partial<BillItem>
): Promise<Bill> {
  return request(`/bills/${billId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteBillItem(billId: string, itemId: string): Promise<Bill> {
  return request(`/bills/${billId}/items/${itemId}`, { method: "DELETE" });
}

export async function retryBill(id: string): Promise<{ id: string; status: string }> {
  return request(`/bills/${id}/retry`, { method: "POST" });
}
