import { describe, expect, it } from 'vitest';

import {
  generateLegacyBackupDataString,
  serializeLegacyFolderExport,
} from '@/src/lib/legacy/bookmarkExports';
import {
  parseLegacyBackupData,
  parseLegacyFolderExport,
} from '@/src/lib/legacy/bookmarkImports';
import {
  deleteBookmarkFolder,
  deleteBookmarkTrade,
  toggleBookmarkFolderArchive,
} from '@/src/lib/storage/bookmarkMutations';
import { createEmptyStorageSchema } from '@/src/lib/storage/schema';

describe('bookmark management parity helpers', () => {
  it('archives a folder, moves it to the end, and collapses it', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.folders = [
      {
        id: 'folder-a',
        title: 'Active Folder',
        version: '1',
        icon: null,
        archivedAt: null,
      },
      {
        id: 'folder-b',
        title: 'Second Folder',
        version: '1',
        icon: null,
        archivedAt: null,
      },
    ];
    schema.preferences.expandedFolderIds = ['folder-a', 'folder-b'];

    const archived = toggleBookmarkFolderArchive(schema, {
      folderId: 'folder-a',
    }, 'archived-now');

    expect(archived.bookmarks.folders.map((folder) => folder.id)).toEqual([
      'folder-b',
      'folder-a',
    ]);
    expect(archived.bookmarks.folders[1].archivedAt).toBe('archived-now');
    expect(archived.preferences.expandedFolderIds).toEqual(['folder-b']);
  });

  it('requires a folder to be archived before permanent deletion', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.folders = [
      {
        id: 'folder-a',
        title: 'Active Folder',
        version: '1',
        icon: null,
        archivedAt: null,
      },
    ];

    expect(() => deleteBookmarkFolder(schema, 'folder-a')).toThrow(
      'Archive a folder before deleting it permanently.',
    );
  });

  it('deletes archived folders and their trades together', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.folders = [
      {
        id: 'folder-a',
        title: 'Archived Folder',
        version: '1',
        icon: null,
        archivedAt: 'archived-now',
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-a': [
        {
          id: 'trade-a',
          title: 'Trade A',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'slug-a',
          },
        },
      ],
    };
    schema.preferences.expandedFolderIds = ['folder-a'];

    const deleted = deleteBookmarkFolder(schema, 'folder-a');

    expect(deleted.bookmarks.folders).toEqual([]);
    expect(deleted.bookmarks.tradesByFolderId).toEqual({});
    expect(deleted.preferences.expandedFolderIds).toEqual([]);
  });

  it('deletes individual trades without touching the folder', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.folders = [
      {
        id: 'folder-a',
        title: 'Folder',
        version: '1',
        icon: null,
        archivedAt: null,
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-a': [
        {
          id: 'trade-a',
          title: 'Trade A',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'slug-a',
          },
        },
        {
          id: 'trade-b',
          title: 'Trade B',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'slug-b',
          },
        },
      ],
    };

    const deleted = deleteBookmarkTrade(schema, {
      folderId: 'folder-a',
      tradeId: 'trade-a',
    });

    expect(deleted.bookmarks.folders).toHaveLength(1);
    expect(deleted.bookmarks.tradesByFolderId['folder-a'].map((trade) => trade.id)).toEqual([
      'trade-b',
    ]);
  });

  it('serializes a folder export that roundtrips through the legacy parser', () => {
    const exportString = serializeLegacyFolderExport(
      {
        title: 'Emoji Folder 🗁',
        version: '2',
        icon: 'exalt',
        archivedAt: null,
      },
      [
        {
          id: 'trade-a',
          title: 'Emoji Trade 🚚',
          completedAt: null,
          location: {
            version: '2',
            type: 'search',
            slug: 'slug-a',
          },
        },
      ],
    );

    const parsed = parseLegacyFolderExport(exportString);

    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Emoji Folder 🗁');
    expect(parsed?.version).toBe('2');
    expect(parsed?.trades[0].title).toBe('Emoji Trade 🚚');
    expect(parsed?.trades[0].location.version).toBe('2');
  });

  it('generates a backup string that preserves active and archived folders', () => {
    const backup = generateLegacyBackupDataString(
      [
        {
          id: 'folder-active',
          title: 'Active Folder',
          version: '1',
          icon: 'exalt',
          archivedAt: null,
        },
        {
          id: 'folder-archived',
          title: 'Archived Folder',
          version: '2',
          icon: null,
          archivedAt: 'archived-now',
        },
      ],
      {
        'folder-active': [
          {
            id: 'trade-active',
            title: 'Active Trade',
            completedAt: null,
            location: {
              version: '1',
              type: 'search',
              slug: 'active-slug',
            },
          },
        ],
        'folder-archived': [
          {
            id: 'trade-archived',
            title: 'Archived Trade',
            completedAt: null,
            location: {
              version: '2',
              type: 'search',
              slug: 'archived-slug',
            },
          },
        ],
      },
    );

    const parsed = parseLegacyBackupData(backup, {
      archivedAt: 'restored-archived',
    });

    expect(parsed).toHaveLength(2);
    expect(parsed[0].title).toBe('Active Folder');
    expect(parsed[0].archivedAt).toBeNull();
    expect(parsed[1].title).toBe('Archived Folder');
    expect(parsed[1].archivedAt).toBe('restored-archived');
  });
});
