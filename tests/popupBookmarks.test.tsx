// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BookmarksPanel } from '../entrypoints/popup/App';
import type { BookmarkFolder } from '../src/features/bookmarks/types';

describe('popup bookmark controls', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal('browser', {
      runtime: { getURL: (path: string) => `moz-extension://test${path}` },
    });
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('uses the capped folder-icon picker instead of a native long select', () => {
    const folder: BookmarkFolder = {
      id: 'folder-1',
      title: 'Headhunters',
      version: '1',
      icon: 'ranger',
      archivedAt: null,
    };
    const onChangeFolderIcon = vi.fn(async () => {});

    flushSync(() => {
      root.render(
        <BookmarksPanel
          folders={[folder]}
          isSchemaLoading={false}
          onChangeFolderIcon={onChangeFolderIcon}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{ 'folder-1': [] }}
        />,
      );
    });

    expect(container.querySelector('.btff-folder-icon-picker')).not.toBeNull();
    expect(container.querySelector('.popup-field select')).toBeNull();

    container.querySelector<HTMLElement>('.popup-field > span')?.click();
    expect(onChangeFolderIcon).not.toHaveBeenCalled();

    container.querySelector('summary')?.click();
    const chaosOption = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-folder-icon-picker__option',
      ),
    ).find((button) => button.textContent?.includes('Chaos Orb'));
    chaosOption?.click();

    expect(onChangeFolderIcon).toHaveBeenCalledWith(folder, 'chaos');
  });

  it('keeps concise folder guidance and leaves full backups to Import', () => {
    flushSync(() => {
      root.render(
        <BookmarksPanel
          folders={[]}
          isSchemaLoading={false}
          onChangeFolderIcon={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{}}
        />,
      );
    });

    expect(container.textContent).toContain(
      'Manage folders and export them individually.',
    );
    expect(findButton(container, 'Copy full backup')).toBeUndefined();
    expect(findButton(container, 'Download backup')).toBeUndefined();
  });

  it('labels folder contents as saved searches instead of trades', () => {
    const folder: BookmarkFolder = {
      archivedAt: null,
      icon: null,
      id: 'folder-1',
      title: 'Allflame checks',
      version: '1',
    };

    flushSync(() => {
      root.render(
        <BookmarksPanel
          folders={[folder]}
          isSchemaLoading={false}
          onChangeFolderIcon={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{
            'folder-1': [
              {
                completedAt: null,
                id: 'search-1',
                location: { version: '1', type: 'search', slug: 'search-1' },
                title: 'First search',
              },
              {
                completedAt: null,
                id: 'search-2',
                location: { version: '1', type: 'search', slug: 'search-2' },
                title: 'Second search',
              },
            ],
          }}
        />,
      );
    });

    expect(
      container.querySelector('.popup-record-badges span')?.textContent,
    ).toBe('2 searches');
    expect(container.textContent).not.toContain('2 trades');
  });

  it('renders saved colors on folder and bookmark names only', () => {
    const folder: BookmarkFolder = {
      archivedAt: null,
      color: 'orange',
      icon: 'ranger',
      id: 'folder-1',
      title: 'Headhunters',
      version: '1',
    };

    flushSync(() => {
      root.render(
        <BookmarksPanel
          folders={[folder]}
          isSchemaLoading={false}
          onChangeFolderIcon={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{
            'folder-1': [
              {
                color: 'blue',
                completedAt: null,
                id: 'trade-1',
                location: { version: '1', type: 'search', slug: 'trade-1' },
                title: 'Headhunter under 20 Divine',
              },
            ],
          }}
        />,
      );
    });

    expect(
      container.querySelector('.popup-record-copy h3')?.getAttribute('data-name-color'),
    ).toBe('orange');
    expect(
      container.querySelector('.popup-trade-row strong')?.getAttribute('data-name-color'),
    ).toBe('blue');
    expect(container.querySelector('.popup-record-copy p')?.getAttribute('style')).toBeNull();
  });

  it('styles every bookmark deletion entry point as destructive', () => {
    const folder: BookmarkFolder = {
      id: 'folder-1',
      title: 'Headhunters',
      version: '1',
      icon: 'ranger',
      archivedAt: null,
    };

    flushSync(() => {
      root.render(
        <BookmarksPanel
          folders={[folder]}
          isSchemaLoading={false}
          onChangeFolderIcon={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{
            'folder-1': [
              {
                id: 'trade-1',
                title: 'Headhunter under 20 Divine',
                completedAt: null,
                location: { version: '1', type: 'search', slug: 'trade-1' },
              },
            ],
          }}
        />,
      );
    });

    const tradeDelete = container.querySelector<HTMLButtonElement>(
      '.popup-trade-actions .popup-button',
    );
    expect(tradeDelete?.textContent).toBe('Delete');
    expect(tradeDelete?.classList.contains('popup-button--danger')).toBe(true);
  });

  it('opens a modal confirmation before deleting a saved trade', async () => {
    const trade = {
      completedAt: null,
      id: 'trade-1',
      location: { version: '1' as const, type: 'search' as const, slug: 'trade-1' },
      title: 'Headhunter under 20 Divine',
    };
    const folder: BookmarkFolder = {
      archivedAt: null,
      icon: 'ranger',
      id: 'folder-1',
      title: 'Headhunters',
      version: '1',
    };
    const onDeleteTrade = vi.fn(async () => {});

    renderBookmarksPanel({
      folders: [folder],
      onDeleteTrade,
      tradesByFolderId: { 'folder-1': [trade] },
    });

    const deleteButton = container.querySelector<HTMLButtonElement>(
      '.popup-trade-actions .popup-button--danger',
    );
    flushSync(() => deleteButton?.click());
    await Promise.resolve();

    expect(onDeleteTrade).not.toHaveBeenCalled();
    expect(container.querySelector('.popup-confirmation')).toBeNull();
    const dialog = container.querySelector<HTMLDialogElement>(
      '[data-confirmation="delete-trade"]',
    );
    expect(dialog?.tagName).toBe('DIALOG');
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(dialog?.textContent).toContain('Delete saved search?');
    expect(dialog?.textContent).toContain('Headhunter under 20 Divine');

    dialog
      ?.querySelector<HTMLButtonElement>('.popup-button--danger')
      ?.click();
    await Promise.resolve();

    expect(onDeleteTrade).toHaveBeenCalledWith(folder, trade);
  });

  it('opens a modal confirmation before permanently deleting a folder', async () => {
    const folder: BookmarkFolder = {
      archivedAt: '2026-07-24T12:00:00.000Z',
      icon: 'ranger',
      id: 'folder-1',
      title: 'Archived belts',
      version: '1',
    };
    const onDeleteFolder = vi.fn(async () => {});

    renderBookmarksPanel({
      folders: [folder],
      onDeleteFolder,
      tradesByFolderId: { 'folder-1': [] },
    });

    flushSync(() => findButton(container, 'Show archived')?.click());
    const deleteButton = findButton(container, 'Delete');
    flushSync(() => deleteButton?.click());
    await Promise.resolve();

    expect(onDeleteFolder).not.toHaveBeenCalled();
    expect(container.querySelector('.popup-confirmation')).toBeNull();
    const dialog = container.querySelector<HTMLDialogElement>(
      '[data-confirmation="delete-folder"]',
    );
    expect(dialog?.tagName).toBe('DIALOG');
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(dialog?.textContent).toContain('Delete archived folder?');
    expect(dialog?.textContent).toContain('Archived belts');

    dialog
      ?.querySelector<HTMLButtonElement>('.popup-button--danger')
      ?.click();
    await Promise.resolve();

    expect(onDeleteFolder).toHaveBeenCalledWith(folder);
  });

  function renderBookmarksPanel(
    overrides: Partial<React.ComponentProps<typeof BookmarksPanel>> = {},
  ) {
    flushSync(() => {
      root.render(
        <BookmarksPanel
          folders={[]}
          isSchemaLoading={false}
          onChangeFolderIcon={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{}}
          {...overrides}
        />,
      );
    });
  }
});

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent === label,
  );
}
