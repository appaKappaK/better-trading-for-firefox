import type { ParsedTradeLocation } from '../trade/location';
import {
  compareTradeLocations,
  formatTradeLocationLabel,
} from '../trade/location';
import type { StorageSchemaV1 } from './schema';

const MAX_HISTORY_ENTRIES = 50;

export function applyTradePageContext(
  schema: StorageSchemaV1,
  location: ParsedTradeLocation,
  title: string,
  createId: () => string = defaultCreateId,
): StorageSchemaV1 {
  const currentHistoryEntry = schema.history.entries[0];
  const normalizedTitle = normalizeHistoryTitle(title, location);
  const shouldAppendHistory =
    !currentHistoryEntry || !compareTradeLocations(currentHistoryEntry, location);

  const nextEntries = shouldAppendHistory
    ? [
        {
          id: createId(),
          title: normalizedTitle,
          createdAt: new Date().toISOString(),
          version: location.version,
          type: location.type,
          slug: location.slug,
          league: location.league,
          isLive: location.isLive,
        },
        ...schema.history.entries,
      ].slice(0, MAX_HISTORY_ENTRIES)
    : schema.history.entries;

  if (
    !shouldAppendHistory &&
    schema.preferences.lastSeenLeagues[location.version] === location.league
  ) {
    return schema;
  }

  return {
    ...schema,
    metadata: {
      ...schema.metadata,
      updatedAt: new Date().toISOString(),
    },
    history: {
      entries: nextEntries,
    },
    preferences: {
      ...schema.preferences,
      lastSeenLeagues: {
        ...schema.preferences.lastSeenLeagues,
        [location.version]: location.league,
      },
    },
  };
}

export function applyCurrentPagePreference(
  schema: StorageSchemaV1,
  currentPage: string,
): StorageSchemaV1 {
  if (schema.preferences.currentPage === currentPage) {
    return schema;
  }

  return {
    ...schema,
    metadata: {
      ...schema.metadata,
      updatedAt: new Date().toISOString(),
    },
    preferences: {
      ...schema.preferences,
      currentPage,
    },
  };
}

function normalizeHistoryTitle(title: string, location: ParsedTradeLocation) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return formatTradeLocationLabel(location);
  if (trimmedTitle === 'Path of Exile Trade') {
    return formatTradeLocationLabel(location);
  }

  return trimmedTitle;
}

function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() ?? `btff-${Date.now()}`;
}
