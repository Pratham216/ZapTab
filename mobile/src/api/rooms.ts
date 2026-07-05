import type { SelectionsMap } from "@splitsnap/shared";
import { apiRequest } from "../lib/api";
import type { Bill } from "./bills";

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
    body: JSON.stringify({
      billId,
      hostName,
      hostUpiId: hostUpiId?.trim() || undefined,
    }),
  });
}

export async function getRoom(code: string): Promise<Room> {
  return apiRequest(`/rooms/${code.toUpperCase()}`);
}

export async function joinRoom(
  code: string,
  name: string
): Promise<{ room: Room; participant: Participant }> {
  return apiRequest(`/rooms/${code.toUpperCase()}/join`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function leaveRoom(code: string): Promise<void> {
  await apiRequest(`/rooms/${code.toUpperCase()}/participants/me`, {
    method: "DELETE",
  });
}

export async function setItemSelection(
  code: string,
  itemId: string,
  quantity: number
): Promise<Room> {
  return apiRequest(`/rooms/${code.toUpperCase()}/selections`, {
    method: "POST",
    body: JSON.stringify({ itemId, quantity }),
  });
}

export async function updateHostUpi(code: string, hostUpiId: string): Promise<Room> {
  return apiRequest(`/rooms/${code.toUpperCase()}/upi`, {
    method: "PATCH",
    body: JSON.stringify({ hostUpiId }),
  });
}

export async function markSelfPaid(code: string): Promise<Room> {
  return apiRequest(`/rooms/${code.toUpperCase()}/payments/mark-paid`, {
    method: "POST",
  });
}
