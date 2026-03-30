import type { HistoryEntry } from '@/src/lib/storage/schema';

const BASE_URL = 'https://www.pathofexile.com';

export function buildTradeUrl(historyEntry: HistoryEntry): string {
  const basePath = historyEntry.version === '2' ? 'trade2' : 'trade';
  return [
    BASE_URL,
    basePath,
    historyEntry.type,
    historyEntry.league,
    historyEntry.slug,
  ].join('/');
}
