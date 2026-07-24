// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Phase0Panel } from '../src/content/Phase0Panel';
import { createEmptyStorageSchema } from '../src/lib/storage/schema';
import type { TradePageSnapshot } from '../src/content/tradePage';

describe('Phase0Panel collapse chrome', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => {
      root.unmount();
    });
    vi.useRealTimers();
    container.remove();
    document.body.innerHTML = '';
  });

  it('renders a compact launcher when the side panel is collapsed', async () => {
    const onSetCollapsed = vi.fn();
    const onActivatePinnedItem = vi.fn();

    await renderPanel({
      isCollapsed: true,
      isPinnedItemOnCurrentPage: () => false,
      onActivatePinnedItem,
      onSetCollapsed,
      pinnedItems: [
        {
          id: 'pinned-1',
          imageUrl: 'https://example.com/item.png',
          pinnedAt: '2026-03-30T00:00:00.000Z',
          price: 'Exact Price: 50 Chaos Orb',
          sourcePath: '/trade/search/Standard/example-slug',
          subtitle: 'PoE 1 | Standard',
          title: 'Vaal Regalia',
        },
      ],
      snapshot: {
        ...createSnapshot(),
        resultsFound: 12,
      },
    });

    expect(container.querySelector('.btff-panel')).toBeNull();
    expect(container.querySelector('.btff-panel-dock__drag-handle')).toBeNull();
    expect(
      container.querySelector('.btff-panel-dock__button')?.getAttribute('title'),
    ).toBe('Drag to move; click to expand');
    expect(container.querySelector('.btff-panel-dock__button')?.textContent).toContain(
      'Better Trading',
    );
    expect(container.querySelector('.btff-panel-dock__button')?.textContent).toContain(
      '1 pinned | 12 results',
    );
    expect(container.querySelector('.btff-panel-dock__pinned-jump')?.textContent).toBe(
      'Open',
    );
    expect(
      container.querySelector('.btff-panel-dock__pinned-jump')?.getAttribute('title'),
    ).toBe('Open saved search for pinned item');
    expect(
      container.querySelector<HTMLImageElement>('.btff-panel-dock__pinned-thumb')
        ?.draggable,
    ).toBe(false);

    container
      .querySelector<HTMLButtonElement>('.btff-panel-dock__button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSetCollapsed).toHaveBeenCalledWith(false);

    container
      .querySelector<HTMLButtonElement>('.btff-panel-dock__pinned-jump')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onActivatePinnedItem).toHaveBeenCalledWith('pinned-1');
  });

  it('renders a collapse button in the full panel chrome', async () => {
    const onSetCollapsed = vi.fn();

    await renderPanel({
      isCollapsed: false,
      onSetCollapsed,
    });

    expect(container.querySelector('.btff-panel')).not.toBeNull();
    expect(container.querySelector('.btff-panel__chrome-button')?.textContent).toContain(
      'Shrink',
    );

    container
      .querySelector<HTMLButtonElement>('.btff-panel__chrome-button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSetCollapsed).toHaveBeenCalledWith(true);
  });

  it('labels the footer with bookmark count instead of saved trade rows', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.bookmarks.folders = [
      {
        id: 'folder-one',
        title: 'One',
        version: '1',
        icon: null,
        archivedAt: null,
      },
      {
        id: 'folder-two',
        title: 'Two',
        version: '1',
        icon: null,
        archivedAt: null,
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-one': [
        {
          id: 'trade-one',
          title: 'One',
          completedAt: null,
          location: { version: '1', type: 'search', slug: 'one' },
        },
        {
          id: 'trade-two',
          title: 'Two',
          completedAt: null,
          location: { version: '1', type: 'search', slug: 'two' },
        },
      ],
      'folder-two': [
        {
          id: 'trade-three',
          title: 'Three',
          completedAt: null,
          location: { version: '1', type: 'search', slug: 'three' },
        },
      ],
    };

    await renderPanel({ schema });

    expect(container.querySelector('.btff-panel__footer')?.textContent).toContain(
      '2 bookmarks',
    );
    expect(container.querySelector('.btff-panel__footer')?.textContent).not.toContain(
      '3 saved trades',
    );
  });

  it('shrinks from a logo double-click while preserving single-click dragging space', async () => {
    const onSetCollapsed = vi.fn();

    await renderPanel({ onSetCollapsed });

    const logoButton = container.querySelector<HTMLButtonElement>(
      '.btff-panel__logo-button',
    );
    expect(logoButton?.getAttribute('title')).toBe('Double-click to shrink');

    logoButton?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    expect(onSetCollapsed).not.toHaveBeenCalled();

    logoButton?.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, detail: 2 }),
    );
    expect(onSetCollapsed).toHaveBeenCalledWith(true);
  });

  it('renders PoE2 history league pills and keeps trade links encoded', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.history.entries = [
      {
        id: 'history-1',
        title: 'search/kqEmw8Wf5',
        createdAt: '2026-04-10T00:00:00.000Z',
        version: '2',
        type: 'search',
        league: 'poe2/Fate of the Vaal',
        slug: 'kqEmw8Wf5',
        isLive: false,
      },
    ];

    await renderPanel({
      currentPage: 'history',
      schema,
    });

    const leaguePill = Array.from(
      container.querySelectorAll('.btff-history-pill'),
    ).find((node) => node.textContent === 'PoE2 - Fate of the Vaal');
    const historyLink = container.querySelector<HTMLAnchorElement>(
      '.btff-panel__history-item .btff-panel__trade-link',
    );

    expect(leaguePill).toBeTruthy();
    expect(container.textContent).not.toContain('poe2/');
    expect(historyLink?.href).toContain(
      '/trade2/search/poe2/Fate%20of%20the%20Vaal/kqEmw8Wf5',
    );
  });

  it('formats PoE2 current trade labels in quick save without changing links', async () => {
    await renderPanel({
      snapshot: {
        ...createSnapshot(),
        currentPath: '/trade2/search/poe2/Fate%20of%20the%20Vaal/kqEmw8Wf5',
        tradeLocation: {
          version: '2',
          type: 'search',
          league: 'poe2/Fate of the Vaal',
          slug: 'kqEmw8Wf5',
          isLive: false,
        },
        version: 'poe2',
      },
    });

    flushSync(() => {
      container
        .querySelector<HTMLButtonElement>('.btff-panel__composer-toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('search | PoE2 - Fate of the Vaal | kqEmw8Wf5');
    expect(container.textContent).not.toContain('search | poe2/Fate of the Vaal |');
  });

  it('uses descriptive Quick Save examples instead of an opaque trade slug', async () => {
    await renderPanel({
      snapshot: {
        ...createSnapshot(),
        currentPath: '/trade/search/Standard/d8kyqjooUJ',
        tradeLocation: {
          version: '1',
          type: 'search',
          league: 'Standard',
          slug: 'd8kyqjooUJ',
          isLive: false,
        },
      },
    });

    flushSync(() => {
      container
        .querySelector<HTMLButtonElement>('.btff-panel__composer-toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const fields = Array.from(
      container.querySelectorAll<HTMLLabelElement>('.btff-panel__field'),
    );
    const folderField = fields.find((field) =>
      field.textContent?.includes('Folder name'),
    );
    const bookmarkField = fields.find((field) =>
      field.textContent?.includes('Bookmark name'),
    );
    const folderInput = folderField?.querySelector<HTMLInputElement>('input');
    const bookmarkInput = bookmarkField?.querySelector<HTMLInputElement>('input');

    expect(folderInput?.placeholder).toBe('e.g. Belt upgrades');
    expect(bookmarkInput?.placeholder).toBe(
      'e.g. Headhunter under 20 Divine',
    );
    expect(bookmarkInput?.placeholder).not.toContain('d8kyqjooUJ');
  });

  it('explains how to make Quick Save available when no trade is open', async () => {
    await renderPanel();

    flushSync(() => {
      container
        .querySelector<HTMLButtonElement>('.btff-panel__composer-toggle')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain(
      'Open a Path of Exile trade search to save it as a bookmark.',
    );
  });

  it('uses selected-state and action hierarchy instead of making every choice gold', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.preferences.expandedFolderIds = ['folder-1'];
    schema.bookmarks.folders = [
      {
        id: 'folder-1',
        title: 'Belts',
        version: '1',
        icon: 'divine',
        archivedAt: null,
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-1': [
        {
          id: 'trade-1',
          title: 'Headhunter',
          completedAt: null,
          location: { version: '1', type: 'search', slug: 'trade-1' },
        },
      ],
    };

    await renderPanel({
      schema,
      snapshot: {
        ...createSnapshot(),
        tradeLocation: {
          version: '1',
          type: 'search',
          league: 'Standard',
          slug: 'current-search',
          isLive: false,
        },
      },
    });
    flushSync(() => {
      container
        .querySelector<HTMLButtonElement>('.btff-panel__composer-toggle')
        ?.click();
    });

    const existingFolder = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.btff-panel__inline-actions button'),
    ).find((button) => button.textContent === 'Existing folder');
    const newFolder = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.btff-panel__inline-actions button'),
    ).find((button) => button.textContent === 'New folder');
    const markDone = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent === 'Mark done',
    );
    const useCurrentSearch = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent === 'Use current search');

    expect(existingFolder?.getAttribute('aria-pressed')).toBe('true');
    expect(newFolder?.getAttribute('aria-pressed')).toBe('false');
    expect(existingFolder?.classList.contains('btff-panel__mini-button--choice')).toBe(
      true,
    );
    expect(markDone?.classList.contains('btff-panel__mini-button--ghost')).toBe(true);
    expect(useCurrentSearch?.classList.contains('btff-panel__mini-button--ghost')).toBe(
      false,
    );
  });

  it('does not render pinned clear actions in overlay mode', async () => {
    await renderPanel({
      currentPage: 'pinned',
      isPinnedItemOnCurrentPage: () => false,
      pinnedItems: [
        {
          id: 'pinned-1',
          imageUrl: 'https://example.com/item.png',
          pinnedAt: '2026-03-30T00:00:00.000Z',
          price: 'Exact Price: 50 Chaos Orb',
          sourcePath: '/trade/search/Standard/example-slug',
          subtitle: 'PoE 1 | Standard',
          title: 'Vaal Regalia',
        },
      ],
    });

    expect(container.textContent).not.toContain('Clear all');
    expect(container.textContent).not.toContain('Clear pinned');
    expect(container.querySelector('.btff-panel__pinned-actions')?.textContent).toContain(
      'Open',
    );
    expect(
      container
        .querySelector<HTMLButtonElement>('.btff-panel__pinned-actions button')
        ?.getAttribute('title'),
    ).toBe('Open saved search');
    expect(container.textContent).toContain('Unpin');
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(container.querySelector('.btff-panel__pinned-thumb')).not.toBeNull();
  });

  it('describes first-run setup without telling the user to start fresh', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    const onCompleteOnboarding = vi.fn();

    await renderPanel({
      currentPage: 'pinned',
      onCompleteOnboarding,
      schema,
    });

    expect(container.textContent).toContain(
      'Open the extension popup to import a legacy backup or continue with an empty bookmark library.',
    );
    expect(container.textContent?.toLowerCase()).not.toContain('start fresh');
    const continueButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent === 'Continue without import');
    expect(continueButton?.classList.contains('btff-panel__callout-action')).toBe(
      true,
    );

    continueButton?.click();
    expect(onCompleteOnboarding).toHaveBeenCalledOnce();
  });

  it('does not render in-page history clear controls in sidebar mode', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.preferences.sidePanelSidebar = true;
    schema.history.entries = [
      {
        id: 'history-1',
        title: 'search/EB04ajr4S5',
        createdAt: '2026-04-10T00:00:00.000Z',
        version: '1',
        type: 'search',
        league: 'HC LANDMINED GSF (PL80003)',
        slug: 'EB04ajr4S5',
        isLive: false,
      },
    ];

    await renderPanel({
      currentPage: 'history',
      schema,
    });

    expect(container.textContent).not.toContain('Clear history');
    expect(container.textContent).not.toContain('Clear all');
  });

  it('replaces a folder image with its named fallback when the image fails', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.bookmarks.folders = [
      {
        id: 'folder-shadow',
        title: 'Shadow searches',
        version: '1',
        icon: 'shadow',
        archivedAt: null,
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-shadow': [],
    };

    await renderPanel({ schema });

    const image = container.querySelector<HTMLImageElement>(
      '.btff-panel__folder-icon',
    );
    expect(image?.alt).toBe('');
    expect(image?.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toContain('PoE 1 · Shadow');

    flushSync(() => {
      image?.dispatchEvent(new Event('error', { bubbles: true }));
    });

    const fallback = container.querySelector(
      '.btff-panel__folder-icon-fallback',
    );
    expect(container.querySelector('.btff-panel__folder-icon')).toBeNull();
    expect(fallback?.textContent).toBe('SH');
    expect(fallback?.getAttribute('aria-hidden')).toBe('true');
    expect(fallback?.getAttribute('title')).toBe('Shadow');
  });

  it('allows the first bookmark folder to stay compact when it is collapsed', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    const onToggleFolder = vi.fn();
    schema.preferences.hasCompletedOnboarding = true;
    schema.preferences.expandedFolderIds = [];
    schema.bookmarks.folders = [
      {
        id: 'folder-mageblood',
        title: 'Mageblood',
        version: '1',
        icon: 'divine',
        archivedAt: null,
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-mageblood': [
        {
          id: 'trade-mageblood',
          title: 'Mageblood',
          completedAt: null,
          location: {
            version: '1',
            type: 'search',
            slug: 'd8kyqjooUJ',
          },
        },
      ],
    };

    await renderPanel({ onToggleFolder, schema });

    const folderToggle = container.querySelector<HTMLButtonElement>(
      '.btff-panel__record-toggle',
    );
    expect(folderToggle?.textContent).toContain('Mageblood');
    expect(folderToggle?.textContent).toContain('PoE 1 · Divine Orb');
    expect(folderToggle?.textContent).toContain('1 trade');
    expect(folderToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.btff-panel__trade-list')).toBeNull();

    folderToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onToggleFolder).toHaveBeenCalledWith('folder-mageblood');

    schema.preferences.expandedFolderIds = ['folder-mageblood'];
    await renderPanel({ onToggleFolder, schema });

    expect(
      container
        .querySelector('.btff-panel__record-toggle')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(container.querySelector('.btff-panel__trade-list')).not.toBeNull();
  });

  it('shows Jump for current-page dock pins and keeps item level above pinned time', async () => {
    await renderPanel({
      currentPage: 'pinned',
      isCollapsed: true,
      isPinnedItemOnCurrentPage: () => true,
      pinnedItems: [
        {
          id: 'pinned-1',
          pinnedAt: '2026-03-30T00:00:00.000Z',
          price: '14×Divine Orb',
          sourcePath: '/trade2/search/poe2/Fate%20of%20the%20Vaal/example-slug',
          subtitle: 'Item Level: 84 | SellerName',
          title: 'Mageblood',
        },
      ],
    });

    expect(container.querySelector('.btff-panel-dock__pinned-jump')?.textContent).toBe(
      'Jump',
    );
    expect(
      container.querySelector('.btff-panel-dock__pinned-jump')?.getAttribute('title'),
    ).toBe('Jump to pinned item');

    await renderPanel({
      currentPage: 'pinned',
      isPinnedItemOnCurrentPage: () => true,
      pinnedItems: [
        {
          id: 'pinned-1',
          pinnedAt: '2026-03-30T00:00:00.000Z',
          price: 'Exact Price: 50 Chaos Orb',
          sourcePath: '/trade/search/Standard/example-slug',
          subtitle: 'Item Level: 84 | SellerName',
          title: 'Vaal Regalia',
        },
      ],
    });

    const itemLevel = container.querySelector('.btff-panel__pinned-item-level');
    const pinnedContext = container.querySelector('.btff-panel__pinned-context');
    const pinnedSubtitle = container.querySelector('.btff-panel__pinned-subtitle');
    const pinnedTime = container.querySelector('.btff-panel__pinned-time');

    expect(container.textContent).toContain('Item Level: 84');
    expect(itemLevel).not.toBeNull();
    expect(pinnedContext).not.toBeNull();
    expect(pinnedContext?.contains(pinnedSubtitle)).toBe(true);
    expect(pinnedContext?.contains(pinnedTime)).toBe(true);
    expect(pinnedTime).not.toBeNull();
    expect(
      itemLevel!.compareDocumentPosition(pinnedTime!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('prioritizes seller context over the item base type in compact pinned cards', async () => {
    await renderPanel({
      currentPage: 'pinned',
      isPinnedItemOnCurrentPage: () => true,
      pinnedItems: [
        {
          id: 'mageblood-result',
          pinnedAt: '2026-07-24T00:00:00.000Z',
          price: '3×Divine Orb',
          sourcePath: '/trade/search/Standard/mageblood-search',
          subtitle: 'Heavy Belt | Item Level: 85 | thelonejedi#7724',
          title: 'Mageblood',
        },
      ],
    });

    expect(container.querySelector('.btff-panel__pinned-info strong')?.textContent).toBe(
      'Mageblood',
    );
    expect(container.querySelector('.btff-panel__pinned-subtitle')?.textContent).toBe(
      'thelonejedi#7724',
    );
    expect(container.textContent).not.toContain('Heavy Belt');
  });

  it('updates pinned relative time without requiring a tab change', async () => {
    const pinnedAt = new Date(Date.now() - 21_000).toISOString();

    await renderPanel({
      currentPage: 'pinned',
      pinnedItems: [
        {
          id: 'spirit-emblem-result',
          pinnedAt,
          price: '10×Orb of Alchemy',
          sourcePath: '/trade/search/Standard/spirit-emblem-search',
          subtitle: 'Item Level: 67 | anthill1953#1228',
          title: 'Spirit Emblem',
        },
      ],
    });

    const getPinnedTime = () =>
      container.querySelector('.btff-panel__pinned-time')?.textContent;
    expect(getPinnedTime()).toBe('21 seconds ago');

    await vi.waitFor(() => expect(getPinnedTime()).toBe('22 seconds ago'), {
      interval: 50,
      timeout: 2_000,
    });
  });

  it('renders pinned prices without a multiplication marker', async () => {
    await renderPanel({
      currentPage: 'pinned',
      pinnedItems: [
        {
          id: 'pinned-divine',
          pinnedAt: '2026-07-24T00:00:00.000Z',
          price: '9×Divine Orb',
          sourcePath: '/trade/search/Standard/divine-price',
          subtitle: 'Leather Belt | Item Level: 80',
          title: 'Pinned item',
        },
      ],
    });

    const divinePrice = container.querySelector('.btff-panel__pinned-price');
    expect(divinePrice?.textContent?.trim()).toBe('9');
    expect(divinePrice?.textContent).not.toContain('×');
    expect(
      divinePrice?.querySelector<HTMLImageElement>('img[alt="Divine Orb"]'),
    ).not.toBeNull();

    await renderPanel({
      currentPage: 'pinned',
      pinnedItems: [
        {
          id: 'pinned-alchemy',
          pinnedAt: '2026-07-24T00:00:00.000Z',
          price: '1×Orb of Alchemy',
          sourcePath: '/trade/search/Standard/alchemy-price',
          subtitle: 'Simple Robe | Item Level: 12',
          title: 'Pinned item',
        },
      ],
    });

    const alchemyPrice = container.querySelector('.btff-panel__pinned-price');
    expect(alchemyPrice?.textContent?.trim()).toBe('1 Orb of Alchemy');
    expect(alchemyPrice?.textContent).not.toContain('×');
  });

  it('keeps legacy result ids out of expanded and collapsed pinned labels', async () => {
    const legacyPin = {
      id: '1c1e43849c94cdde4e01e8ba2ec7',
      pinnedAt: '2026-03-30T00:00:00.000Z',
      price: '1×Orb of Alchemy',
      sourcePath: '/trade/search/Standard/example-slug',
      subtitle: 'Pinned from the current trade results.',
      title: 'Pinned result 1c1e43849c94cdde4e01e8ba2ec7',
    };

    await renderPanel({
      currentPage: 'pinned',
      isPinnedItemOnCurrentPage: () => true,
      pinnedItems: [legacyPin],
    });

    expect(container.textContent).toContain('Pinned item');
    expect(container.textContent).not.toContain(legacyPin.id);
    expect(container.textContent).not.toContain('Pinned from the current trade results.');

    await renderPanel({
      currentPage: 'pinned',
      isCollapsed: true,
      isPinnedItemOnCurrentPage: () => true,
      pinnedItems: [legacyPin],
    });

    expect(container.querySelector('.btff-panel-dock__pinned-title')?.textContent).toBe(
      'Pinned item',
    );
    expect(container.textContent).not.toContain(legacyPin.id);
  });

  it('uses compact pinned actions and summarizes extra dock items', async () => {
    const onSetCollapsed = vi.fn();
    const pinnedItems = Array.from({ length: 4 }, (_, index) => ({
      id: `pinned-${index + 1}`,
      pinnedAt: `2026-03-30T00:00:0${index}.000Z`,
      price: '1×Orb of Alchemy',
      sourcePath: '/trade/search/Standard/example-slug',
      subtitle: 'Gold Amulet | Item Level: 80',
      title: `Pinned item ${index + 1}`,
    }));

    await renderPanel({
      currentPage: 'pinned',
      isPinnedItemOnCurrentPage: () => true,
      pinnedItems,
    });

    const actions = container.querySelector('.btff-panel__pinned-actions');
    expect(actions).not.toBeNull();
    expect(actions?.textContent).toContain('Jump');
    expect(actions?.textContent).not.toContain('Scroll to item');
    expect(container.querySelector('.btff-panel__pinned-list')).not.toBeNull();

    await renderPanel({
      currentPage: 'pinned',
      isCollapsed: true,
      isPinnedItemOnCurrentPage: () => true,
      onSetCollapsed,
      pinnedItems,
    });

    expect(container.querySelectorAll('.btff-panel-dock__pinned-item')).toHaveLength(3);
    expect(container.querySelector('.btff-panel-dock__more')?.textContent).toBe(
      '+1 more',
    );

    container
      .querySelector<HTMLButtonElement>('.btff-panel-dock__more')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSetCollapsed).toHaveBeenCalledWith(false);
  });

  async function renderPanel(
    overrides: Partial<React.ComponentProps<typeof Phase0Panel>> = {},
  ) {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;

    flushSync(() => {
      root.render(
        <Phase0Panel
          currentPage="bookmarks"
          isPinnedItemOnCurrentPage={() => true}
          isCollapsed={false}
          isSchemaLoading={false}
          onClearHistory={async () => {}}
          onClearPinnedItems={() => {}}
          onCompleteOnboarding={() => {}}
          onCopyFolderExport={async () => {}}
          //onPoeNinjaPing={() => {}}
          //onRefresh={() => {}}
          onReorderFolders={async () => {}}
          onRenameTrade={async () => {}}
          onSaveTrade={async () => {}}
          onActivatePinnedItem={() => {}}
          onSelectPage={() => {}}
          onSetCollapsed={() => {}}
          onToggleFolder={() => {}}
          onToggleFolderArchive={async () => {}}
          onToggleTradeCompletion={async () => {}}
          onUnpinItem={() => {}}
          onUpdateTradeLocation={async () => {}}
          pinnedItems={[]}
          //poeNinjaStatus={{
          //  state: 'idle',
          //  message: 'Background fetch not tested yet.',
          //}}
          schema={schema}
          snapshot={createSnapshot()}
          {...overrides}
        />,
      );
    });
  }
});

function createSnapshot(): TradePageSnapshot {
  return {
    version: 'poe1',
    resultsFound: 3,
    socketWarnings: 1,
    currentPath: '/trade/search/Standard/example-slug',
    tradeLocation: null,
    lastRefreshedAt: '3:00 PM',
  };
}
