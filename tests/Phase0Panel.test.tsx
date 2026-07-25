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

  it('suspends folder reordering while a bookmark title is being edited', async () => {
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

    let folderRecord = container.querySelector<HTMLElement>(
      '.btff-panel__record',
    );
    expect(folderRecord?.draggable).toBe(true);

    flushSync(() => findButton(container, 'Rename')?.click());

    const renameInput = container.querySelector<HTMLInputElement>(
      '.btff-panel__inline-form--nested .btff-panel__input',
    );
    folderRecord = container.querySelector<HTMLElement>('.btff-panel__record');
    expect(renameInput).not.toBeNull();
    expect(folderRecord?.draggable).toBe(false);

    flushSync(() => findButton(container, 'Cancel')?.click());

    folderRecord = container.querySelector<HTMLElement>('.btff-panel__record');
    expect(folderRecord?.draggable).toBe(true);
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
