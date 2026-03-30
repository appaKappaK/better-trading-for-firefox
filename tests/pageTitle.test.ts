// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPageTitleController,
  findActiveBookmarkTradeTitle,
  recommendSearchTitle,
} from '../src/content/pageTitle';
import { createEmptyStorageSchema } from '../src/lib/storage/schema';

describe('pageTitle controller', () => {
  beforeEach(() => {
    document.head.innerHTML = '<title>Base Site Title</title>';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('prefers matching titles from unarchived bookmark folders', () => {
    const schema = createEmptyStorageSchema('page-title-test');
    schema.bookmarks.folders = [
      {
        id: 'archived-folder',
        title: 'Archived',
        version: '1',
        icon: null,
        archivedAt: '2026-03-30T00:00:00.000Z',
      },
      {
        id: 'active-folder',
        title: 'Active',
        version: '1',
        icon: null,
        archivedAt: null,
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'archived-folder': [
        {
          id: 'trade-1',
          title: 'Archived Match',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'matching-slug',
          },
        },
      ],
      'active-folder': [
        {
          id: 'trade-2',
          title: 'Zulu Match',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'matching-slug',
          },
        },
        {
          id: 'trade-3',
          title: 'Alpha Match',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'matching-slug',
          },
        },
      ],
    };

    const title = findActiveBookmarkTradeTitle(schema, {
      version: '1',
      type: 'search',
      slug: 'matching-slug',
    });

    expect(title).toBe('Alpha Match');
  });

  it('recommends a search title from the name first, then category and rarity', () => {
    document.body.innerHTML = createSearchPanelMarkup({
      category: 'Any Jewel',
      name: 'Belly of the Beast Full Wyrmscale',
      rarity: 'Rare',
    });

    expect(recommendSearchTitle(document)).toBe('Belly of the Beast Full Wyrmscale');

    document.body.innerHTML = createSearchPanelMarkup({
      category: 'Any Jewel',
      name: '',
      rarity: 'Rare',
    });

    expect(recommendSearchTitle(document)).toBe('Any Jewel (Rare)');
  });

  it('updates the document title and history source title for live searches', () => {
    document.body.innerHTML = createSearchPanelMarkup({
      category: 'Any Jewel',
      name: '',
      rarity: 'Rare',
    });

    const controller = createPageTitleController(document);

    controller.update(null, {
      version: '1',
      type: 'search',
      league: 'Standard',
      slug: 'rare-jewel',
      isLive: true,
    });

    expect(document.title).toBe('LIVE Any Jewel (Rare) - Base Site Title');
    expect(controller.getHistorySourceTitle()).toBe('Any Jewel (Rare)');
  });

  it('preserves woop counts when the site mutates the tab title', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = createSearchPanelMarkup({
      category: 'Any Jewel',
      name: 'Search Panel Recommendation',
      rarity: 'Rare',
    });

    const controller = createPageTitleController(document);
    controller.connect();
    controller.update(null, {
      version: '1',
      type: 'search',
      league: 'Standard',
      slug: 'search-slug',
      isLive: false,
    });

    document.title = '(32) Base Site Title';
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(101);

    expect(document.title).toBe('(32) Search Panel Recommendation - Base Site Title');

    controller.disconnect();
  });
});

function createSearchPanelMarkup(input: {
  category: string;
  name: string;
  rarity: string;
}) {
  return `
    <div class="search-panel">
      <div class="search-bar">
        <div class="search-left">
          <input value="${input.name}">
        </div>
      </div>
    </div>
    <div class="search-advanced-items">
      <div class="filter-group">
        <div class="filter-property">
          <input value="${input.category}">
        </div>
        <div class="filter-property">
          <input value="${input.rarity}">
        </div>
      </div>
    </div>
  `;
}
