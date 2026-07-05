import type { Room } from "../api/rooms";

export function applySelectionChange(
  room: Room,
  itemId: string,
  guestId: string,
  quantity: number
): Room {
  const selections = { ...room.selections };
  const entry = { ...(selections[itemId] ?? {}) };

  if (quantity <= 0) {
    delete entry[guestId];
  } else {
    entry[guestId] = quantity;
  }

  if (Object.keys(entry).length === 0) {
    delete selections[itemId];
  } else {
    selections[itemId] = entry;
  }

  return { ...room, selections };
}
