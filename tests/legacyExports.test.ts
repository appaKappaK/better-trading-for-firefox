import { describe, expect, it } from 'vitest';

import {
  generateLegacyBackupDataString,
  serializeLegacyFolderExport,
} from '../src/lib/legacy/bookmarkExports';
import {
  parseLegacyBackupData,
  parseLegacyFolderExport,
} from '../src/lib/legacy/bookmarkImports';

describe('legacy bookmark export generation', () => {
  it('round-trips v3 folder exports with unicode intact', () => {
    const serialized = serializeLegacyFolderExport(
      {
        icon: 'ascendancy',
        title: 'League Start 🔥',
        version: '2',
      },
      [
        {
          id: 'trade-1',
          title: 'Crossbow 💥',
          completedAt: null,
          location: {
            version: '2',
            type: 'search',
            slug: 'crossbow-starter',
          },
        },
      ],
    );

    const parsed = parseLegacyFolderExport(serialized);

    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('League Start 🔥');
    expect(parsed?.version).toBe('2');
    expect(parsed?.trades[0].title).toBe('Crossbow 💥');
  });

  it('generates backup text that preserves active and archived sections', () => {
    const backup = generateLegacyBackupDataString(
      [
        {
          id: 'folder-1',
          title: 'Active folder',
          version: '1',
          icon: 'exalt',
          archivedAt: null,
        },
        {
          id: 'folder-2',
          title: 'Archived folder',
          version: '2',
          icon: null,
          archivedAt: 'archived-now',
        },
      ],
      {
        'folder-1': [
          {
            id: 'trade-1',
            title: 'Active trade',
            completedAt: null,
            location: {
              version: '1',
              type: 'search',
              slug: 'active-search',
            },
          },
        ],
        'folder-2': [
          {
            id: 'trade-2',
            title: 'Archived trade',
            completedAt: null,
            location: {
              version: '2',
              type: 'search',
              slug: 'archived-search',
            },
          },
        ],
      },
    );

    const restored = parseLegacyBackupData(backup, {
      archivedAt: 'archived-restored',
    });

    expect(restored).toHaveLength(2);
    expect(restored[0].title).toBe('Active folder');
    expect(restored[0].archivedAt).toBeNull();
    expect(restored[1].title).toBe('Archived folder');
    expect(restored[1].archivedAt).toBe('archived-restored');
  });
});
