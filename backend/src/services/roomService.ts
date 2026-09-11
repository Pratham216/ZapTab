import { Room, IRoom } from "../models/Room";
import { Participant, IParticipant } from "../models/Participant";
import { Bill } from "../models/Bill";
import { config } from "../config";
import { serializeBill } from "./billProcessor";
import { createUniqueRoomCode } from "../utils/roomCode";
import { getJoinUrl } from "../utils/networkUrl";
import { serializeSelections } from "./selectionService";
import { isGuestPaid } from "./paymentService";
import { isValidUpiId, normalizeUpiId } from "@zaptab/shared";

export async function createRoom(
  billId: string,
  hostGuestId: string,
  hostName = "Host",
  hostUpiId?: string
) {
  const bill = await Bill.findById(billId);
  if (!bill) throw new Error("Bill not found");
  if (bill.status !== "parsed") throw new Error("Bill must be parsed before creating a room");

  const code = await createUniqueRoomCode();
  const expiresAt = new Date(Date.now() + config.roomExpiryMs);

  const roomPayload: Record<string, unknown> = {
    code,
    billId: bill._id,
    hostGuestId,
    status: "open",
    expiresAt,
    paidGuestIds: [],
  };

  if (hostUpiId?.trim()) {
    if (!isValidUpiId(hostUpiId)) {
      throw new Error("Invalid UPI ID. Use format: name@bank (e.g. you@ybl)");
    }
    roomPayload.hostUpiId = normalizeUpiId(hostUpiId);
  }

  const room = await Room.create(roomPayload);

  await Participant.create({
    roomId: room._id,
    guestId: hostGuestId,
    name: hostName.trim() || "Host",
  });

  return room;
}

export async function getRoomByCode(code: string) {
  const room = await Room.findOne({ code: code.toUpperCase() });
  if (!room) return null;
  if (room.expiresAt < new Date() && room.status === "open") {
    room.status = "closed";
    await room.save();
  }
  return room;
}

export async function serializeRoom(room: IRoom) {
  const bill = await Bill.findById(room.billId);
  const participants = await Participant.find({ roomId: room._id }).sort({
    createdAt: 1,
  });

  return {
    id: room._id.toString(),
    code: room.code,
    status: room.status,
    expiresAt: room.expiresAt,
    joinUrl: getJoinUrl(room.code),
    hostGuestId: room.hostGuestId,
    hostUpiId: room.hostUpiId ?? "",
    paidGuestIds: room.paidGuestIds ?? [],
    selections: serializeSelections(room.selections ?? []),
    bill: bill ? serializeBill(bill) : null,
    participants: participants.map((p) => serializeParticipant(p, room)),
  };
}

export function serializeParticipant(p: IParticipant, room?: IRoom) {
  return {
    id: p._id.toString(),
    name: p.name,
    guestId: p.guestId,
    avatarUrl: p.avatarUrl,
    createdAt: p.createdAt,
    paid: room ? isGuestPaid(room, p.guestId) : false,
  };
}

export async function joinRoom(
  code: string,
  guestId: string,
  name: string,
  avatarUrl?: string
) {
  const room = await getRoomByCode(code);
  if (!room) throw new Error("Room not found");
  if (room.status !== "open") throw new Error("Room is closed");
  if (room.expiresAt < new Date()) throw new Error("Room has expired");

  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Name is required");

  let participant = await Participant.findOne({ roomId: room._id, guestId });
  if (participant) {
    participant.name = trimmedName;
    if (avatarUrl !== undefined) participant.avatarUrl = avatarUrl;
    await participant.save();
  } else {
    participant = await Participant.create({
      roomId: room._id,
      guestId,
      name: trimmedName,
      avatarUrl,
    });
  }

  return { room, participant };
}
