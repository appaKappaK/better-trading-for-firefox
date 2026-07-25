import type { ParsedTradeLocation } from '../trade/location';
import {
  compareTradeLocations,
  formatTradeHistoryFallbackLabel,
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
  const resolvedTitle = resolveHistoryTitle(schema, title, location);
  const shouldAppendHistory =
    !currentHistoryEntry || !compareTradeLocations(currentHistoryEntry, location);
  const shouldRepairHistoryTitle =
    !shouldAppendHistory &&
    resolvedTitle.reused &&
    currentHistoryEntry.title !== resolvedTitle.title;

  const nextEntries = shouldAppendHistory
    ? [
        {
          id: createId(),
          title: resolvedTitle.title,
          createdAt: new Date().toISOString(),
          version: location.version,
          type: location.type,
          slug: location.slug,
          league: location.league,
          isLive: location.isLive,
        },
        ...schema.history.entries,
      ].slice(0, MAX_HISTORY_ENTRIES)
    : shouldRepairHistoryTitle
      ? [
          {
            ...currentHistoryEntry,
            title: resolvedTitle.title,
          },
          ...schema.history.entries.slice(1),
        ]
      : schema.history.entries;

  if (
    !shouldAppendHistory &&
    !shouldRepairHistoryTitle &&
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

function resolveHistoryTitle(
  schema: StorageSchemaV1,
  title: string,
  location: ParsedTradeLocation,
) {
  const normalizedTitle = normalizeHistoryTitle(title, location);
  const fallbackTitle = formatTradeHistoryFallbackLabel(location);
  if (normalizedTitle !== fallbackTitle) {
    return { reused: false, title: normalizedTitle };
  }

  for (const entry of schema.history.entries) {
    if (!compareTradeLocations(entry, location)) continue;

    const existingTitle = normalizeHistoryTitle(entry.title, location);
    if (existingTitle !== fallbackTitle) {
      return { reused: true, title: existingTitle };
    }
  }

  return { reused: false, title: normalizedTitle };
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
  if (!trimmedTitle) return formatTradeHistoryFallbackLabel(location);
  if (trimmedTitle === 'Path of Exile Trade') {
    return formatTradeHistoryFallbackLabel(location);
  }

  return trimmedTitle;
}

function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() ?? `btff-${Date.now()}`;
}
