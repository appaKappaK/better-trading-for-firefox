// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPinnedItemsStore,
  PINNED_ITEMS_HOST_PAGE_STYLES,
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

  it('does not mutate button children when an unchanged row is enhanced again', () => {
    const store = createPinnedItemsStore(document);
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { childList: true, subtree: true });

    store.ensureButtons(document);
    observer.takeRecords();
    store.ensureButtons(document);

    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it('keeps native result actions intact and centers Pin below their row', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="pinned-row-1" class="row">
          <div class="right">
            <div class="details">
              <div class="btns">
                <button>Ignore Player</button>
                <button>Show 2 similar</button>
              </div>
            </div>
          </div>
        </div>
        <div data-id="fallback-row" class="row">
          <div class="right">
            <div class="details"></div>
          </div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = PINNED_ITEMS_HOST_PAGE_STYLES;
    document.head.append(style);

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);

    const nativeButtons = document.querySelector('.btns');
    const pinHost = document.querySelector<HTMLElement>(
      '[data-id="pinned-row-1"] .btff-pin-action-host',
    );
    const fallbackHost = document.querySelector<HTMLElement>(
      '[data-id="fallback-row"] .btff-pin-action-host',
    );

    expect(
      Array.from(nativeButtons?.children ?? []).map((element) => element.textContent),
    ).toEqual(['Ignore Player', 'Show 2 similar']);
    expect(nativeButtons?.nextElementSibling).toBe(pinHost);
    expect(nativeButtons?.querySelector('.btff-pin-button')).toBeNull();
    expect(pinHost?.querySelector('.btff-pin-button')?.textContent).toBe('Pin');
    expect(getComputedStyle(pinHost!).display).toBe('flex');
    expect(getComputedStyle(pinHost!).justifyContent).toBe('center');
    expect(getComputedStyle(pinHost!).gap).toBe('6px');
    expect(getComputedStyle(pinHost!).marginTop).toBe('8px');
    expect(getComputedStyle(fallbackHost!).marginTop).not.toBe('8px');

    style.remove();
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

  it('captures names and metadata from current trade item headers', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="seismic-trap-result" class="row">
          <div class="middle">
            <div class="itemHeader">
              <span class="l"></span>
              <span class="lc">Seismic Trap</span>
              <span class="r"></span>
            </div>
            <span data-field="ilvl">Item Level: 80</span>
          </div>
          <div class="right">
            <div class="details">
              <span class="account-name">keikomushi#2394</span>
              <div class="btns"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);
    document.querySelector<HTMLButtonElement>('.btff-pin-button')?.click();

    expect(store.getItems()[0]).toMatchObject({
      title: 'Seismic Trap',
      subtitle: 'Item Level: 80 | keikomushi#2394',
    });
  });

  it('captures the currency icon URL from a structured trade price', () => {
    const currencyIconUrl =
      'https://web.poecdn.com/image/Art/2DItems/Currency/ConflictOrb.png';
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="conflict-price-result" class="row">
          <div class="left">
            <div class="icon"><img src="https://web.poecdn.com/item.png"></div>
          </div>
          <div class="middle">
            <div class="itemName"><span class="lc">Test item</span></div>
          </div>
          <div class="right">
            <div class="details">
              <span data-field="price">
                <span class="price-label">Exact Price:</span><br>
                <span>1</span>
                <span class="currency-text"><span>Orb of Conflict</span></span>
                <span class="currency-image"><img src="${currencyIconUrl}"></span>
              </span>
              <div class="btns"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);
    document.querySelector<HTMLButtonElement>('.btff-pin-button')?.click();

    expect(store.getItems()[0]).toMatchObject({
      currencyIconUrl,
      imageUrl: 'https://web.poecdn.com/item.png',
      price: '1×Orb of Conflict',
    });
  });

  it('uses an item base type as useful context without replacing the item name', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="winterheart-result" class="row">
          <div class="middle">
            <div class="itemHeader doubleLine">
              <div class="itemName"><span class="lc">Winterheart</span></div>
              <div class="itemName typeLine"><span class="lc">Gold Amulet</span></div>
            </div>
            <span data-field="ilvl">Item Level: 80</span>
          </div>
        </div>
      </div>
    `;

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);
    document.querySelector<HTMLButtonElement>('.btff-pin-button')?.click();

    expect(store.getItems()[0]).toMatchObject({
      title: 'Winterheart',
      subtitle: 'Gold Amulet | Item Level: 80',
    });
  });

  it('captures a visible item header without legacy name wrappers', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="direct-header-result" class="row">
          <div class="middle">
            <div class="itemHeader">The Adorned</div>
            <span data-field="ilvl">Item Level: 80</span>
          </div>
          <div class="right">
            <div class="details">
              <span class="account-name">pedrorjeupiece#1234</span>
              <div class="btns"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);
    document.querySelector<HTMLButtonElement>('.btff-pin-button')?.click();

    expect(store.getItems()[0]).toMatchObject({
      title: 'The Adorned',
      subtitle: 'Item Level: 80 | pedrorjeupiece#1234',
    });
  });

  it('captures names from the current trade-site item popup header', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="mageblood-result" class="row">
          <div class="middle">
            <div class="item-popup__header">
              <div class="item-popup__header-line">Mageblood</div>
              <div class="item-popup__header-line">Heavy Belt</div>
            </div>
            <span data-field="ilvl">Item Level: 85</span>
          </div>
          <div class="right">
            <div class="details">
              <span class="account-name">thelonejedi#7724</span>
              <div class="btns"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);
    document.querySelector<HTMLButtonElement>('.btff-pin-button')?.click();

    expect(store.getItems()[0]).toMatchObject({
      subtitle: 'Heavy Belt | Item Level: 85 | thelonejedi#7724',
      title: 'Mageblood',
    });
  });

  it('never exposes a result id when a trade row has no readable title', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="1c1e43849c94cdde4e01e8ba2ec7" class="row"></div>
      </div>
    `;

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);
    document.querySelector<HTMLButtonElement>('.btff-pin-button')?.click();

    expect(store.getItems()[0]?.title).toBe('Pinned item');
    expect(store.getItems()[0]?.title).not.toContain('1c1e43849c94cdde4e01e8ba2ec7');
  });

  it('refreshes a legacy placeholder title when its result row becomes available', () => {
    const store = createPinnedItemsStore(document);
    store.replaceItems([
      {
        currencyIconUrl: 'https://web.poecdn.com/currency.png',
        id: 'pinned-row-1',
        pinnedAt: '2026-04-11T00:00:00.000Z',
        price: '100×Chaos Orb',
        sourcePath: '/trade/search/Standard/test-search',
        subtitle: 'Pinned from the current trade results.',
        title: 'Pinned result pinned-row-1',
      },
    ]);
    const listener = vi.fn();
    store.subscribe(listener);

    store.ensureButtons(document);

    expect(store.getItem('pinned-row-1')).toMatchObject({
      currencyIconUrl: 'https://web.poecdn.com/currency.png',
      pinnedAt: '2026-04-11T00:00:00.000Z',
      title: 'The Taming',
    });
    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'The Taming' }),
    ]);
  });

  it('repairs a pinned title when the official item header renders late', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="late-header-row" class="row">
          <div class="middle">
            <span data-field="ilvl">Item Level: 80</span>
          </div>
          <div class="right">
            <div class="details">
              <span class="account-name">yukito9x#6994</span>
              <div class="btns"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const store = createPinnedItemsStore(document);
    store.ensureButtons(document);
    document.querySelector<HTMLButtonElement>('.btff-pin-button')?.click();

    const originalPinnedAt = store.getItem('late-header-row')?.pinnedAt;
    expect(store.getItem('late-header-row')?.title).toBe('Pinned item');

    document.querySelector('.middle')?.insertAdjacentHTML(
      'afterbegin',
      `
        <div class="itemHeader doubleLine">
          <div class="itemName"><span class="lc">Headhunter</span></div>
          <div class="itemName typeLine"><span class="lc">Leather Belt</span></div>
        </div>
      `,
    );
    store.ensureButtons(document);

    expect(store.getItem('late-header-row')).toMatchObject({
      pinnedAt: originalPinnedAt,
      subtitle: 'Leather Belt | Item Level: 80 | yukito9x#6994',
      title: 'Headhunter',
    });
  });
});
