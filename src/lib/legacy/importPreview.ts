import type { ImportedBookmarkFolder } from '../../features/bookmarks/types';
import {
  LEGACY_BACKUP_SECTION_DELIMITER,
  parseLegacyBackupData,
  parseLegacyFolderExport,
} from './bookmarkImports';

export interface LegacyImportPreview {
  state: 'empty' | 'invalid' | 'ready';
  source: 'folder-export' | 'backup' | null;
  folders: ImportedBookmarkFolder[];
  folderCount: number;
  tradeCount: number;
  archivedFolderCount: number;
}

export function previewLegacyImport(input: string): LegacyImportPreview {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return createPreview('empty', null, []);
  }

  const directFolder = parseLegacyFolderExport(normalizedInput);

  if (directFolder) {
    return createPreview('ready', 'folder-export', [directFolder]);
  }

  const importedFolders = parseLegacyBackupData(normalizedInput);

  if (importedFolders.length > 0) {
    const source = normalizedInput.includes(LEGACY_BACKUP_SECTION_DELIMITER)
      ? 'backup'
      : 'folder-export';

    return createPreview('ready', source, importedFolders);
  }

  return createPreview('invalid', null, []);
}

function createPreview(
  state: LegacyImportPreview['state'],
  source: LegacyImportPreview['source'],
  folders: ImportedBookmarkFolder[],
): LegacyImportPreview {
  return {
    state,
    source,
    folders,
    folderCount: folders.length,
    tradeCount: folders.reduce((count, folder) => count + folder.trades.length, 0),
    archivedFolderCount: folders.filter((folder) => folder.archivedAt !== null)
      .length,
  };
}
