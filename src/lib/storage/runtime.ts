import {
  generateLegacyBackupDataString,
  serializeLegacyFolderExport,
} from '@/src/lib/legacy/bookmarkExports';
import { previewLegacyImport } from '@/src/lib/legacy/importPreview';
import { mergeImportedBookmarkFolders } from '@/src/lib/storage/bookmarkImports';
import {
  createBookmarkFolder,
  createBookmarkTrade,
  deleteBookmarkFolder,
  deleteBookmarkTrade,
  patchBookmarkFolder,
  renameBookmarkTrade,
  reorderBookmarkFolders,
  toggleBookmarkFolderArchive,
  toggleBookmarkTradeCompletion,
  updateBookmarkTradeLocation,
} from '@/src/lib/storage/bookmarkMutations';
import {
  createEmptyStorageSchema,
  migrateStorageSchema,
  type StorageSchemaV1,
} from '@/src/lib/storage/schema';
import {
  applyCurrentPagePreference,
  applyTradePageContext,
} from '@/src/lib/storage/tradeContext';
import type { ParsedTradeLocation } from '@/src/lib/trade/location';
import type {
  BookmarkTradeLocation,
  TradeSiteVersion,
} from '@/src/features/bookmarks/types';

export const STORAGE_SCHEMA_KEY = 'btff-schema-v1';

export async function loadStoredSchema(): Promise<StorageSchemaV1> {
  const result = await browser.storage.local.get(STORAGE_SCHEMA_KEY);
  return migrateStorageSchema(result[STORAGE_SCHEMA_KEY]);
}

export async function saveStoredSchema(
  schema: StorageSchemaV1,
): Promise<StorageSchemaV1> {
  const nextSchema: StorageSchemaV1 = {
    ...schema,
    metadata: {
      ...schema.metadata,
      updatedAt: new Date().toISOString(),
    },
  };

  await browser.storage.local.set({
    [STORAGE_SCHEMA_KEY]: nextSchema,
  });

  return nextSchema;
}

export async function updateStoredSchema(
  updater: (schema: StorageSchemaV1) => StorageSchemaV1,
): Promise<StorageSchemaV1> {
  const currentSchema = await loadStoredSchema();
  return saveStoredSchema(updater(currentSchema));
}

export async function startFreshSchema(): Promise<StorageSchemaV1> {
  const schema = createEmptyStorageSchema();

  return saveStoredSchema({
    ...schema,
    preferences: {
      ...schema.preferences,
      hasCompletedOnboarding: true,
    },
  });
}

export async function importLegacyBookmarksInput(input: string): Promise<{
  preview: ReturnType<typeof previewLegacyImport>;
  schema: StorageSchemaV1 | null;
}> {
  const preview = previewLegacyImport(input);

  if (preview.state !== 'ready') {
    return {
      preview,
      schema: null,
    };
  }

  const currentSchema = await loadStoredSchema();
  const mergedSchema = mergeImportedBookmarkFolders(
    currentSchema,
    preview.folders,
  );

  const savedSchema = await saveStoredSchema({
    ...mergedSchema,
    preferences: {
      ...mergedSchema.preferences,
      hasCompletedOnboarding: true,
    },
  });

  return {
    preview,
    schema: savedSchema,
  };
}

export async function setStoredCurrentPage(
  currentPage: string,
): Promise<StorageSchemaV1> {
  const schema = await loadStoredSchema();
  return saveStoredSchema(applyCurrentPagePreference(schema, currentPage));
}

export async function syncTradePageContext(
  location: ParsedTradeLocation,
  title: string,
): Promise<StorageSchemaV1> {
  const schema = await loadStoredSchema();
  return saveStoredSchema(applyTradePageContext(schema, location, title));
}

export async function toggleStoredExpandedFolder(
  folderId: string,
): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => {
    const expandedFolderIds = schema.preferences.expandedFolderIds.includes(
      folderId,
    )
      ? schema.preferences.expandedFolderIds.filter((id) => id !== folderId)
      : [...schema.preferences.expandedFolderIds, folderId];

    return {
      ...schema,
      preferences: {
        ...schema.preferences,
        expandedFolderIds,
      },
    };
  });
}

