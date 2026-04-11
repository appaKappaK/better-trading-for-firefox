// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearPendingPinnedJump,
  isSessionPinsActive,
  loadPendingPinnedJump,
  loadSessionPinnedItems,
  savePendingPinnedJump,
  saveSessionPinnedItems,
  setSessionPinsActive,
} from '../src/content/pinnedSession';

describe('pinned session helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('stores and restores pinned items from sessionStorage', () => {
    saveSessionPinnedItems(window.sessionStorage, [
      {
        id: 'item-1',
        pinnedAt: '2026-04-11T00:00:00.000Z',
        price: '1×Divine Orb',
        sourcePath: '/trade/search/Standard/abc123',
        subtitle: 'Pinned from the current trade results.',
        title: 'The Taming',
      },
    ]);

    expect(loadSessionPinnedItems(window.sessionStorage)).toEqual([
      {
        id: 'item-1',
        pinnedAt: '2026-04-11T00:00:00.000Z',
        price: '1×Divine Orb',
        sourcePath: '/trade/search/Standard/abc123',
        subtitle: 'Pinned from the current trade results.',
        title: 'The Taming',
      },
    ]);
  });

  it('tracks session-pins activation and pending jumps', () => {
    expect(isSessionPinsActive(window.sessionStorage)).toBe(false);

    setSessionPinsActive(window.sessionStorage, true);

    expect(isSessionPinsActive(window.sessionStorage)).toBe(true);

    savePendingPinnedJump(window.sessionStorage, {
      itemId: 'item-1',
      sourcePath: '/trade/search/Standard/abc123',
      startedAt: 123,
    });

    expect(loadPendingPinnedJump(window.sessionStorage)).toEqual({
      itemId: 'item-1',
      sourcePath: '/trade/search/Standard/abc123',
      startedAt: 123,
    });

    clearPendingPinnedJump(window.sessionStorage);

    expect(loadPendingPinnedJump(window.sessionStorage)).toBeNull();
  });
});
