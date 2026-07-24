import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadStoredSchema, STORAGE_SCHEMA_KEY } from '../src/lib/storage/runtime';

describe('loadStoredSchema', () => {
  let storedValue: Record<string, unknown>;
  let getMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storedValue = {
      [STORAGE_SCHEMA_KEY]: {
        schemaVersion: 1,
        metadata: {
          instanceId: 'test-instance',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
        bookmarks: {
          folders: [],
          tradesByFolderId: {},
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
          ],
        },
        pinnedItems: {
          itemIds: [],
        },
        preferences: {
          currentPage: 'history',
          dismissedChangelog: null,
          expandedFolderIds: [],
          disabledEnhancers: [],
          sidePanelCollapsed: false,
          sidePanelDraggable: false,
          sidePanelSidebar: false,
          hasCompletedOnboarding: true,
          lastSeenLeagues: {
            '1': 'HC%20LANDMINED%20GSF%20(PL80003)',
            '2': null,
          },
          pendingUpdateNotice: null,
        },
        caches: {
          poeNinjaChaosRatiosByLeague: {},
        },
      },
    };

    getMock = vi.fn().mockImplementation(async () => storedValue);
    setMock = vi.fn().mockImplementation(async (nextValue) => {
      storedValue = nextValue;
    });

    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: getMock,
          set: setMock,
        },
      },
    });
  });

  it('persists repaired schema data once and skips future no-op loads', async () => {
    const firstLoad = await loadStoredSchema();

    expect(firstLoad.history.entries[0]).toMatchObject({
      league: 'HC LANDMINED GSF (PL80003)',
      title: 'Empty search',
    });
    expect(firstLoad.preferences.lastSeenLeagues['1']).toBe(
      'HC LANDMINED GSF (PL80003)',
    );
    expect(setMock).toHaveBeenCalledOnce();
    expect(
      (storedValue[STORAGE_SCHEMA_KEY] as any).history.entries[0].league,
    ).toBe('HC LANDMINED GSF (PL80003)');

    setMock.mockClear();

    const secondLoad = await loadStoredSchema();

    expect(secondLoad.history.entries[0]).toMatchObject({
      league: 'HC LANDMINED GSF (PL80003)',
      title: 'Empty search',
    });
    expect(setMock).not.toHaveBeenCalled();
  });
});
