import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  completeStoredOnboarding,
  startFreshSchema,
  STORAGE_SCHEMA_KEY,
} from '../src/lib/storage/runtime';
import {
  createEmptyStorageSchema,
  type StorageSchemaV1,
} from '../src/lib/storage/schema';

const POE_NINJA_CACHE_KEY = 'btff-poe-ninja-chaos-ratios:Standard';
const UNRELATED_STORAGE_KEY = 'unrelated-extension-state';

describe('startFreshSchema', () => {
  let currentSchema: StorageSchemaV1;
  let getMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;
  let removeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    currentSchema = createEmptyStorageSchema('existing-instance');
    currentSchema.bookmarks.folders = [
      {
        id: 'folder-1',
        title: 'Headhunters',
        version: '1',
        icon: 'divine',
        archivedAt: null,
      },
    ];
    currentSchema.bookmarks.tradesByFolderId = {
      'folder-1': [
        {
          id: 'trade-1',
          title: 'Headhunter under 20 Divine',
          completedAt: null,
          location: { version: '1', type: 'search', slug: 'trade-slug' },
        },
      ],
    };
    currentSchema.history.entries = [
      {
        id: 'history-1',
        title: 'Headhunter',
        createdAt: '2026-07-24T00:00:00.000Z',
        version: '1',
        type: 'search',
        league: 'Standard',
        slug: 'history-slug',
        isLive: false,
      },
    ];
    currentSchema.pinnedItems.itemIds = ['pinned-1'];
    currentSchema.caches.poeNinjaChaosRatiosByLeague.Standard = {
      expiresAt: '2026-07-25T00:00:00.000Z',
      fetchedAt: '2026-07-24T00:00:00.000Z',
      value: { divine: 180 },
    };
    currentSchema.preferences = {
      ...currentSchema.preferences,
      currentPage: 'history',
      dismissedChangelog: '1.1.0',
      expandedFolderIds: ['folder-1'],
      disabledEnhancers: ['equivalent-pricings'],
      sidePanelCollapsed: true,
      sidePanelDraggable: true,
      sidePanelSidebar: true,
      hasCompletedOnboarding: true,
      persistPinnedItemsInSession: true,
      popupIntroHidden: true,
      lastSeenLeagues: { '1': 'Standard', '2': 'Dawn of the Hunt' },
      pendingUpdateNotice: '1.2.0',
    };

    getMock = vi.fn(async (key: string | string[] | null) => {
      if (key === null) {
        return {
          [STORAGE_SCHEMA_KEY]: currentSchema,
          [POE_NINJA_CACHE_KEY]: { value: {} },
          [UNRELATED_STORAGE_KEY]: 'keep-me',
        };
      }

      return { [STORAGE_SCHEMA_KEY]: currentSchema };
    });
    setMock = vi.fn(async (value: Record<string, unknown>) => {
      currentSchema = value[STORAGE_SCHEMA_KEY] as StorageSchemaV1;
    });
    removeMock = vi.fn(async () => {});

    vi.stubGlobal('browser', {
      storage: {
        local: {
          get: getMock,
          remove: removeMock,
          set: setMock,
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears saved trading data while preserving durable settings', async () => {
    const result = await startFreshSchema();

    expect(result.metadata.instanceId).not.toBe('existing-instance');
    expect(result.bookmarks).toEqual({ folders: [], tradesByFolderId: {} });
    expect(result.history.entries).toEqual([]);
    expect(result.pinnedItems.itemIds).toEqual([]);
    expect(result.caches.poeNinjaChaosRatiosByLeague).toEqual({});

    expect(result.preferences).toMatchObject({
      currentPage: 'bookmarks',
      dismissedChangelog: null,
      expandedFolderIds: [],
      disabledEnhancers: ['equivalent-pricings'],
      sidePanelCollapsed: true,
      sidePanelDraggable: true,
      sidePanelSidebar: true,
      hasCompletedOnboarding: true,
      persistPinnedItemsInSession: true,
      popupIntroHidden: true,
      lastSeenLeagues: { '1': null, '2': null },
      pendingUpdateNotice: null,
    });
    expect(currentSchema).toEqual(result);
  });

  it('completes onboarding without clearing saved data or settings', async () => {
    currentSchema.preferences.hasCompletedOnboarding = false;
    const schemaBeforeOnboarding = structuredClone(currentSchema);

    const result = await completeStoredOnboarding();

    expect(result.metadata.instanceId).toBe(
      schemaBeforeOnboarding.metadata.instanceId,
    );
    expect(result.bookmarks).toEqual(schemaBeforeOnboarding.bookmarks);
    expect(result.history).toEqual(schemaBeforeOnboarding.history);
    expect(result.pinnedItems).toEqual(schemaBeforeOnboarding.pinnedItems);
    expect(result.caches).toEqual(schemaBeforeOnboarding.caches);
    expect(result.preferences).toEqual({
      ...schemaBeforeOnboarding.preferences,
      hasCompletedOnboarding: true,
    });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('removes pricing caches without deleting unrelated local storage', async () => {
    await startFreshSchema();

    expect(getMock).toHaveBeenCalledWith(null);
    expect(removeMock).toHaveBeenCalledOnce();
    expect(removeMock).toHaveBeenCalledWith([POE_NINJA_CACHE_KEY]);
    expect(removeMock).not.toHaveBeenCalledWith(
      expect.arrayContaining([UNRELATED_STORAGE_KEY]),
    );
  });
});