export async function saveStoredBookmarkTrade(input: {
  folderId: string | null;
  folderTitle: string | null;
  folderIcon?: string | null;
  title: string;
  location: BookmarkTradeLocation;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => {
    let nextSchema = schema;
    let nextFolderId = input.folderId;

    if (!nextFolderId) {
      nextSchema = createBookmarkFolder(nextSchema, {
        title: input.folderTitle ?? '',
        version: input.location.version,
        icon: input.folderIcon ?? null,
      });
      nextFolderId = nextSchema.bookmarks.folders.at(-1)?.id ?? null;
    }

    if (!nextFolderId) {
      throw new Error('Unable to resolve a folder for the new bookmark.');
    }

    nextSchema = createBookmarkTrade(nextSchema, {
      folderId: nextFolderId,
      title: input.title,
      location: input.location,
    });

    return {
      ...nextSchema,
      preferences: {
        ...nextSchema.preferences,
        currentPage: 'bookmarks',
        expandedFolderIds: nextSchema.preferences.expandedFolderIds.includes(
          nextFolderId,
        )
          ? nextSchema.preferences.expandedFolderIds
          : [...nextSchema.preferences.expandedFolderIds, nextFolderId],
      },
    };
  });
}

export async function createStoredBookmarkFolder(input: {
  title: string;
  version: TradeSiteVersion;
  icon?: string | null;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => createBookmarkFolder(schema, input));
}

export async function createStoredBookmarkTrade(input: {
  folderId: string;
  title: string;
  location: BookmarkTradeLocation;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => createBookmarkTrade(schema, input));
}

export async function renameStoredBookmarkTrade(input: {
  folderId: string;
  tradeId: string;
  title: string;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => renameBookmarkTrade(schema, input));
}

export async function updateStoredBookmarkTradeLocation(input: {
  folderId: string;
  tradeId: string;
  location: BookmarkTradeLocation;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => updateBookmarkTradeLocation(schema, input));
}

export async function toggleStoredBookmarkTradeCompletion(input: {
  folderId: string;
  tradeId: string;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => toggleBookmarkTradeCompletion(schema, input));
}

export async function toggleStoredBookmarkFolderArchive(input: {
  folderId: string;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => toggleBookmarkFolderArchive(schema, input));
}

export async function deleteStoredBookmarkTrade(input: {
  folderId: string;
  tradeId: string;
}): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => deleteBookmarkTrade(schema, input));
}

export async function deleteStoredBookmarkFolder(folderId: string): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => deleteBookmarkFolder(schema, folderId));
}

export async function exportStoredBookmarkFolder(folderId: string): Promise<string> {
  const schema = await loadStoredSchema();
  const folder = schema.bookmarks.folders.find((item) => item.id === folderId);

  if (!folder) {
    throw new Error('That bookmark folder no longer exists.');
  }

  return serializeLegacyFolderExport(
    folder,
    schema.bookmarks.tradesByFolderId[folderId] ?? [],
  );
}

export async function generateStoredBookmarksBackup(): Promise<string> {
  const schema = await loadStoredSchema();
  return generateLegacyBackupDataString(
    schema.bookmarks.folders,
    schema.bookmarks.tradesByFolderId,
  );
}

export async function reorderStoredBookmarkFolders(
  fromIndex: number,
  toIndex: number,
): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => reorderBookmarkFolders(schema, fromIndex, toIndex));
}

export async function updateStoredBookmarkFolderIcon(
  folderId: string,
  icon: string | null,
): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => patchBookmarkFolder(schema, folderId, { icon }));
}

export async function clearStoredHistory(): Promise<StorageSchemaV1> {
  return updateStoredSchema((schema) => ({
    ...schema,
    history: { entries: [] },
  }));
}

export async function updateStoredPreferences(
  patch: Partial<StorageSchemaV1['preferences']>,
): Promise<StorageSchemaV1> {
  const currentSchema = await loadStoredSchema();

  return saveStoredSchema({
    ...currentSchema,
    preferences: {
      ...currentSchema.preferences,
      ...patch,
    },
  });
}
