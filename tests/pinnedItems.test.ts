// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  createPinnedItemsStore,
  PINNED_ROW_CLASS,
} from '../src/content/pinnedItems';

describe('pinnedItems store', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="pinned-row-1" class="row">
          <div class="middle">
            <div class="itemName"><span class="lc">The Taming</span></div>
            <div class="itemName typeLine"><span class="lc">Prismatic Ring</span></div>
            <div class="itemLevel">Item Level: 80</div>
          </div>
          <div class="right">
            <div class="details">
              <div class="price">Exact Price: 100 Chaos Orb</div>
              <div class="btns"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  it('injects a row-level pin button and records pinned items', () => {
    const store = createPinnedItemsStore(document);
    store.setSourcePath('/trade/search/Standard/test-search');

    store.ensureButtons(document);

    const button = document.querySelector<HTMLButtonElement>('.btff-pin-button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Pin');

    button?.click();

    const items = store.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('The Taming');
    expect(items[0]?.price).toContain('Exact Price');
    expect(items[0]?.sourcePath).toBe('/trade/search/Standard/test-search');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.row')?.classList.contains(PINNED_ROW_CLASS)).toBe(
      true,
    );
  });

  it('supports unpinning and clearing pinned rows', () => {
    const store = createPinnedItemsStore(document);
    store.setSourcePath('/trade/search/Standard/test-search');

    store.ensureButtons(document);

    const button = document.querySelector<HTMLButtonElement>('.btff-pin-button');
    button?.click();
    expect(store.getItems()).toHaveLength(1);

    button?.click();
    expect(store.getItems()).toHaveLength(0);
    expect(button?.getAttribute('aria-pressed')).toBe('false');

    button?.click();
    expect(store.getItems()).toHaveLength(1);

    store.clear();

    expect(store.getItems()).toHaveLength(0);
    expect(document.querySelector('.row')?.classList.contains(PINNED_ROW_CLASS)).toBe(
      false,
    );
  });

  it('can restore pinned items and detect whether their row is on the current page', () => {
    const store = createPinnedItemsStore(document);

    store.replaceItems([
      {
        id: 'pinned-row-1',
        pinnedAt: '2026-04-11T00:00:00.000Z',
        price: '100×Chaos Orb',
        sourcePath: '/trade/search/Standard/test-search',
        subtitle: 'Item Level: 80',
        title: 'The Taming',
      },
      {
        id: 'missing-row',
        pinnedAt: '2026-04-11T00:00:00.000Z',
        price: null,
        sourcePath: '/trade/search/Standard/other-search',
        subtitle: 'Pinned from the current trade results.',
        title: 'Missing Result',
      },
    ]);

    expect(store.getItem('pinned-row-1')?.sourcePath).toBe(
      '/trade/search/Standard/test-search',
    );
    expect(store.hasRow('pinned-row-1')).toBe(true);
    expect(store.hasRow('missing-row')).toBe(false);
  });
});
