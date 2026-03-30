import type {
  ImportedBookmarkFolder,
  ImportedBookmarkTrade,
  TradeSiteVersion,
} from '@/src/features/bookmarks/types';
import {
  decodeLatin1Base64,
  decodeUtf8Base64,
} from '@/src/lib/legacy/base64';

export const LEGACY_BACKUP_SECTION_DELIMITER = '\n--------------------\n';
const LINE_DELIMITER = '\n';

type ExportVersion = 1 | 2 | 3;

interface ExportedFolderStructV1 {
  icn: string;
  tit: string;
  trs: Array<{
    tit: string;
    loc: string;
  }>;
}

interface ExportedFolderStructV3 extends ExportedFolderStructV1 {
  ver: TradeSiteVersion;
}

interface ParseBackupOptions {
  archivedAt?: string;
}

export function parseLegacyFolderExport(
  serializedFolder: string,
): ImportedBookmarkFolder | null {
  try {
    const normalizedInput = serializedFolder.trim();

    if (!normalizedInput || normalizedInput.includes('\n')) {
      return null;
    }

    const exportVersion = parseExportVersion(normalizedInput);
    const payload = JSON.parse(
      decodeExportPayload(exportVersion, normalizedInput),
    ) as ExportedFolderStructV1;

    if (!payload || !payload.tit || !Array.isArray(payload.trs)) {
      return null;
    }

    const folder: ImportedBookmarkFolder = {
      title: payload.tit,
      version:
        exportVersion >= 3
          ? (payload as ExportedFolderStructV3).ver
          : '1',
      icon: payload.icn ?? null,
      archivedAt: null,
      trades: payload.trs
        .map((trade) => parseLegacyTrade(trade, exportVersion))
        .filter((trade): trade is ImportedBookmarkTrade => trade !== null),
    };

    return folder;
  } catch {
    return null;
  }
}

export function parseLegacyBackupData(
  backupText: string,
  options: ParseBackupOptions = {},
): ImportedBookmarkFolder[] {
  const archivedAt = options.archivedAt ?? new Date().toUTCString();
  const [activeSection = '', archivedSection = ''] =
    backupText.split(LEGACY_BACKUP_SECTION_DELIMITER);

  return [
    ...parseBackupSection(activeSection),
    ...parseBackupSection(archivedSection, archivedAt),
  ];
}

function parseBackupSection(section: string, archivedAt: string | null = null) {
  return section
    .split(LINE_DELIMITER)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseLegacyFolderExport(line))
    .filter((folder): folder is ImportedBookmarkFolder => folder !== null)
    .map((folder) => ({
      ...folder,
      archivedAt,
    }));
}

function parseLegacyTrade(
  trade: ExportedFolderStructV1['trs'][number],
  exportVersion: ExportVersion,
): ImportedBookmarkTrade | null {
  if (!trade?.tit || !trade.loc) return null;

  let version: string;
  let type: string;
  let slug: string;

  if (exportVersion >= 3) {
    [version, type, slug] = trade.loc.split(':');
  } else {
    version = '1';
    [type, slug] = trade.loc.split(':');
  }

  if (!version || !type || !slug) return null;

  return {
    title: trade.tit,
    completedAt: null,
    location: {
      version: version as TradeSiteVersion,
      type,
      slug,
    },
  };
}

function parseExportVersion(exportString: string): ExportVersion {
  if (exportString.startsWith('2:')) return 2;
  if (exportString.startsWith('3:')) return 3;
  return 1;
}

function decodeExportPayload(
  version: ExportVersion,
  exportString: string,
) {
  if (version >= 2) return decodeUtf8Base64(exportString.slice(2));
  return decodeLatin1Base64(exportString);
}
