// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Phase0Panel } from '../src/content/Phase0Panel';
import { createEmptyStorageSchema } from '../src/lib/storage/schema';
import type { TradePageSnapshot } from '../src/content/tradePage';

describe('Phase0Panel collapse chrome', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    if (!window.PointerEvent) {
      Object.defineProperty(window, 'PointerEvent', {
        configurable: true,
        value: MouseEvent,
      });
    }
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
      '1 pinned | 12 results | Standard',
    );
    expect(
      container.querySelector('.btff-panel-dock__summary')?.getAttribute('title'),
    ).toBe('1 pinned | 12 results | Standard');
    expect(container.querySelector('.btff-panel-dock__pinned-price')?.textContent).toContain(
      'Exact Price: 50 Chaos Orb',
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

  it('toggles the persisted in-page header with matching context-menu shortcuts', async () => {
    const schema = createEmptyStorageSchema('phase0-header-test');
    const onSetHeaderHidden = vi.fn();
    schema.preferences.hasCompletedOnboarding = true;

    await renderPanel({ onSetHeaderHidden, schema });

    const header = container.querySelector('.btff-panel__header');
    expect(header?.getAttribute('title')).toBe(
      'Right-click to hide the panel header',
    );

    const hideEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    expect(header?.dispatchEvent(hideEvent)).toBe(false);
    expect(onSetHeaderHidden).toHaveBeenCalledWith(true);

    schema.preferences.popupIntroHidden = true;
    await renderPanel({ onSetHeaderHidden, schema });

    expect(container.querySelector('.btff-panel__header')).toBeNull();
    const tabs = container.querySelector('.btff-panel__tabs');
    expect(tabs?.getAttribute('title')).toBe(
      'Right-click to show the panel header',
    );

    const restoreEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    expect(tabs?.dispatchEvent(restoreEvent)).toBe(false);
    expect(onSetHeaderHidden).toHaveBeenLastCalledWith(false);
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

  it('updates history relative time without requiring a tab change', async () => {
    const createdAt = new Date(Date.now() - 21_000).toISOString();
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.history.entries = [
      {
        createdAt,
        id: 'history-ticking-time',
        isLive: false,
        league: 'Allflame',
        slug: 'ticking-time',
        title: 'Empty search',
        type: 'search',
        version: '1',
      },
    ];

    await renderPanel({ currentPage: 'history', schema });

    const getHistoryTime = () =>
      container.querySelector('.btff-history-time')?.textContent;
    expect(getHistoryTime()).toBe('21 seconds ago');

    await vi.waitFor(() => expect(getHistoryTime()).toBe('22 seconds ago'), {
      interval: 50,
      timeout: 2_000,
    });
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

  it('reveals compact name-color choices only after the matching name is entered', async () => {
    const onSaveTrade = vi.fn().mockResolvedValue(undefined);

    await renderPanel({
      onSaveTrade,
      snapshot: createSaveableSnapshot('colored-new-folder'),
    });

    openQuickSave(container);
    expect(findColorPicker(container, 'Folder name color')).toBeNull();
    expect(findColorPicker(container, 'Bookmark name color')).toBeNull();

    changeInput(findQuickSaveInput(container, 'Folder name'), 'Belt upgrades');
    expect(findColorPicker(container, 'Folder name color')).not.toBeNull();
    expect(findColorPicker(container, 'Bookmark name color')).toBeNull();

    changeInput(findQuickSaveBookmarkInput(container), 'Cold resistance belts');
    expect(findColorPicker(container, 'Bookmark name color')).not.toBeNull();

    chooseNameColor(container, 'Folder name color', 'Green');
    chooseNameColor(container, 'Bookmark name color', 'Violet');

    await act(async () => {
      findButton(container, 'Save current search')?.click();
      await Promise.resolve();
    });

    expect(onSaveTrade).toHaveBeenCalledWith({
      bookmarkColor: 'violet',
      folderColor: 'green',
      folderIcon: null,
      folderId: null,
      folderTitle: 'Belt upgrades',
      title: 'Cold resistance belts',
    });
    expect(findColorPicker(container, 'Folder name color')).toBeNull();
    expect(findColorPicker(container, 'Bookmark name color')).toBeNull();
  });

  it('places the folder name color choices before the folder icon picker', async () => {
    await renderPanel({
      snapshot: createSaveableSnapshot('ordered-folder-options'),
    });

    openQuickSave(container);
    changeInput(findQuickSaveInput(container, 'Folder name'), 'Belt upgrades');

    const colorPicker = findColorPicker(container, 'Folder name color');
    const iconPicker = container.querySelector('.btff-folder-icon-picker');

    expect(colorPicker).not.toBeNull();
    expect(iconPicker).not.toBeNull();
    if (!colorPicker || !iconPicker) {
      throw new Error('Quick Save folder appearance controls did not render.');
    }
    expect(
      Boolean(
        colorPicker.compareDocumentPosition(iconPicker) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it('clears the saved bookmark name while retaining the selected folder', async () => {
    const schema = createSchemaWithBookmarkFolder();
    const onSaveTrade = vi.fn().mockResolvedValue(undefined);

    await renderPanel({
      onSaveTrade,
      schema,
      snapshot: createSaveableSnapshot('next-search'),
    });

    openQuickSave(container);
    const bookmarkInput = findQuickSaveBookmarkInput(container);
    const folderSelect = container.querySelector<HTMLSelectElement>(
      '.btff-panel__field select',
    );
    if (!folderSelect) throw new Error('Quick Save folder select did not render.');
    flushSync(() => {
      folderSelect.value = 'folder-2';
      folderSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    changeInput(bookmarkInput, 'Gear');
    expect(findColorPicker(container, 'Bookmark name color')).not.toBeNull();
    chooseNameColor(container, 'Bookmark name color', 'Blue');

    await act(async () => {
      findButton(container, 'Save current search')?.click();
      await Promise.resolve();
    });

    expect(onSaveTrade).toHaveBeenCalledWith({
      bookmarkColor: 'blue',
      folderColor: null,
      folderIcon: null,
      folderId: 'folder-2',
      folderTitle: null,
      title: 'Gear',
    });
    expect(findQuickSaveBookmarkInput(container).value).toBe('');
    expect(
      container.querySelector<HTMLSelectElement>('.btff-panel__field select')?.value,
    ).toBe('folder-2');
    expect(container.querySelector('.btff-panel__composer-copy')).not.toBeNull();
    expect(findColorPicker(container, 'Bookmark name color')).toBeNull();
  });

  it('dismisses successful Quick Save feedback after three seconds', async () => {
    vi.useFakeTimers();
    const schema = createSchemaWithBookmarkFolder();

    await renderPanel({
      onSaveTrade: vi.fn().mockResolvedValue(undefined),
      schema,
      snapshot: createSaveableSnapshot('timed-feedback'),
    });

    openQuickSave(container);
    changeInput(findQuickSaveBookmarkInput(container), 'Timed search');

    await act(async () => {
      findButton(container, 'Save current search')?.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain(
      'Saved the current trade into the selected folder.',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_999);
    });
    expect(container.textContent).toContain(
      'Saved the current trade into the selected folder.',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.textContent).not.toContain(
      'Saved the current trade into the selected folder.',
    );
  });

  it('keeps failed-save feedback and the entered bookmark name visible', async () => {
    vi.useFakeTimers();
    const schema = createSchemaWithBookmarkFolder();

    await renderPanel({
      onSaveTrade: vi.fn().mockRejectedValue(new Error('Could not save this search.')),
      schema,
      snapshot: createSaveableSnapshot('failed-save'),
    });

    openQuickSave(container);
    changeInput(findQuickSaveBookmarkInput(container), 'Keep this name');
    chooseNameColor(container, 'Bookmark name color', 'Red');

    await act(async () => {
      findButton(container, 'Save current search')?.click();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(container.textContent).toContain('Could not save this search.');
    expect(findQuickSaveBookmarkInput(container).value).toBe('Keep this name');
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Bookmark name color: Red"]',
      )?.checked,
    ).toBe(true);
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

  it('uses the normal empty state on first run without an onboarding notice', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');

    await renderPanel({
      currentPage: 'pinned',
      schema,
    });

    expect(container.textContent).toContain(
      'Pin an item on the Trade page and it will appear here.',
    );
    expect(container.textContent).not.toContain('import a legacy backup');
    expect(container.textContent).not.toContain('continue without importing');
    expect(container.textContent?.toLowerCase()).not.toContain('start fresh');
    expect(container.querySelector('.btff-panel__callout')).toBeNull();
    expect(
      Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent === 'Dismiss',
      ),
    ).toBeUndefined();
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
    expect(folderToggle?.textContent).toContain('1 search');
    expect(folderToggle?.textContent).not.toContain('1 trade');
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

  it('summarizes every distinct saved league in the collapsed folder metadata', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.bookmarks.folders = [
      {
        archivedAt: null,
        icon: 'duelist',
        id: 'folder-mixed-leagues',
        title: 'League searches',
        version: '1',
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-mixed-leagues': [
        {
          completedAt: null,
          id: 'trade-allflame-1',
          location: {
            league: 'Allflame',
            slug: 'allflame-one',
            type: 'search',
            version: '1',
          },
          title: 'Allflame one',
        },
        {
          completedAt: null,
          id: 'trade-standard',
          location: {
            league: 'Standard',
            slug: 'standard-one',
            type: 'search',
            version: '1',
          },
          title: 'Standard one',
        },
        {
          completedAt: null,
          id: 'trade-allflame-2',
          location: {
            league: 'Allflame',
            slug: 'allflame-two',
            type: 'search',
            version: '1',
          },
          title: 'Allflame two',
        },
      ],
    };

    await renderPanel({ schema });

    const metadata = container.querySelector(
      '.btff-panel__record-toggle-body small',
    );
    expect(metadata?.textContent).toBe(
      'PoE 1 · Duelist · Allflame & Standard',
    );
    expect(metadata?.getAttribute('title')).toBe(
      'PoE 1 · Duelist · Allflame & Standard',
    );
  });

  it('recovers an older bookmark league from matching history metadata', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.bookmarks.folders = [
      {
        archivedAt: null,
        icon: 'shadow',
        id: 'folder-legacy-league',
        title: 'Older searches',
        version: '1',
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-legacy-league': [
        {
          completedAt: null,
          id: 'trade-legacy-league',
          location: { slug: 'legacy-search', type: 'search', version: '1' },
          title: 'Legacy search',
        },
      ],
    };
    schema.history.entries = [
      {
        createdAt: '2026-07-25T00:00:00.000Z',
        id: 'history-legacy-league',
        isLive: false,
        league: 'Allflame',
        slug: 'legacy-search',
        title: 'Legacy search',
        type: 'search',
        version: '1',
      },
    ];

    await renderPanel({ schema });

    expect(
      container.querySelector('.btff-panel__record-toggle-body small')?.textContent,
    ).toBe('PoE 1 · Shadow · Allflame');
  });

  it('uses dedicated folder reorder handles instead of native draggable cards', async () => {
    const schema = createSchemaWithBookmarkFolder();

    await renderPanel({ schema });

    const folderRecords = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__record'),
    );
    const reorderHandles = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-panel__record-reorder',
      ),
    );

    expect(folderRecords).toHaveLength(2);
    expect(folderRecords.every((record) => record.draggable === false)).toBe(true);
    expect(reorderHandles).toHaveLength(2);
    expect(reorderHandles[0].getAttribute('aria-label')).toContain(
      'Reorder RFCHIEF',
    );
    expect(reorderHandles[0].getAttribute('title')).toBe(
      'Drag to reorder',
    );
  });

  it('preserves bookmark list scrolling when a folder expands or collapses', async () => {
    const schema = createSchemaWithBookmarkFolder();
    const onToggleFolder = vi.fn();

    await renderPanel({ onToggleFolder, schema });

    const bookmarkList = container.querySelector<HTMLElement>(
      '.btff-panel__bookmark-list-scroll',
    );
    const firstFolderToggle = container.querySelector<HTMLButtonElement>(
      '.btff-panel__record-toggle',
    );
    if (!bookmarkList || !firstFolderToggle) {
      throw new Error('Bookmark list did not render.');
    }

    bookmarkList.scrollTop = 173;
    firstFolderToggle.click();
    expect(onToggleFolder).toHaveBeenCalledWith('folder-1');

    bookmarkList.scrollTop = 0;
    const expandedSchema = {
      ...schema,
      preferences: {
        ...schema.preferences,
        expandedFolderIds: ['folder-1'],
      },
    };
    await renderPanel({
      onToggleFolder,
      schema: expandedSchema,
    });

    const expandedBookmarkList = container.querySelector<HTMLElement>(
      '.btff-panel__bookmark-list-scroll',
    );
    expect(expandedBookmarkList?.scrollTop).toBe(173);

    if (!expandedBookmarkList) {
      throw new Error('Expanded bookmark list did not render.');
    }
    expandedBookmarkList.scrollTop = 211;
    container
      .querySelector<HTMLButtonElement>('.btff-panel__record-toggle')
      ?.click();
    expandedBookmarkList.scrollTop = 0;

    await renderPanel({
      onToggleFolder,
      schema: {
        ...expandedSchema,
        preferences: {
          ...expandedSchema.preferences,
          expandedFolderIds: [],
        },
      },
    });

    expect(
      container.querySelector<HTMLElement>('.btff-panel__bookmark-list-scroll')
        ?.scrollTop,
    ).toBe(211);
  });

  it('routes wheel input from anywhere in the panel to the active bookmark list', async () => {
    const schema = createSchemaWithBookmarkFolder();

    await renderPanel({ schema });

    const bookmarkList = container.querySelector<HTMLElement>(
      '.btff-panel__bookmark-list-scroll',
    );
    const panelHeader = container.querySelector<HTMLElement>(
      '.btff-panel__header',
    );
    if (!bookmarkList || !panelHeader) {
      throw new Error('Bookmark panel did not render.');
    }

    Object.defineProperties(bookmarkList, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
    });
    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 64,
    });

    panelHeader.dispatchEvent(wheelEvent);

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(bookmarkList.scrollTop).toBe(64);
    expect(bookmarkList.dataset.scrolling).toBe('true');
  });

  it('reorders pinned items by dragging a card without hijacking its actions', async () => {
    const onReorderPinnedItems = vi.fn();
    const onActivatePinnedItem = vi.fn();
    const pinnedItems = [
      {
        id: 'pin-one',
        pinnedAt: '2026-07-25T00:00:02.000Z',
        price: '1×Divine Orb',
        sourcePath: '/trade/search/Allflame/pin-one',
        subtitle: 'Item Level: 80 | SellerOne#1111',
        title: 'First pin',
      },
      {
        id: 'pin-two',
        pinnedAt: '2026-07-25T00:00:01.000Z',
        price: '2×Divine Orb',
        sourcePath: '/trade/search/Allflame/pin-two',
        subtitle: 'Item Level: 81 | SellerTwo#2222',
        title: 'Second pin',
      },
    ];

    await renderPanel({
      currentPage: 'pinned',
      onActivatePinnedItem,
      onReorderPinnedItems,
      pinnedItems,
    });

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__pinned-item'),
    );
    mockElementRect(cards[0], { bottom: 70, top: 0 });
    mockElementRect(cards[1], { bottom: 150, top: 80 });

    dispatchPointerEvent(cards[0], 'pointerdown', {
      clientY: 35,
      pointerId: 17,
    });
    dispatchPointerEvent(cards[0], 'pointermove', {
      clientY: 140,
      pointerId: 17,
    });

    expect(cards[0].getAttribute('data-reorder-source')).toBe('true');
    expect(cards[1].getAttribute('data-reorder-shift')).toBe('up');
    expect(
      container.querySelector('.btff-panel__pinned-reorder-slot'),
    ).not.toBeNull();

    dispatchPointerEvent(cards[0], 'pointerup', {
      clientY: 140,
      pointerId: 17,
    });

    expect(onReorderPinnedItems).toHaveBeenCalledWith(0, 1);

    const jumpButton = container.querySelector<HTMLButtonElement>(
      '.btff-panel__pinned-actions button',
    );
    dispatchPointerEvent(jumpButton, 'pointerdown', {
      clientY: 35,
      pointerId: 18,
    });
    dispatchPointerEvent(jumpButton, 'pointermove', {
      clientY: 140,
      pointerId: 18,
    });
    dispatchPointerEvent(jumpButton, 'pointerup', {
      clientY: 140,
      pointerId: 18,
    });
    jumpButton?.click();

    expect(onReorderPinnedItems).toHaveBeenCalledTimes(1);
    expect(onActivatePinnedItem).toHaveBeenCalledWith('pin-one');
  });

  it('keeps a held pinned card under the pointer while wheel scrolling', async () => {
    const onReorderPinnedItems = vi.fn();
    const pinnedItems = Array.from({ length: 4 }, (_, index) => ({
      id: `pin-${index + 1}`,
      pinnedAt: `2026-07-25T00:00:0${index}.000Z`,
      price: '1×Divine Orb',
      sourcePath: `/trade/search/Allflame/pin-${index + 1}`,
      subtitle: `Item Level: 8${index} | Seller${index + 1}#1111`,
      title: `Pinned item ${index + 1}`,
    }));

    await renderPanel({
      currentPage: 'pinned',
      onReorderPinnedItems,
      pinnedItems,
    });

    const scrollArea = container.querySelector<HTMLElement>(
      ".btff-panel__scroll-area[data-page='pinned']",
    );
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__pinned-item'),
    );
    if (!scrollArea) throw new Error('Pinned scroll area did not render.');

    Object.defineProperties(scrollArea, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
    });
    mockElementRect(cards[0], { bottom: 60, top: 0 });
    mockElementRect(cards[1], { bottom: 130, top: 70 });
    mockElementRect(cards[2], { bottom: 200, top: 140 });
    mockElementRect(cards[3], { bottom: 270, top: 210 });

    dispatchPointerEvent(cards[0], 'pointerdown', {
      clientY: 30,
      pointerId: 19,
    });

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 140,
    });
    flushSync(() => cards[0]?.dispatchEvent(wheelEvent));

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(scrollArea.scrollTop).toBe(140);
    expect(cards[0].style.getPropertyValue('--btff-folder-drag-y')).toBe('140px');
    expect(cards[1].getAttribute('data-reorder-shift')).toBe('up');
    expect(cards[2].getAttribute('data-reorder-shift')).toBe('up');
    expect(
      container
        .querySelector<HTMLElement>('.btff-panel__pinned-reorder-slot')
        ?.getAttribute('data-slot-index'),
    ).toBe('2');

    dispatchPointerEvent(cards[0], 'pointerup', {
      clientY: 30,
      pointerId: 19,
    });

    expect(onReorderPinnedItems).toHaveBeenCalledWith(0, 2);
  });

  it('enables held-card wheel scrolling after pinned storage finishes loading', async () => {
    const pinnedItems = Array.from({ length: 2 }, (_, index) => ({
      id: `loading-pin-${index + 1}`,
      pinnedAt: `2026-07-25T00:00:0${index}.000Z`,
      price: '1×Divine Orb',
      sourcePath: `/trade/search/Allflame/loading-pin-${index + 1}`,
      subtitle: `Item Level: 8${index} | Seller${index + 1}#1111`,
      title: `Loading pinned item ${index + 1}`,
    }));

    await renderPanel({
      currentPage: 'pinned',
      isSchemaLoading: true,
      pinnedItems,
    });
    expect(container.querySelector('.btff-panel__pinned-list')).toBeNull();

    await renderPanel({
      currentPage: 'pinned',
      isSchemaLoading: false,
      pinnedItems,
    });

    const scrollArea = container.querySelector<HTMLElement>(
      ".btff-panel__scroll-area[data-page='pinned']",
    );
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__pinned-item'),
    );
    if (!scrollArea) throw new Error('Pinned scroll area did not render.');

    Object.defineProperties(scrollArea, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
    });
    mockElementRect(cards[0], { bottom: 60, top: 0 });
    mockElementRect(cards[1], { bottom: 130, top: 70 });

    dispatchPointerEvent(cards[0], 'pointerdown', {
      clientY: 30,
      pointerId: 20,
    });
    flushSync(() => {
      cards[0]?.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 70,
        }),
      );
    });

    expect(scrollArea.scrollTop).toBe(70);
    expect(cards[0].style.getPropertyValue('--btff-folder-drag-y')).toBe('70px');
  });

  it('reorders folders from the focused handle with arrow keys', async () => {
    const schema = createSchemaWithBookmarkFolder();
    const onReorderFolders = vi.fn();

    await renderPanel({ onReorderFolders, schema });

    const reorderHandles = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-panel__record-reorder',
      ),
    );

    reorderHandles[1]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }),
    );
    expect(onReorderFolders).toHaveBeenCalledWith(1, 0);

    reorderHandles[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }),
    );
    expect(onReorderFolders).toHaveBeenLastCalledWith(0, 1);
  });

  it('moves the held folder with the pointer while later folders make room', async () => {
    const schema = createSchemaWithBookmarkFolder();
    const onReorderFolders = vi.fn();

    await renderPanel({ onReorderFolders, schema });

    const folderRecords = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__record'),
    );
    const reorderHandles = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-panel__record-reorder',
      ),
    );

    expect(folderRecords).toHaveLength(2);
    expect(reorderHandles).toHaveLength(2);

    mockElementRect(folderRecords[0], { bottom: 60, top: 0 });
    mockElementRect(folderRecords[1], { bottom: 130, top: 70 });

    dispatchPointerEvent(reorderHandles[0], 'pointerdown', {
      clientY: 30,
      pointerId: 7,
    });
    dispatchPointerEvent(reorderHandles[0], 'pointermove', {
      clientY: 120,
      pointerId: 7,
    });

    expect(folderRecords[0].getAttribute('data-reorder-source')).toBe('true');
    expect(folderRecords[0].style.getPropertyValue('--btff-folder-drag-y')).toBe(
      '90px',
    );
    expect(folderRecords[1].getAttribute('data-reorder-shift')).toBe('up');
    expect(folderRecords[1].style.getPropertyValue('--btff-folder-shift-y')).toBe(
      '-70px',
    );
    const reorderSlot = container.querySelector<HTMLElement>(
      '.btff-panel__reorder-slot',
    );
    expect(reorderSlot?.getAttribute('data-slot-index')).toBe('1');
    expect(reorderSlot?.style.getPropertyValue('--btff-folder-slot-y')).toBe(
      '70px',
    );
    expect(reorderSlot?.style.getPropertyValue('--btff-folder-slot-height')).toBe(
      '60px',
    );

    dispatchPointerEvent(reorderHandles[0], 'pointerup', {
      clientY: 120,
      pointerId: 7,
    });

    expect(onReorderFolders).toHaveBeenCalledWith(0, 1);
    expect(folderRecords[0].hasAttribute('data-reorder-source')).toBe(false);
    expect(folderRecords[1].hasAttribute('data-reorder-shift')).toBe(false);
    expect(container.querySelector('.btff-panel__reorder-slot')).toBeNull();
  });

  it('keeps a held folder under the pointer while wheel scrolling to a new destination', async () => {
    const schema = createSchemaWithBookmarkFolder();
    schema.bookmarks.folders.push(
      {
        archivedAt: null,
        icon: 'shadow',
        id: 'folder-3',
        title: 'Third folder',
        version: '1',
      },
      {
        archivedAt: null,
        icon: 'witch',
        id: 'folder-4',
        title: 'Fourth folder',
        version: '1',
      },
    );
    schema.bookmarks.tradesByFolderId['folder-3'] = [];
    schema.bookmarks.tradesByFolderId['folder-4'] = [];
    const onReorderFolders = vi.fn();

    await renderPanel({ onReorderFolders, schema });

    const bookmarkList = container.querySelector<HTMLElement>(
      '.btff-panel__bookmark-list-scroll',
    );
    const folderRecords = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__record'),
    );
    const reorderHandles = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-panel__record-reorder',
      ),
    );
    if (!bookmarkList) throw new Error('Bookmark list did not render.');

    Object.defineProperties(bookmarkList, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
    });
    mockElementRect(folderRecords[0], { bottom: 60, top: 0 });
    mockElementRect(folderRecords[1], { bottom: 130, top: 70 });
    mockElementRect(folderRecords[2], { bottom: 200, top: 140 });
    mockElementRect(folderRecords[3], { bottom: 270, top: 210 });

    dispatchPointerEvent(reorderHandles[0], 'pointerdown', {
      clientY: 30,
      pointerId: 11,
    });

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 140,
    });
    flushSync(() => reorderHandles[0]?.dispatchEvent(wheelEvent));

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(bookmarkList.scrollTop).toBe(140);
    expect(folderRecords[0].style.getPropertyValue('--btff-folder-drag-y')).toBe(
      '140px',
    );
    expect(folderRecords[1].getAttribute('data-reorder-shift')).toBe('up');
    expect(folderRecords[2].getAttribute('data-reorder-shift')).toBe('up');
    expect(
      container
        .querySelector<HTMLElement>('.btff-panel__reorder-slot')
        ?.getAttribute('data-slot-index'),
    ).toBe('2');

    dispatchPointerEvent(reorderHandles[0], 'pointerup', {
      clientY: 30,
      pointerId: 11,
    });

    expect(onReorderFolders).toHaveBeenCalledWith(0, 2);
  });

  it('moves earlier folders down while a later folder is dragged to the top', async () => {
    const schema = createSchemaWithBookmarkFolder();
    schema.bookmarks.folders.push({
      archivedAt: null,
      icon: 'shadow',
      id: 'folder-3',
      title: 'Third folder',
      version: '1',
    });
    schema.bookmarks.tradesByFolderId['folder-3'] = [];

    await renderPanel({ schema });

    const folderRecords = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__record'),
    );
    const reorderHandles = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-panel__record-reorder',
      ),
    );
    mockElementRect(folderRecords[0], { bottom: 60, top: 0 });
    mockElementRect(folderRecords[1], { bottom: 130, top: 70 });
    mockElementRect(folderRecords[2], { bottom: 200, top: 140 });

    dispatchPointerEvent(reorderHandles[2], 'pointerdown', {
      clientY: 170,
      pointerId: 9,
    });
    dispatchPointerEvent(reorderHandles[2], 'pointermove', {
      clientY: 10,
      pointerId: 9,
    });

    expect(folderRecords[2].style.getPropertyValue('--btff-folder-drag-y')).toBe(
      '-160px',
    );
    expect(folderRecords[0].getAttribute('data-reorder-shift')).toBe('down');
    expect(folderRecords[1].getAttribute('data-reorder-shift')).toBe('down');
    expect(folderRecords[0].style.getPropertyValue('--btff-folder-shift-y')).toBe(
      '70px',
    );
    expect(
      container
        .querySelector<HTMLElement>('.btff-panel__reorder-slot')
        ?.getAttribute('data-slot-index'),
    ).toBe('0');
  });

  it('disables folder reordering while a bookmark title is being edited', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.preferences.expandedFolderIds = ['folder-editable'];
    schema.bookmarks.folders = [
      {
        archivedAt: null,
        icon: null,
        id: 'folder-editable',
        title: 'Editable searches',
        version: '1',
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-editable': [
        {
          completedAt: null,
          id: 'trade-editable',
          location: { version: '1', type: 'search', slug: 'editable-trade' },
          title: 'Editable bookmark',
        },
      ],
    };

    await renderPanel({ schema });

    let reorderHandle = container.querySelector<HTMLButtonElement>(
      '.btff-panel__record-reorder',
    );
    expect(reorderHandle?.disabled).toBe(false);

    flushSync(() => findButton(container, 'Rename')?.click());

    const renameInput = container.querySelector<HTMLInputElement>(
      '.btff-panel__inline-form--nested .btff-panel__input',
    );
    reorderHandle = container.querySelector<HTMLButtonElement>(
      '.btff-panel__record-reorder',
    );
    expect(renameInput).not.toBeNull();
    expect(reorderHandle?.disabled).toBe(true);

    flushSync(() => findButton(container, 'Cancel')?.click());

    reorderHandle = container.querySelector<HTMLButtonElement>(
      '.btff-panel__record-reorder',
    );
    expect(reorderHandle?.disabled).toBe(false);
  });

  it('renders saved name colors and a completed-title hook without recoloring metadata', async () => {
    const schema = createEmptyStorageSchema('phase0-instance');
    schema.preferences.hasCompletedOnboarding = true;
    schema.preferences.expandedFolderIds = ['folder-colored'];
    schema.bookmarks.folders = [
      {
        archivedAt: null,
        color: 'green',
        icon: null,
        id: 'folder-colored',
        title: 'Ranger upgrades',
        version: '1',
      },
    ];
    schema.bookmarks.tradesByFolderId = {
      'folder-colored': [
        {
          color: 'violet',
          completedAt: '2026-07-24T12:00:00.000Z',
          id: 'trade-colored',
          location: { version: '1', type: 'search', slug: 'colored-trade' },
          title: 'Cold bow',
        },
      ],
    };

    await renderPanel({ schema });

    expect(
      container
        .querySelector('.btff-panel__record-toggle-body strong')
        ?.getAttribute('data-name-color'),
    ).toBe('green');
    expect(
      container.querySelector('.btff-panel__trade-title')?.getAttribute('data-name-color'),
    ).toBe('violet');
    expect(
      container.querySelector('.btff-panel__trade-row')?.getAttribute('data-completed'),
    ).toBe('true');
    expect(
      container.querySelector('.btff-panel__trade-link span')?.getAttribute('style'),
    ).toBeNull();
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
    expect(alchemyPrice?.textContent?.trim()).toBe('1');
    expect(alchemyPrice?.textContent).not.toContain('×');
    expect(
      alchemyPrice?.querySelector<HTMLImageElement>('img[alt="Orb of Alchemy"]'),
    ).not.toBeNull();
  });

  it('renders every packaged currency price with its matching icon', async () => {
    const currencies = [
      'Ancient Orb',
      "Glassblower's Bauble",
      "Jeweller's Orb",
      'Orb of Alteration',
      'Orb of Annulment',
      'Orb of Augmentation',
      'Orb of Binding',
      'Orb of Chance',
      'Orb of Fusing',
      'Orb of Scouring',
      'Orb of Unmaking',
      'Regal Orb',
      'Vaal Orb',
      'Exalted Orb',
      'Mirror of Kalandra',
    ];

    await renderPanel({
      currentPage: 'pinned',
      pinnedItems: currencies.map((currency, index) => ({
        id: `pinned-currency-${index}`,
        pinnedAt: '2026-07-24T00:00:00.000Z',
        price: `${index + 1}×${currency}`,
        sourcePath: `/trade/search/Standard/currency-${index}`,
        subtitle: 'Item Level: 80',
        title: 'Pinned item',
      })),
    });

    const prices = Array.from(
      container.querySelectorAll<HTMLElement>('.btff-panel__pinned-price'),
    );
    expect(prices).toHaveLength(currencies.length);

    currencies.forEach((currency, index) => {
      expect(prices[index]?.textContent?.trim()).toBe(String(index + 1));
      expect(prices[index]?.querySelector<HTMLImageElement>('img')?.alt).toBe(
        currency,
      );
    });
  });

  it('renders an unbundled currency with the icon captured from its trade row', async () => {
    const currencyIconUrl =
      'https://web.poecdn.com/image/Art/2DItems/Currency/ConflictOrb.png';

    await renderPanel({
      currentPage: 'pinned',
      pinnedItems: [
        {
          currencyIconUrl,
          id: 'pinned-orb-of-conflict',
          pinnedAt: '2026-07-24T00:00:00.000Z',
          price: '1×Orb of Conflict',
          sourcePath: '/trade/search/Standard/orb-of-conflict',
          subtitle: 'Item Level: 80',
          title: 'Pinned item',
        },
      ],
    });

    const price = container.querySelector('.btff-panel__pinned-price');
    const icon = price?.querySelector<HTMLImageElement>('img');
    expect(price?.textContent?.trim()).toBe('1');
    expect(icon?.alt).toBe('Orb of Conflict');
    expect(icon?.src).toBe(currencyIconUrl);
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

  it('summarizes distinct current and persisted-pin leagues in the compact dock', async () => {
    await renderPanel({
      isCollapsed: true,
      pinnedItems: [
        {
          id: 'allflame-pin',
          pinnedAt: '2026-07-25T00:00:00.000Z',
          price: '3×Divine Orb',
          sourcePath: '/trade/search/Allflame/allflame-pin',
          subtitle: 'SellerOne#1111',
          title: 'Stormfire',
        },
        {
          id: 'standard-pin',
          pinnedAt: '2026-07-25T00:00:01.000Z',
          price: '12×Chaos Orb',
          sourcePath: '/trade/search/Standard/standard-pin',
          subtitle: 'SellerTwo#2222',
          title: 'A Very Long Item Name That Must Not Widen The Dock',
        },
      ],
      snapshot: {
        ...createSnapshot(),
        tradeLocation: {
          isLive: false,
          league: 'Allflame',
          slug: 'current-search',
          type: 'search',
          version: '1',
        },
      },
    });

    const summary = container.querySelector('.btff-panel-dock__summary');
    expect(summary?.textContent).toBe(
      '2 pinned | 3 results | Allflame & Standard',
    );
    expect(summary?.getAttribute('title')).toBe(
      '2 pinned | 3 results | Allflame & Standard',
    );
    expect(container.querySelectorAll('.btff-panel-dock__pinned-price')).toHaveLength(2);
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
          onReorderPinnedItems={() => {}}
          onRenameTrade={async () => {}}
          onSaveTrade={async () => {}}
          onActivatePinnedItem={() => {}}
          onSelectPage={() => {}}
          onSetHeaderHidden={() => {}}
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

function createSchemaWithBookmarkFolder() {
  const schema = createEmptyStorageSchema('phase0-instance');
  schema.preferences.hasCompletedOnboarding = true;
  schema.bookmarks.folders = [
    {
      archivedAt: null,
      icon: null,
      id: 'folder-1',
      title: 'RFCHIEF',
      version: '1',
    },
    {
      archivedAt: null,
      icon: 'marauder',
      id: 'folder-2',
      title: 'Second folder',
      version: '1',
    },
  ];
  schema.bookmarks.tradesByFolderId = { 'folder-1': [], 'folder-2': [] };
  return schema;
}

function createSaveableSnapshot(slug: string): TradePageSnapshot {
  return {
    ...createSnapshot(),
    currentPath: `/trade/search/Standard/${slug}`,
    tradeLocation: {
      isLive: false,
      league: 'Standard',
      slug,
      type: 'search',
      version: '1',
    },
  };
}

function openQuickSave(container: HTMLElement) {
  flushSync(() => {
    container
      .querySelector<HTMLButtonElement>('.btff-panel__composer-toggle')
      ?.click();
  });
}

function findQuickSaveBookmarkInput(container: HTMLElement) {
  return findQuickSaveInput(container, 'Bookmark name');
}

function findQuickSaveInput(container: HTMLElement, label: string) {
  const field = Array.from(
    container.querySelectorAll<HTMLLabelElement>('.btff-panel__field'),
  ).find((candidate) => candidate.textContent?.includes(label));
  const input = field?.querySelector<HTMLInputElement>('input');
  if (!input) throw new Error(`Quick Save ${label} input did not render.`);
  return input;
}

function findColorPicker(container: HTMLElement, label: string) {
  return container.querySelector(`fieldset[aria-label="${label}"]`);
}

function chooseNameColor(container: HTMLElement, groupLabel: string, colorLabel: string) {
  const input = container.querySelector<HTMLInputElement>(
    `input[aria-label="${groupLabel}: ${colorLabel}"]`,
  );
  expect(input).not.toBeNull();
  flushSync(() => input?.click());
}

function changeInput(input: HTMLInputElement, value: string) {
  flushSync(() => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent === label,
  );
}

function dispatchPointerEvent(
  element: Element | null | undefined,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  options: { clientY: number; pointerId: number },
) {
  if (!element) throw new Error(`Unable to dispatch ${type} without an element.`);

  const pointerSuffix = type.slice('pointer'.length);
  const eventType =
    `on${type}` in element
      ? type
      : `Pointer${pointerSuffix[0].toUpperCase()}${pointerSuffix.slice(1)}`;
  const event = new PointerEvent(eventType, {
    bubbles: true,
    button: 0,
    clientY: options.clientY,
  });
  Object.defineProperty(event, 'pointerId', { value: options.pointerId });

  flushSync(() => element.dispatchEvent(event));
}

function mockElementRect(
  element: Element | undefined,
  verticalBounds: { bottom: number; top: number },
) {
  if (!element) throw new Error('Unable to mock a missing folder header.');

  element.getBoundingClientRect = () =>
    ({
      bottom: verticalBounds.bottom,
      height: verticalBounds.bottom - verticalBounds.top,
      left: 0,
      right: 280,
      top: verticalBounds.top,
      width: 280,
      x: 0,
      y: verticalBounds.top,
      toJSON: () => ({}),
    }) as DOMRect;
}
