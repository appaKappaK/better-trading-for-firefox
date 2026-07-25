import { describe, expect, it } from 'vitest';

import {
  createEmptyStorageSchema,
  migrateStorageSchema,
  normalizeStoredSchema,
  STORAGE_SCHEMA_VERSION,
} from '../src/lib/storage/schema';
import { mergeImportedBookmarkFolders } from '../src/lib/storage/bookmarkImports';

describe('storage schema scaffolding', () => {
  it('creates an empty schema v1', () => {
    const schema = createEmptyStorageSchema('phase0-instance');

    expect(schema.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
    expect(schema.metadata.instanceId).toBe('phase0-instance');
    expect(schema.bookmarks.folders).toHaveLength(0);
    expect(schema.preferences.currentPage).toBe('bookmarks');
    expect(schema.preferences.hasCompletedOnboarding).toBe(false);
    expect(schema.preferences.persistPinnedItemsInSession).toBe(false);
  });

  it('migrates unknown input to an empty schema', () => {
    const schema = migrateStorageSchema(null, 'phase0-instance');

    expect(schema.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
    expect(schema.metadata.instanceId).toBe('phase0-instance');
  });

  it('fills missing defaults for partial schema data', () => {
    const schema = migrateStorageSchema({
      schemaVersion: 1,
      metadata: {
        instanceId: 'existing-instance',
      },
      preferences: {
        currentPage: 'history',
      },
    });

    expect(schema.metadata.instanceId).toBe('existing-instance');
    expect(schema.preferences.currentPage).toBe('history');
    expect(schema.preferences.disabledEnhancers).toEqual([]);
    expect(schema.preferences.hasCompletedOnboarding).toBe(false);
    expect(schema.preferences.persistPinnedItemsInSession).toBe(false);
  });

  it('repairs encoded history leagues, last-seen leagues, and fallback titles', () => {
    const migrated = migrateStorageSchema({
      schemaVersion: 1,
      metadata: {
        instanceId: 'existing-instance',
        updatedAt: '2026-04-10T00:00:00.000Z',
      },
      history: {
        entries: [
          {
            id: 'history-1',
            title: 'search/HC%20LANDMINED%20GSF%20(PL80003)/EB04ajr4S5',
            createdAt: '2026-04-10T00:00:00.000Z',
            version: '1',
            type: 'search',
            league: 'HC%20LANDMINED%20GSF%20(PL80003)',
            slug: 'EB04ajr4S5',
            isLive: false,
          },
          {
            id: 'history-2',
            title: 'Real Custom Title',
            createdAt: '2026-04-10T00:00:00.000Z',
            version: '2',
            type: 'search',
            league: 'poe2/HC%20Mirage',
            slug: 'xyz987',
            isLive: true,
          },
          {
            id: 'history-3',
            title: 'search/currentFallback',
            createdAt: '2026-04-10T00:00:00.000Z',
            version: '1',
            type: 'search',
            league: 'Standard',
            slug: 'currentFallback',
            isLive: false,
          },
        ],
      },
      preferences: {
        lastSeenLeagues: {
          '1': 'HC%20LANDMINED%20GSF%20(PL80003)',
          '2': 'poe2/HC%20Mirage',
        },
      },
    });

    const normalized = normalizeStoredSchema(migrated);

    expect(normalized.changed).toBe(true);
    expect(normalized.schema.metadata.updatedAt).toBe('2026-04-10T00:00:00.000Z');
    expect(normalized.schema.history.entries[0]).toMatchObject({
      league: 'HC LANDMINED GSF (PL80003)',
      title: 'Empty search',
    });
    expect(normalized.schema.history.entries[1]).toMatchObject({
      league: 'poe2/HC Mirage',
      title: 'Real Custom Title',
    });
    expect(normalized.schema.history.entries[2]).toMatchObject({
      league: 'Standard',
      title: 'Empty search',
    });
    expect(normalized.schema.preferences.lastSeenLeagues).toEqual({
      '1': 'HC LANDMINED GSF (PL80003)',
      '2': 'poe2/HC Mirage',
    });
    expect(normalizeStoredSchema(normalized.schema).changed).toBe(false);
  });

  it('merges imported folders into the schema', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    const merged = mergeImportedBookmarkFolders(
      schema,
      [
        {
          title: 'Imported Folder',
          version: '1',
          icon: 'exalt',
          archivedAt: null,
          trades: [
            {
              title: 'Imported Trade',
              completedAt: null,
              location: {
                version: '1',
                type: 'search',
                slug: 'foobar',
              },
            },
          ],
        },
      ],
      (() => {
        let index = 0;
        return () => `generated-${++index}`;
      })(),
    );

    expect(merged.bookmarks.folders).toHaveLength(1);
    expect(merged.bookmarks.folders[0].id).toBe('generated-1');
    expect(merged.bookmarks.tradesByFolderId['generated-1'][0].id).toBe(
      'generated-2',
    );
  });

  it('repairs unsupported stored bookmark colors to neutral', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.folders = [
      {
        archivedAt: null,
        color: 'ultraviolet',
        icon: null,
        id: 'folder-1',
        title: 'Invalid folder color',
        version: '1',
      } as never,
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-1': [
        {
          color: 'infrared',
          completedAt: null,
          id: 'trade-1',
          location: { version: '1', type: 'search', slug: 'invalid-color' },
          title: 'Invalid bookmark color',
        } as never,
      ],
    };

    const normalized = normalizeStoredSchema(schema);

    expect(normalized.changed).toBe(true);
    expect(normalized.schema.bookmarks.folders[0].color).toBeNull();
    expect(
      normalized.schema.bookmarks.tradesByFolderId['folder-1'][0].color,
    ).toBeNull();
    expect(normalizeStoredSchema(normalized.schema).changed).toBe(false);
  });

  it('repairs a malformed stored bookmark trade list instead of throwing', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.bookmarks.tradesByFolderId = {
      'folder-1': { unexpected: 'record' } as never,
    };

    const normalized = normalizeStoredSchema(schema);

    expect(normalized.changed).toBe(true);
    expect(normalized.schema.bookmarks.tradesByFolderId['folder-1']).toEqual([]);
    expect(normalizeStoredSchema(normalized.schema).changed).toBe(false);
  });
});
