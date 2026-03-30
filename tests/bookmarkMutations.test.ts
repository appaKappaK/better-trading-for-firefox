import { describe, expect, it } from 'vitest';

import {
  deleteBookmarkFolder,
  deleteBookmarkTrade,
  toggleBookmarkFolderArchive,
} from '../src/lib/storage/bookmarkMutations';
import { createEmptyStorageSchema } from '../src/lib/storage/schema';

describe('bookmark mutations', () => {
  it('archives a folder and moves it to the end of the folder list', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.folders = [
      {
        id: 'folder-1',
        title: 'First',
        version: '1',
        icon: null,
        archivedAt: null,
      },
      {
        id: 'folder-2',
        title: 'Second',
        version: '1',
        icon: null,
        archivedAt: null,
      },
    ];

    const nextSchema = toggleBookmarkFolderArchive(
      schema,
      { folderId: 'folder-1' },
      'archived-now',
    );

    expect(nextSchema.bookmarks.folders.map((folder) => folder.id)).toEqual([
      'folder-2',
      'folder-1',
    ]);
    expect(nextSchema.bookmarks.folders[1].archivedAt).toBe('archived-now');
  });

  it('deletes a trade without disturbing other trades in the folder', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.tradesByFolderId = {
      'folder-1': [
        {
          id: 'trade-1',
          title: 'First trade',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'first-trade',
          },
        },
        {
          id: 'trade-2',
          title: 'Second trade',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'second-trade',
          },
        },
      ],
    };

    const nextSchema = deleteBookmarkTrade(schema, {
      folderId: 'folder-1',
      tradeId: 'trade-1',
    });

    expect(nextSchema.bookmarks.tradesByFolderId['folder-1']).toHaveLength(1);
    expect(nextSchema.bookmarks.tradesByFolderId['folder-1'][0].id).toBe('trade-2');
  });

  it('deletes an archived folder, its trades, and its expanded state', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.folders = [
      {
        id: 'folder-1',
        title: 'First',
        version: '1',
        icon: null,
        archivedAt: 'archived-now',
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-1': [
        {
          id: 'trade-1',
          title: 'First trade',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'first-trade',
          },
        },
      ],
    };
    schema.preferences.expandedFolderIds = ['folder-1'];

    const nextSchema = deleteBookmarkFolder(schema, 'folder-1');

    expect(nextSchema.bookmarks.folders).toHaveLength(0);
    expect(nextSchema.bookmarks.tradesByFolderId['folder-1']).toBeUndefined();
    expect(nextSchema.preferences.expandedFolderIds).toEqual([]);
  });
});
