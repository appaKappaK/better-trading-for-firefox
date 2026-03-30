import type {
  BookmarkFolder,
  BookmarkTrade,
  BookmarkTradeLocation,
  TradeSiteVersion,
} from '@/src/features/bookmarks/types';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';

interface CreateFolderInput {
  title: string;
  version: TradeSiteVersion;
  icon?: string | null;
  archivedAt?: string | null;
}

interface CreateTradeInput {
  folderId: string;
  title: string;
  location: BookmarkTradeLocation;
  completedAt?: string | null;
}

interface RenameTradeInput {
  folderId: string;
  tradeId: string;
  title: string;
}

interface UpdateTradeLocationInput {
  folderId: string;
  tradeId: string;
  location: BookmarkTradeLocation;
}

interface ToggleTradeCompletionInput {
  folderId: string;
  tradeId: string;
}

interface ToggleFolderArchiveInput {
  folderId: string;
}

interface DeleteTradeInput {
  folderId: string;
  tradeId: string;
}

export function createBookmarkFolder(
  schema: StorageSchemaV1,
  input: CreateFolderInput,
  createId: () => string = defaultCreateId,
): StorageSchemaV1 {
  const folderId = createId();

  return {
    ...schema,
    bookmarks: {
      folders: [
        ...schema.bookmarks.folders,
        {
          id: folderId,
          title: normalizeRequiredValue(input.title, 'Folder title'),
          version: input.version,
          icon: input.icon ?? null,
          archivedAt: input.archivedAt ?? null,
        },
      ],
      tradesByFolderId: {
        ...schema.bookmarks.tradesByFolderId,
        [folderId]: [],
      },
    },
    preferences: {
      ...schema.preferences,
      expandedFolderIds: [
        ...schema.preferences.expandedFolderIds.filter((id) => id !== folderId),
        folderId,
      ],
    },
  };
}

export function createBookmarkTrade(
  schema: StorageSchemaV1,
  input: CreateTradeInput,
  createId: () => string = defaultCreateId,
): StorageSchemaV1 {
  if (!schema.bookmarks.tradesByFolderId[input.folderId]) {
    return schema;
  }

  return {
    ...schema,
    bookmarks: {
      ...schema.bookmarks,
      tradesByFolderId: {
        ...schema.bookmarks.tradesByFolderId,
        [input.folderId]: [
          ...schema.bookmarks.tradesByFolderId[input.folderId],
          {
            id: createId(),
            title: normalizeRequiredValue(input.title, 'Trade title'),
            location: input.location,
            completedAt: input.completedAt ?? null,
          },
        ],
      },
    },
  };
}

export function renameBookmarkTrade(
  schema: StorageSchemaV1,
  input: RenameTradeInput,
): StorageSchemaV1 {
  return patchBookmarkTrade(schema, input.folderId, input.tradeId, {
    title: normalizeRequiredValue(input.title, 'Trade title'),
  });
}

export function updateBookmarkTradeLocation(
  schema: StorageSchemaV1,
  input: UpdateTradeLocationInput,
): StorageSchemaV1 {
  return patchBookmarkTrade(schema, input.folderId, input.tradeId, {
    location: input.location,
  });
}

export function toggleBookmarkTradeCompletion(
  schema: StorageSchemaV1,
  input: ToggleTradeCompletionInput,
  completedAt: string = new Date().toUTCString(),
): StorageSchemaV1 {
  const trade = schema.bookmarks.tradesByFolderId[input.folderId]?.find(
    (item) => item.id === input.tradeId,
  );

  if (!trade) {
    return schema;
  }

  return patchBookmarkTrade(schema, input.folderId, input.tradeId, {
    completedAt: trade.completedAt ? null : completedAt,
  });
}

