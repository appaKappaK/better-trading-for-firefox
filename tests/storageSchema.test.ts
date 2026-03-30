import { describe, expect, it } from 'vitest';

import {
  createEmptyStorageSchema,
  migrateStorageSchema,
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
});
