import { isValidUpiId, normalizeUpiId } from "@zaptab/shared";
import type { IRoom } from "../models/Room";
import { Participant } from "../models/Participant";
import { getRoomByCode } from "./roomService";

export async function updateHostUpi(
  code: string,
  hostGuestId: string,
  hostUpiId: string
) {
  const room = await getRoomByCode(code);
  if (!room) throw new Error("Room not found");
  if (room.hostGuestId !== hostGuestId) {
    throw new Error("Only the host can update UPI ID");
  }

  const trimmed = hostUpiId.trim();
  if (!trimmed) {
    room.hostUpiId = undefined;
    await room.save();
    return room;
  }

  if (!isValidUpiId(trimmed)) {
    throw new Error("Invalid UPI ID. Use format: name@bank (e.g. you@ybl)");
  }

  room.hostUpiId = normalizeUpiId(trimmed);
  await room.save();
  return room;
}

export async function markSelfPaid(code: string, guestId: string) {
  const room = await getRoomByCode(code);
  if (!room) throw new Error("Room not found");
  if (room.status !== "open") throw new Error("Room is closed");

  const participant = await Participant.findOne({
    roomId: room._id,
    guestId,
  });
  if (!participant) throw new Error("You are not in this room");

  if (guestId === room.hostGuestId) {
    throw new Error("Host cannot mark themselves as paid");
  }

  if (!room.paidGuestIds.includes(guestId)) {
    room.paidGuestIds.push(guestId);
    await room.save();
  }

  return { room, participant };
}

export function isGuestPaid(room: IRoom, guestId: string): boolean {
  return (room.paidGuestIds ?? []).includes(guestId);
}
