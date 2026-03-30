import type {
  BookmarkFolder,
  BookmarkTrade,
  ImportedBookmarkFolder,
} from '@/src/features/bookmarks/types';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';

export function mergeImportedBookmarkFolders(
  schema: StorageSchemaV1,
  importedFolders: ImportedBookmarkFolder[],
  createId: () => string = defaultCreateId,
): StorageSchemaV1 {
  const nextFolders = [...schema.bookmarks.folders];
  const nextTradesByFolderId = { ...schema.bookmarks.tradesByFolderId };

  for (const importedFolder of importedFolders) {
    const folderId = createId();
    const folder: BookmarkFolder = {
      id: folderId,
      title: importedFolder.title,
      version: importedFolder.version,
      icon: importedFolder.icon,
      archivedAt: importedFolder.archivedAt,
    };

    const trades: BookmarkTrade[] = importedFolder.trades.map((trade) => ({
      id: createId(),
      title: trade.title,
      completedAt: trade.completedAt,
      location: trade.location,
    }));

    nextFolders.push(folder);
    nextTradesByFolderId[folderId] = trades;
  }

  return {
    ...schema,
    metadata: {
      ...schema.metadata,
      updatedAt: new Date().toISOString(),
    },
    bookmarks: {
      folders: nextFolders,
      tradesByFolderId: nextTradesByFolderId,
    },
  };
}

function defaultCreateId() {
  return globalThis.crypto?.randomUUID?.() ?? `btff-${Date.now()}`;
}
