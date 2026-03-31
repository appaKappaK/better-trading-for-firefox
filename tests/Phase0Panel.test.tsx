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

    await renderPanel({
      isCollapsed: true,
      onSetCollapsed,
      pinnedItems: [
        {
          id: 'pinned-1',
          pinnedAt: '2026-03-30T00:00:00.000Z',
          price: 'Exact Price: 50 Chaos Orb',
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

    container
      .querySelector<HTMLButtonElement>('.btff-panel-dock__button')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSetCollapsed).toHaveBeenCalledWith(false);
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

  async function renderPanel(
    overrides: Partial<React.ComponentProps<typeof Phase0Panel>> = {},
  ) {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;

    flushSync(() => {
      root.render(
        <Phase0Panel
          currentPage="bookmarks"
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
          onScrollToPinnedItem={() => {}}
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
