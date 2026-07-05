import { File as ExpoFile, UploadType } from "expo-file-system";
import { apiRequest } from "../lib/api";
import { ensureGuestSession } from "../lib/auth";
import { getApiUrl } from "../lib/config";

export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Bill {
  id: string;
  restaurantName: string;
  billDate: string;
  items: BillItem[];
  subtotal?: number;
  tax: number;
  serviceCharge: number;
  grandTotal?: number;
  status: "uploading" | "processing" | "parsed" | "failed";
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PickedReceiptAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: globalThis.File;
}

function receiptMimeType(asset: PickedReceiptAsset): string {
  return asset.mimeType ?? "image/jpeg";
}

function parseUploadError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // ignore malformed JSON
  }
  return `Upload failed: ${status}`;
}

export async function uploadBillImage(
  asset: PickedReceiptAsset
): Promise<{ id: string; status: Bill["status"] }> {
  const session = await ensureGuestSession();
  const mimeType = receiptMimeType(asset);
  const uploadUrl = `${getApiUrl()}/bills/upload`;

  if (asset.file) {
    const formData = new FormData();
    formData.append("file", asset.file);
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(parseUploadError(res.status, body));
    }
    return res.json();
  }

  const file = new ExpoFile(asset.uri);
  const result = await file.upload(uploadUrl, {
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    headers: {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/json",
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(parseUploadError(result.status, result.body));
  }

  return JSON.parse(result.body) as { id: string; status: Bill["status"] };
}

export async function getBill(id: string): Promise<Bill> {
  return apiRequest<Bill>(`/bills/${id}`);
}

export async function getBillStatus(id: string): Promise<{
  status: Bill["status"];
  errorMessage?: string;
}> {
  return apiRequest(`/bills/${id}/status`);
}

export async function retryBill(
  id: string
): Promise<{ id: string; status: Bill["status"] }> {
  return apiRequest(`/bills/${id}/retry`, { method: "POST" });
}

export async function updateBill(
  id: string,
  data: Partial<
    Pick<
      Bill,
      "restaurantName" | "billDate" | "tax" | "serviceCharge" | "subtotal" | "grandTotal"
    >
  >
): Promise<Bill> {
  return apiRequest<Bill>(`/bills/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function addBillItem(
  billId: string,
  item: { name: string; price: number; quantity?: number }
): Promise<Bill> {
  return apiRequest(`/bills/${billId}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function updateBillItem(
  billId: string,
  itemId: string,
  data: Partial<Pick<BillItem, "name" | "price" | "quantity">>
): Promise<Bill> {
  return apiRequest(`/bills/${billId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteBillItem(billId: string, itemId: string): Promise<Bill> {
  return apiRequest(`/bills/${billId}/items/${itemId}`, { method: "DELETE" });
}
