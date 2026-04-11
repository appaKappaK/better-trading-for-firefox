import type {
  BookmarkFolder,
  BookmarkTrade,
  TradeSiteVersion,
} from '@/src/features/bookmarks/types';
import {
  formatTradeHistoryFallbackLabel,
  formatTradeLocationLabel,
  normalizeTradeLeague,
} from '@/src/lib/trade/location';

export const STORAGE_SCHEMA_VERSION = 1 as const;

export interface HistoryEntry {
  id: string;
  title: string;
  createdAt: string;
  version: TradeSiteVersion;
  type: string;
  slug: string;
  league: string;
  isLive: boolean;
}

export interface StoredPoeNinjaRatios {
  expiresAt: string | null;
  fetchedAt: string | null;
  value: Record<string, number>;
}

export interface StorageSchemaV1 {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  metadata: {
    instanceId: string;
    updatedAt: string;
  };
  bookmarks: {
    folders: BookmarkFolder[];
    tradesByFolderId: Record<string, BookmarkTrade[]>;
  };
  history: {
    entries: HistoryEntry[];
  };
  pinnedItems: {
    itemIds: string[];
  };
  preferences: {
    currentPage: string | null;
    dismissedChangelog: string | null;
    expandedFolderIds: string[];
    disabledEnhancers: string[];
    sidePanelCollapsed: boolean;
    sidePanelDraggable: boolean;
    sidePanelSidebar: boolean;
    hasCompletedOnboarding: boolean;
    persistPinnedItemsInSession: boolean;
    lastSeenLeagues: Record<TradeSiteVersion, string | null>;
    pendingUpdateNotice: string | null;
  };
  caches: {
    poeNinjaChaosRatiosByLeague: Record<string, StoredPoeNinjaRatios>;
  };
}

export interface NormalizeStoredSchemaResult {
  schema: StorageSchemaV1;
  changed: boolean;
}

export function createEmptyStorageSchema(
  instanceId: string = createInstanceId(),
): StorageSchemaV1 {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    metadata: {
      instanceId,
      updatedAt: new Date().toISOString(),
    },
    bookmarks: {
      folders: [],
      tradesByFolderId: {},
    },
    history: {
      entries: [],
    },
    pinnedItems: {
      itemIds: [],
    },
    preferences: {
      currentPage: 'bookmarks',
      dismissedChangelog: null,
      expandedFolderIds: [],
      disabledEnhancers: [],
      sidePanelCollapsed: false,
      sidePanelDraggable: false,
      sidePanelSidebar: false,
      hasCompletedOnboarding: false,
      persistPinnedItemsInSession: false,
      lastSeenLeagues: {
        '1': null,
        '2': null,
      },
      pendingUpdateNotice: null,
    },
    caches: {
      poeNinjaChaosRatiosByLeague: {},
    },
  };
}

