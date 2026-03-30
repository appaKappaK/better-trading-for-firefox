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

    store.ensureButtons(document);

    const button = document.querySelector<HTMLButtonElement>('.btff-pin-button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Pin');

    button?.click();

    const items = store.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('The Taming');
    expect(items[0]?.price).toContain('Exact Price');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.row')?.classList.contains(PINNED_ROW_CLASS)).toBe(
      true,
    );
  });

  it('supports unpinning and clearing pinned rows', () => {
    const store = createPinnedItemsStore(document);

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
});
