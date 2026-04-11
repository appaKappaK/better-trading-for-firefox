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
    expect(container.textContent).toContain('Open saved search');
    expect(container.textContent).toContain('Unpin');
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(container.querySelector('.btff-panel__pinned-thumb')).not.toBeNull();
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
    const pinnedTime = container.querySelector('.btff-panel__pinned-time');

    expect(container.textContent).toContain('Item Level: 84');
    expect(itemLevel).not.toBeNull();
    expect(pinnedTime).not.toBeNull();
    expect(
      itemLevel!.compareDocumentPosition(pinnedTime!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
