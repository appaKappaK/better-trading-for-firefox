import { describe, expect, it } from 'vitest';

import {
  parseLegacyBackupData,
  parseLegacyFolderExport,
} from '../src/lib/legacy/bookmarkImports';
import { previewLegacyImport } from '../src/lib/legacy/importPreview';

const exportV1 =
  'eyJpY24iOiJleGFsdCIsInRpdCI6InRlc3QgZm9sZGVyIiwidHJzIjpbeyJ0aXQiOiJ0ZXN0IHRyYWRlIiwibG9jIjoic2VhcmNoOm93V0pRRWtpbCJ9XX0=';
const exportV2 =
  '2:eyJpY24iOiJleGFsdCIsInRpdCI6InRlc3QgZm9sZGVyIPCfl4EiLCJ0cnMiOlt7InRpdCI6InRlc3QgdHJhZGUg8J+amiIsImxvYyI6InNlYXJjaDpvd1dKUUVraWwifV19';
const exportV3Poe1 =
  '3:eyJpY24iOiJhc2NlbmRhbnQiLCJ0aXQiOiJ0ZXN0IFBvRSAxIGZvbGRlciDwn5eBIiwidmVyIjoiMSIsInRycyI6W3sidGl0IjoidGVzdCBQb0UgMSB0cmFkZSDwn5qaIiwibG9jIjoiMTpzZWFyY2g6Zm9vYmFyIn1dfQ==';
const exportV3Poe2 =
  '3:eyJpY24iOiJhc2NlbmRhbnQiLCJ0aXQiOiJ0ZXN0IFBvRSAyIGZvbGRlciDwn5eBIiwidmVyIjoiMiIsInRycyI6W3sidGl0IjoidGVzdCBQb0UgMiB0cmFkZSDwn5qaIiwibG9jIjoiMjpzZWFyY2g6Zm9vYmFyIn1dfQ==';

describe('legacy bookmark import parsing', () => {
  it('parses v1/v2/v3 folder exports', () => {
    const v1 = parseLegacyFolderExport(exportV1);
    const v2 = parseLegacyFolderExport(exportV2);
    const v3Poe1 = parseLegacyFolderExport(exportV3Poe1);
    const v3Poe2 = parseLegacyFolderExport(exportV3Poe2);

    expect(v1?.version).toBe('1');
    expect(v1?.trades[0].location.version).toBe('1');

    expect(v2?.title).toContain('test folder');
    expect(v2?.trades[0].title).toContain('test trade');

    expect(v3Poe1?.version).toBe('1');
    expect(v3Poe2?.version).toBe('2');
    expect(v3Poe2?.trades[0].location.version).toBe('2');
  });

  it('returns null for malformed folder exports', () => {
    expect(parseLegacyFolderExport('foobar')).toBeNull();
  });

  it('parses the legacy backup section format and marks archived folders', () => {
    const backupText = `${exportV3Poe1}\n--------------------\n${exportV3Poe2}`;
    const folders = parseLegacyBackupData(backupText, {
      archivedAt: 'archived-now',
    });

    expect(folders).toHaveLength(2);
    expect(folders[0].archivedAt).toBeNull();
    expect(folders[1].archivedAt).toBe('archived-now');
  });

  it('builds import previews for folder exports and backups', () => {
    const folderPreview = previewLegacyImport(exportV2);
    const backupPreview = previewLegacyImport(
      `${exportV3Poe1}\n--------------------\n${exportV3Poe2}`,
    );

    expect(folderPreview.state).toBe('ready');
    expect(folderPreview.source).toBe('folder-export');
    expect(folderPreview.folderCount).toBe(1);

    expect(backupPreview.state).toBe('ready');
    expect(backupPreview.source).toBe('backup');
    expect(backupPreview.folderCount).toBe(2);
    expect(backupPreview.archivedFolderCount).toBe(1);
  });

  it('marks empty or malformed input during preview', () => {
    expect(previewLegacyImport('   ').state).toBe('empty');
    expect(previewLegacyImport('foobar').state).toBe('invalid');
  });
});
