import type { HistoryEntry } from '@/src/lib/storage/schema';
import { getTradeUrl } from '@/src/lib/trade/location';

export function buildTradeUrl(historyEntry: HistoryEntry): string {
  return getTradeUrl(historyEntry, historyEntry.isLive ? '/live' : '');
}
