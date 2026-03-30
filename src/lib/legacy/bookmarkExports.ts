import type {
  BookmarkFolder,
  BookmarkTrade,
  TradeSiteVersion,
} from '@/src/features/bookmarks/types';
import { encodeUtf8Base64 } from '@/src/lib/legacy/base64';
import { LEGACY_BACKUP_SECTION_DELIMITER } from '@/src/lib/legacy/bookmarkImports';

const LINE_DELIMITER = '\n';

interface ExportedFolderStructV3 {
  icn: string | null;
  tit: string;
  ver: TradeSiteVersion;
  trs: Array<{
    tit: string;
    loc: string;
  }>;
}

export function serializeLegacyFolderExport(
  folder: BookmarkFolder | Pick<BookmarkFolder, 'icon' | 'title' | 'version'>,
  trades: Array<BookmarkTrade | Pick<BookmarkTrade, 'title' | 'location'>>,
) {
  const payload: ExportedFolderStructV3 = {
    icn: folder.icon ?? null,
    tit: folder.title,
    ver: folder.version,
    trs: trades.map((trade) => ({
      tit: trade.title,
      loc: `${trade.location.version}:${trade.location.type}:${trade.location.slug}`,
    })),
  };

  return `3:${encodeUtf8Base64(JSON.stringify(payload))}`;
}

export function generateLegacyBackupDataString(
  folders: BookmarkFolder[],
  tradesByFolderId: Record<string, BookmarkTrade[]>,
) {
  const activeFolderStrings: string[] = [];
  const archivedFolderStrings: string[] = [];

  for (const folder of folders) {
    const serializedFolder = serializeLegacyFolderExport(
      folder,
      tradesByFolderId[folder.id] ?? [],
    );

    if (folder.archivedAt) {
      archivedFolderStrings.push(serializedFolder);
    } else {
      activeFolderStrings.push(serializedFolder);
    }
  }

  return [
    activeFolderStrings.join(LINE_DELIMITER),
    archivedFolderStrings.join(LINE_DELIMITER),
  ].join(LEGACY_BACKUP_SECTION_DELIMITER);
}

export const generateLegacyBackupData = generateLegacyBackupDataString;
