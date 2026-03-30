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

  it('updates the saved current page only when it changes', () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    const updated = applyCurrentPagePreference(schema, 'history');

    expect(updated.preferences.currentPage).toBe('history');
    expect(applyCurrentPagePreference(updated, 'history')).toBe(updated);
  });
});
