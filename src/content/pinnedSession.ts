import type { PinnedItemRecord } from './pinnedItems';

export interface PendingPinnedJump {
  itemId: string;
  sourcePath: string;
  startedAt: number;
}

const SESSION_PINS_ACTIVE_KEY = 'btff:session-pins-active';
const SESSION_PINS_ITEMS_KEY = 'btff:session-pins-items';
const SESSION_PINS_PENDING_JUMP_KEY = 'btff:session-pins-pending-jump';

export function loadSessionPinnedItems(
  storage: Storage | null | undefined,
): PinnedItemRecord[] {
  const raw = storage?.getItem(SESSION_PINS_ITEMS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPinnedItemRecord) : [];
  } catch {
    return [];
  }
}

export function saveSessionPinnedItems(
  storage: Storage | null | undefined,
  items: PinnedItemRecord[],
) {
  if (!storage) return;
  storage.setItem(SESSION_PINS_ITEMS_KEY, JSON.stringify(items));
}

export function isSessionPinsActive(storage: Storage | null | undefined) {
  return storage?.getItem(SESSION_PINS_ACTIVE_KEY) === 'true';
}

export function setSessionPinsActive(
  storage: Storage | null | undefined,
  active: boolean,
) {
  if (!storage) return;
  storage.setItem(SESSION_PINS_ACTIVE_KEY, active ? 'true' : 'false');
}

export function loadPendingPinnedJump(
  storage: Storage | null | undefined,
): PendingPinnedJump | null {
  const raw = storage?.getItem(SESSION_PINS_PENDING_JUMP_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.itemId === 'string' &&
      typeof parsed.sourcePath === 'string' &&
      typeof parsed.startedAt === 'number'
    ) {
      return parsed as PendingPinnedJump;
    }
  } catch {
    // Ignore invalid session payloads.
  }

  return null;
}

export function savePendingPinnedJump(
  storage: Storage | null | undefined,
  pendingJump: PendingPinnedJump,
) {
  if (!storage) return;
  storage.setItem(SESSION_PINS_PENDING_JUMP_KEY, JSON.stringify(pendingJump));
}

export function clearPendingPinnedJump(storage: Storage | null | undefined) {
  storage?.removeItem(SESSION_PINS_PENDING_JUMP_KEY);
}

function isPinnedItemRecord(value: unknown): value is PinnedItemRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PinnedItemRecord).id === 'string' &&
    typeof (value as PinnedItemRecord).pinnedAt === 'string' &&
    typeof (value as PinnedItemRecord).subtitle === 'string' &&
    typeof (value as PinnedItemRecord).title === 'string' &&
    typeof (value as PinnedItemRecord).sourcePath === 'string'
  );
}