export function patchBookmarkFolder(
  schema: StorageSchemaV1,
  folderId: string,
  patch: Partial<Pick<BookmarkFolder, 'title' | 'icon' | 'archivedAt'>>,
): StorageSchemaV1 {
  return {
    ...schema,
    bookmarks: {
      ...schema.bookmarks,
      folders: schema.bookmarks.folders.map((folder) =>
        folder.id === folderId ? { ...folder, ...patch } : folder,
      ),
    },
  };
}

export function toggleBookmarkFolderArchive(
  schema: StorageSchemaV1,
  input: ToggleFolderArchiveInput,
  archivedAt: string = new Date().toUTCString(),
): StorageSchemaV1 {
  const folder = schema.bookmarks.folders.find((item) => item.id === input.folderId);

  if (!folder) {
    return schema;
  }

  const patchedFolder = {
    ...folder,
    archivedAt: folder.archivedAt ? null : archivedAt,
  };

  return {
    ...schema,
    bookmarks: {
      ...schema.bookmarks,
      folders: [
        ...schema.bookmarks.folders.filter((item) => item.id !== input.folderId),
        patchedFolder,
      ],
    },
    preferences: {
      ...schema.preferences,
      expandedFolderIds: schema.preferences.expandedFolderIds.filter(
        (id) => id !== input.folderId,
      ),
    },
  };
}

export function patchBookmarkTrade(
  schema: StorageSchemaV1,
  folderId: string,
  tradeId: string,
  patch: Partial<Pick<BookmarkTrade, 'title' | 'completedAt' | 'location'>>,
): StorageSchemaV1 {
  const trades = schema.bookmarks.tradesByFolderId[folderId];

  if (!trades) {
    return schema;
  }

  return {
    ...schema,
    bookmarks: {
      ...schema.bookmarks,
      tradesByFolderId: {
        ...schema.bookmarks.tradesByFolderId,
        [folderId]: trades.map((trade) =>
          trade.id === tradeId ? { ...trade, ...patch } : trade,
        ),
      },
    },
  };
}

export function deleteBookmarkTrade(
  schema: StorageSchemaV1,
  input: DeleteTradeInput,
): StorageSchemaV1 {
  const trades = schema.bookmarks.tradesByFolderId[input.folderId];

  if (!trades) {
    return schema;
  }

  return {
    ...schema,
    bookmarks: {
      ...schema.bookmarks,
      tradesByFolderId: {
        ...schema.bookmarks.tradesByFolderId,
        [input.folderId]: trades.filter((trade) => trade.id !== input.tradeId),
      },
    },
  };
}

export function deleteBookmarkFolder(
  schema: StorageSchemaV1,
  folderId: string,
): StorageSchemaV1 {
  const folder = schema.bookmarks.folders.find((item) => item.id === folderId);

  if (!folder) {
    return schema;
  }

  if (!folder.archivedAt) {
    throw new Error('Archive a folder before deleting it permanently.');
  }

  const nextTradesByFolderId = { ...schema.bookmarks.tradesByFolderId };
  delete nextTradesByFolderId[folderId];

  return {
    ...schema,
    bookmarks: {
      folders: schema.bookmarks.folders.filter((folder) => folder.id !== folderId),
      tradesByFolderId: nextTradesByFolderId,
    },
    preferences: {
      ...schema.preferences,
      expandedFolderIds: schema.preferences.expandedFolderIds.filter(
        (id) => id !== folderId,
      ),
    },
  };
}

export function reorderBookmarkFolders(
  schema: StorageSchemaV1,
  fromIndex: number,
  toIndex: number,
): StorageSchemaV1 {
  const folders = [...schema.bookmarks.folders];
  const [moved] = folders.splice(fromIndex, 1);
  folders.splice(toIndex, 0, moved);

  return {
    ...schema,
    bookmarks: {
      ...schema.bookmarks,
      folders,
    },
  };
}

function normalizeRequiredValue(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} cannot be empty.`);
  }

  return normalized;
}

function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() ?? `btff-${Date.now()}`;
}
