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

  it('records a changed title only after a different search location loads', () => {
    const wereclawLocation = {
      version: '1' as const,
      type: 'search',
      league: 'Allflame',
      slug: 'wereclaw-search',
      isLive: false,
    };
    const schema = applyTradePageContext(
      createEmptyStorageSchema('phase0-instance'),
      wereclawLocation,
      'Wereclaw Talisman',
      () => 'history-1',
    );

    const draftUpdate = applyTradePageContext(
      schema,
      wereclawLocation,
      'Shadowed Ring',
      () => 'history-2',
    );

    expect(draftUpdate).toBe(schema);
    expect(draftUpdate.history.entries.map(({ title }) => title)).toEqual([
      'Wereclaw Talisman',
    ]);

    const submittedSearch = applyTradePageContext(
      draftUpdate,
      {
        ...wereclawLocation,
        slug: 'shadowed-ring-search',
      },
      'Shadowed Ring',
      () => 'history-2',
    );

    expect(submittedSearch.history.entries).toHaveLength(2);
    expect(
      submittedSearch.history.entries.map(({ id, title }) => ({ id, title })),
    ).toEqual([
      { id: 'history-2', title: 'Shadowed Ring' },
      { id: 'history-1', title: 'Wereclaw Talisman' },
    ]);
  });

  it('keeps repeated readable titles for distinct submitted searches', () => {
    const schema = applyTradePageContext(
      createEmptyStorageSchema('phase0-instance'),
      {
        version: '1',
        type: 'search',
        league: 'Allflame',
        slug: 'wereclaw-filter-set-1',
        isLive: false,
      },
      'Wereclaw Talisman',
      () => 'history-1',
    );

    const updated = applyTradePageContext(
      schema,
      {
        version: '1',
        type: 'search',
        league: 'Allflame',
        slug: 'wereclaw-filter-set-2',
        isLive: false,
      },
      'Wereclaw Talisman',
      () => 'history-2',
    );

    expect(updated.history.entries.map(({ id, title }) => ({ id, title }))).toEqual(
      [
        { id: 'history-2', title: 'Wereclaw Talisman' },
        { id: 'history-1', title: 'Wereclaw Talisman' },
      ],
    );
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
