import { describe, expect, it } from 'vitest';

import { createEmptyStorageSchema } from '../src/lib/storage/schema';
import {
  applyCurrentPagePreference,
  applyTradePageContext,
} from '../src/lib/storage/tradeContext';

describe('trade context storage helpers', () => {
  it('logs a new history entry and tracks the last seen league', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    const updated = applyTradePageContext(
      schema,
      {
        version: '1',
        type: 'search',
        league: 'Standard',
        slug: 'abc123',
        isLive: false,
      },
      'Starter Search',
      () => 'history-1',
    );

    expect(updated.history.entries).toHaveLength(1);
    expect(updated.history.entries[0]).toMatchObject({
      id: 'history-1',
      title: 'Starter Search',
      version: '1',
      type: 'search',
      league: 'Standard',
      slug: 'abc123',
      isLive: false,
    });
    expect(updated.preferences.lastSeenLeagues['1']).toBe('Standard');
  });

  it('does not append duplicate history when only live state changes', () => {
    const schema = applyTradePageContext(
      createEmptyStorageSchema('phase0-instance'),
      {
        version: '1',
        type: 'search',
        league: 'Standard',
        slug: 'abc123',
        isLive: false,
      },
      'Starter Search',
      () => 'history-1',
    );

    const updated = applyTradePageContext(
      schema,
      {
        version: '1',
        type: 'search',
        league: 'Standard',
        slug: 'abc123',
        isLive: true,
      },
      'Starter Search',
      () => 'history-2',
    );

    expect(updated.history.entries).toHaveLength(1);
    expect(updated.history.entries[0].id).toBe('history-1');
  });

  it('corrects the newest same-search title when active filters change', () => {
    const location = {
      version: '1' as const,
      type: 'search',
      league: 'Allflame',
      slug: 'boots-search',
      isLive: false,
    };
    const schema = applyTradePageContext(
      createEmptyStorageSchema('phase0-instance'),
      location,
      'Boots (Normal)',
      () => 'history-1',
    );
    const createdAt = schema.history.entries[0].createdAt;

    const updated = applyTradePageContext(
      schema,
      location,
      '',
      () => 'history-2',
    );

    expect(updated.history.entries).toHaveLength(1);
    expect(updated.history.entries[0]).toMatchObject({
      id: 'history-1',
      title: 'Empty search',
      createdAt,
    });
  });

  it('stores a readable fallback title when a search has no name', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    const updated = applyTradePageContext(
      schema,
      {
        version: '1',
        type: 'search',
        league: 'HC LANDMINED GSF (PL80003)',
        slug: 'EB04ajr4S5',
        isLive: false,
      },
      '   ',
      () => 'history-1',
    );

    expect(updated.history.entries[0]).toMatchObject({
      id: 'history-1',
      title: 'Empty search',
      league: 'HC LANDMINED GSF (PL80003)',
    });
  });

  it('updates the saved current page only when it changes', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    const updated = applyCurrentPagePreference(schema, 'history');

    expect(updated.preferences.currentPage).toBe('history');
    expect(applyCurrentPagePreference(updated, 'history')).toBe(updated);
  });
});
