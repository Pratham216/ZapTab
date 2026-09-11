import type { Bill } from "./bills";
import type { SelectionsMap } from "@zaptab/shared";
import { apiRequest } from "./client";

export interface Participant {
  id: string;
  name: string;
  guestId: string;
  avatarUrl?: string;
  createdAt: string;
  paid?: boolean;
}

export interface Room {
  id: string;
  code: string;
  status: "open" | "closed";
  expiresAt: string;
  joinUrl: string;
  hostGuestId: string;
  hostUpiId: string;
  paidGuestIds: string[];
  selections: SelectionsMap;
  bill: Bill | null;
  participants: Participant[];
}

export async function createRoom(
  billId: string,
  hostName: string,
  hostUpiId?: string
): Promise<Room> {
  return apiRequest("/rooms", {
    method: "POST",
    body: JSON.stringify({ billId, hostName, hostUpiId: hostUpiId?.trim() || undefined }),
  });
}

export async function getRoom(code: string): Promise<Room> {
  return apiRequest(`/rooms/${code}`, {}, false);
}

export async function joinRoom(
  code: string,
  name: string
): Promise<{ room: Room; participant: Participant }> {
  return apiRequest(
    `/rooms/${code}/join`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    "guest"
  );
}

export async function leaveRoom(code: string): Promise<void> {
  await apiRequest(`/rooms/${code}/participants/me`, { method: "DELETE" });
}

export async function setItemSelection(
  code: string,
  itemId: string,
  quantity: number
): Promise<Room> {
  return apiRequest(`/rooms/${code}/selections`, {
    method: "POST",
    body: JSON.stringify({ itemId, quantity }),
  });
}

export async function updateHostUpi(
  code: string,
  hostUpiId: string
): Promise<Room> {
  return apiRequest(`/rooms/${code}/upi`, {
    method: "PATCH",
    body: JSON.stringify({ hostUpiId }),
  });
}

export async function markSelfPaid(code: string): Promise<Room> {
  return apiRequest(`/rooms/${code}/payments/mark-paid`, {
    method: "POST",
  });
}
