import AsyncStorage from "@react-native-async-storage/async-storage";

const RECEIPTS_BASE = "zaptab_recent_receipts";
const ROOMS_BASE = "zaptab_recent_rooms";
const HOST_NAME_BASE = "zaptab_last_host_name";
const LEGACY_KEYS = [RECEIPTS_BASE, ROOMS_BASE, HOST_NAME_BASE];
const MAX_ENTRIES = 25;

// History is stored per signed-in user so accounts don't see each other's data.
let scopeId: string | null = null;

export function setHistoryScope(userId: string | null): void {
  scopeId = userId?.trim() || null;
  if (scopeId) {
    // Remove pre-scoping data that was shared across all accounts.
    void AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {});
  }
}

function scopedKey(base: string): string {
  return scopeId ? `${base}::${scopeId}` : base;
}

const RECEIPTS_KEY = () => scopedKey(RECEIPTS_BASE);
const ROOMS_KEY = () => scopedKey(ROOMS_BASE);
const HOST_NAME_KEY = () => scopedKey(HOST_NAME_BASE);

export interface ReceiptEntry {
  billId: string;
  restaurantName: string;
  billDate?: string;
  total?: number;
  roomCode?: string;
  savedAt: string;
  imageUri?: string;
  imageUrl?: string;
}

export interface RoomEntry {
  code: string;
  role: "host" | "guest";
  restaurantName?: string;
  savedAt: string;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function getRecentReceipts(): Promise<ReceiptEntry[]> {
  return readList<ReceiptEntry>(RECEIPTS_KEY());
}

export async function saveReceipt(
  entry: Omit<ReceiptEntry, "savedAt">
): Promise<void> {
  const list = await getRecentReceipts();
  const existing = list.find((r) => r.billId === entry.billId);
  const merged: ReceiptEntry = {
    ...existing,
    ...entry,
    imageUri: entry.imageUri ?? existing?.imageUri,
    imageUrl: entry.imageUrl ?? existing?.imageUrl,
    roomCode: entry.roomCode ?? existing?.roomCode,
    savedAt: new Date().toISOString(),
  };
  const next = [
    merged,
    ...list.filter((r) => r.billId !== entry.billId),
  ].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(RECEIPTS_KEY(), JSON.stringify(next));
}

export async function removeReceipt(billId: string): Promise<void> {
  const list = await getRecentReceipts();
  await AsyncStorage.setItem(
    RECEIPTS_KEY(),
    JSON.stringify(list.filter((r) => r.billId !== billId))
  );
}

export async function getRecentRooms(): Promise<RoomEntry[]> {
  return readList<RoomEntry>(ROOMS_KEY());
}

export async function saveRoom(entry: Omit<RoomEntry, "savedAt">): Promise<void> {
  const list = await getRecentRooms();
  const existing = list.find((r) => r.code === entry.code);
  const merged: RoomEntry = {
    ...existing,
    ...entry,
    restaurantName: entry.restaurantName ?? existing?.restaurantName,
    savedAt: new Date().toISOString(),
  };
  const next = [merged, ...list.filter((r) => r.code !== entry.code)].slice(
    0,
    MAX_ENTRIES
  );
  await AsyncStorage.setItem(ROOMS_KEY(), JSON.stringify(next));
}

export async function removeRoom(code: string): Promise<void> {
  const list = await getRecentRooms();
  await AsyncStorage.setItem(
    ROOMS_KEY(),
    JSON.stringify(list.filter((r) => r.code !== code))
  );
}

export async function getLastHostName(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(HOST_NAME_KEY());
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export async function setLastHostName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await AsyncStorage.setItem(HOST_NAME_KEY(), trimmed);
}
