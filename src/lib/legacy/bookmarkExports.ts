import type {
  BookmarkColor,
  BookmarkFolder,
  BookmarkTrade,
  TradeSiteVersion,
} from '@/src/features/bookmarks/types';
import { normalizeFolderIconSlug } from '@/src/lib/bookmarks/folderIcons';
import { encodeUtf8Base64 } from '@/src/lib/legacy/base64';
import { LEGACY_BACKUP_SECTION_DELIMITER } from '@/src/lib/legacy/bookmarkImports';

const LINE_DELIMITER = '\n';

interface ExportedFolderStructV3 {
  clr?: BookmarkColor;
  icn: string | null;
  tit: string;
  ver: TradeSiteVersion;
  trs: Array<{
    clr?: BookmarkColor;
    lge?: string;
    tit: string;
    loc: string;
  }>;
}

export function serializeLegacyFolderExport(
  folder:
    | BookmarkFolder
    | Pick<BookmarkFolder, 'color' | 'icon' | 'title' | 'version'>,
  trades: Array<
    BookmarkTrade | Pick<BookmarkTrade, 'color' | 'title' | 'location'>
  >,
) {
  const payload: ExportedFolderStructV3 = {
    ...(folder.color ? { clr: folder.color } : {}),
    icn: normalizeFolderIconSlug(folder.icon),
    tit: folder.title,
    ver: folder.version,
    trs: trades.map((trade) => ({
      ...(trade.color ? { clr: trade.color } : {}),
      ...(trade.location.league ? { lge: trade.location.league } : {}),
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
