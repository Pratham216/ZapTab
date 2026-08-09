import type { IRoom, IItemSelection } from "../models/Room";
import type { SelectionsMap } from "@zaptab/shared";
import { Bill } from "../models/Bill";
import { Participant } from "../models/Participant";
import { getRoomByCode } from "./roomService";

export function selectionsToMap(selections: IItemSelection[]): SelectionsMap {
  const map: SelectionsMap = {};
  for (const s of selections) {
    if (!map[s.itemId]) map[s.itemId] = {};
    map[s.itemId][s.guestId] = s.quantity ?? 1;
  }
  return map;
}

export function serializeSelections(selections: IItemSelection[]): SelectionsMap {
  return selectionsToMap(selections);
}

function getClaimedByOthers(
  selections: IItemSelection[],
  itemId: string,
  guestId: string
): number {
  return selections
    .filter((s) => s.itemId === itemId && s.guestId !== guestId)
    .reduce((sum, s) => sum + (s.quantity ?? 1), 0);
}

export async function setItemSelection(
  code: string,
  guestId: string,
  itemId: string,
  quantity: number
) {
  const room = await getRoomByCode(code);
  if (!room) throw new Error("Room not found");
  if (room.status !== "open") throw new Error("Room is closed");
  if (room.expiresAt < new Date()) throw new Error("Room has expired");

  const participant = await Participant.findOne({
    roomId: room._id,
    guestId,
  });
  if (!participant) throw new Error("You are not in this room");

  const bill = await Bill.findById(room.billId);
  if (!bill) throw new Error("Bill not found");

  const billItem = bill.items.find((item) => item._id.toString() === itemId);
  if (!billItem) throw new Error("Item not found on bill");

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative integer");
  }

  const othersClaimed = getClaimedByOthers(room.selections, itemId, guestId);
  const available = billItem.quantity - othersClaimed;

  if (quantity > available) {
    throw new Error(
      available === 0
        ? "No units left for this item"
        : `Only ${available} left for this item`
    );
  }

  const existingIdx = room.selections.findIndex(
    (s) => s.itemId === itemId && s.guestId === guestId
  );

  if (quantity === 0) {
    if (existingIdx >= 0) {
      room.selections.splice(existingIdx, 1);
    } else {
      return { room, participant, changed: false };
    }
  } else if (existingIdx >= 0) {
    if (room.selections[existingIdx].quantity === quantity) {
      return { room, participant, changed: false };
    }
    room.selections[existingIdx].quantity = quantity;
  } else {
    room.selections.push({ itemId, guestId, quantity });
  }

  await room.save();
  return { room, participant, changed: true };
}

export function getRoomSelections(room: IRoom): SelectionsMap {
  return selectionsToMap(room.selections);
}