export function migrateStorageSchema(
  value: unknown,
  instanceId: string = createInstanceId(),
): StorageSchemaV1 {
  if (!isRecord(value) || value.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    return createEmptyStorageSchema(instanceId);
  }

  const defaults = createEmptyStorageSchema(
    typeof value.metadata?.instanceId === 'string'
      ? value.metadata.instanceId
      : instanceId,
  );

  return {
    ...defaults,
    ...value,
    metadata: {
      ...defaults.metadata,
      ...(isRecord(value.metadata) ? value.metadata : {}),
      updatedAt:
        typeof value.metadata?.updatedAt === 'string'
          ? value.metadata.updatedAt
          : defaults.metadata.updatedAt,
    },
    bookmarks: {
      ...defaults.bookmarks,
      ...(isRecord(value.bookmarks) ? value.bookmarks : {}),
      folders: Array.isArray(value.bookmarks?.folders)
        ? value.bookmarks.folders
        : defaults.bookmarks.folders,
      tradesByFolderId: isRecord(value.bookmarks?.tradesByFolderId)
        ? value.bookmarks.tradesByFolderId
        : defaults.bookmarks.tradesByFolderId,
    },
    history: {
      ...defaults.history,
      ...(isRecord(value.history) ? value.history : {}),
      entries: Array.isArray(value.history?.entries)
        ? value.history.entries
        : defaults.history.entries,
    },
    pinnedItems: {
      ...defaults.pinnedItems,
      ...(isRecord(value.pinnedItems) ? value.pinnedItems : {}),
      itemIds: Array.isArray(value.pinnedItems?.itemIds)
        ? value.pinnedItems.itemIds
        : defaults.pinnedItems.itemIds,
    },
    preferences: {
      ...defaults.preferences,
      ...(isRecord(value.preferences) ? value.preferences : {}),
      expandedFolderIds: Array.isArray(value.preferences?.expandedFolderIds)
        ? value.preferences.expandedFolderIds
        : defaults.preferences.expandedFolderIds,
      disabledEnhancers: Array.isArray(value.preferences?.disabledEnhancers)
        ? value.preferences.disabledEnhancers
        : defaults.preferences.disabledEnhancers,
      hasCompletedOnboarding:
        typeof value.preferences?.hasCompletedOnboarding === 'boolean'
          ? value.preferences.hasCompletedOnboarding
          : defaults.preferences.hasCompletedOnboarding,
      persistPinnedItemsInSession:
        typeof value.preferences?.persistPinnedItemsInSession === 'boolean'
          ? value.preferences.persistPinnedItemsInSession
          : defaults.preferences.persistPinnedItemsInSession,
      lastSeenLeagues: {
        ...defaults.preferences.lastSeenLeagues,
        ...(isRecord(value.preferences?.lastSeenLeagues)
          ? value.preferences.lastSeenLeagues
          : {}),
        ...(typeof value.preferences?.lastSeenLeague === 'string'
          ? { '1': value.preferences.lastSeenLeague }
          : {}),
      },
    },
    caches: {
      ...defaults.caches,
      ...(isRecord(value.caches) ? value.caches : {}),
      poeNinjaChaosRatiosByLeague: isRecord(
        value.caches?.poeNinjaChaosRatiosByLeague,
      )
        ? value.caches.poeNinjaChaosRatiosByLeague
        : defaults.caches.poeNinjaChaosRatiosByLeague,
    },
  };
}

export function normalizeStoredSchema(
  schema: StorageSchemaV1,
): NormalizeStoredSchemaResult {
  let changed = false;

  const historyEntries = schema.history.entries.map((entry) => {
    const normalizedLeague = normalizeTradeLeague(entry.league);
    const normalizedTitle = normalizeHistoryEntryTitle(entry, normalizedLeague);

    if (
      normalizedLeague === entry.league &&
      normalizedTitle === entry.title
    ) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      league: normalizedLeague,
      title: normalizedTitle,
    };
  });

  const normalizedLastSeenLeagues = {
    '1': normalizeStoredLeagueValue(schema.preferences.lastSeenLeagues['1']),
    '2': normalizeStoredLeagueValue(schema.preferences.lastSeenLeagues['2']),
  };

  if (
    normalizedLastSeenLeagues['1'] !== schema.preferences.lastSeenLeagues['1'] ||
    normalizedLastSeenLeagues['2'] !== schema.preferences.lastSeenLeagues['2']
  ) {
    changed = true;
  }

  if (!changed) {
    return { schema, changed: false };
  }

  return {
    changed: true,
    schema: {
      ...schema,
      history: {
        entries: historyEntries,
      },
      preferences: {
        ...schema.preferences,
        lastSeenLeagues: normalizedLastSeenLeagues,
      },
    },
  };
}

function createInstanceId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `btff-${Date.now()}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}

function normalizeStoredLeagueValue(value: string | null) {
  return typeof value === 'string' ? normalizeTradeLeague(value) : value;
}

function normalizeHistoryEntryTitle(
  entry: HistoryEntry,
  normalizedLeague: string,
) {
  const trimmedTitle = entry.title.trim();
  const fallbackTitle = formatTradeHistoryFallbackLabel(entry);

  if (!trimmedTitle || trimmedTitle === 'Path of Exile Trade') {
    return fallbackTitle;
  }

  const fallbackCandidates = new Set([
    formatTradeLocationLabel(entry),
    formatTradeLocationLabel({
      ...entry,
      league: normalizedLeague,
    }),
  ]);

  return fallbackCandidates.has(trimmedTitle) ? fallbackTitle : entry.title;
}
