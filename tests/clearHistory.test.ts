import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearStoredHistory } from '../src/lib/storage/runtime';
import { createEmptyStorageSchema } from '../src/lib/storage/schema';

const mockSchema = createEmptyStorageSchema('test-instance');
mockSchema.history.entries = [
  {
    id: 'entry-1',
    title: 'Some Trade Search',
    version: '1',
    league: 'Standard',
    type: 'search',
    slug: 'some-search',
    isLive: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'entry-2',
    title: 'Another Search',
    version: '2',
    league: 'Standard',
    type: 'search',
    slug: 'another-search',
    isLive: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

beforeEach(() => {
  vi.stubGlobal('browser', {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({ 'btff-schema-v1': mockSchema }),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
  });
});

describe('clearStoredHistory', () => {
  it('empties history entries and preserves the rest of the schema', async () => {
    const result = await clearStoredHistory();

    expect(result.history.entries).toHaveLength(0);
    expect(result.schemaVersion).toBe(1);
    expect(result.bookmarks).toEqual(mockSchema.bookmarks);
  });

  it('saves the updated schema to storage', async () => {
    await clearStoredHistory();

    expect(browser.storage.local.set).toHaveBeenCalledOnce();
    const saved = (browser.storage.local.set as ReturnType<typeof vi.fn>).mock
      .calls[0][0]['btff-schema-v1'];
    expect(saved.history.entries).toHaveLength(0);
  });
});
