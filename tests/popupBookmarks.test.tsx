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
          onCopyBackup={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onDownloadBackup={async () => {}}
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

  it('keeps backup actions unavailable when there are no bookmark folders', () => {
    const onCopyBackup = vi.fn(async () => {});
    const onDownloadBackup = vi.fn(async () => {});

    flushSync(() => {
      root.render(
        <BookmarksPanel
          folders={[]}
          isSchemaLoading={false}
          onChangeFolderIcon={async () => {}}
          onCopyBackup={onCopyBackup}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onDownloadBackup={onDownloadBackup}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{}}
        />,
      );
    });

    const copyButton = findButton(container, 'Copy full backup');
    const downloadButton = findButton(container, 'Download backup');

    expect(copyButton?.disabled).toBe(true);
    expect(downloadButton?.disabled).toBe(true);

    copyButton?.click();
    downloadButton?.click();

    expect(onCopyBackup).not.toHaveBeenCalled();
    expect(onDownloadBackup).not.toHaveBeenCalled();
  });

  it('marks only the running backup action as busy', async () => {
    let finishCopy: (() => void) | undefined;
    const copyPromise = new Promise<void>((resolve) => {
      finishCopy = resolve;
    });
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
          onCopyBackup={() => copyPromise}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onDownloadBackup={async () => {}}
          onToggleFolderArchive={async () => {}}
          tradesByFolderId={{ 'folder-1': [] }}
        />,
      );
    });

    flushSync(() => {
      findButton(container, 'Copy full backup')?.click();
    });
    await Promise.resolve();

    const busyCopyButton = findButton(container, 'Copying...');
    const disabledDownloadButton = findButton(container, 'Download backup');

    expect(busyCopyButton?.disabled).toBe(true);
    expect(busyCopyButton?.getAttribute('aria-busy')).toBe('true');
    expect(disabledDownloadButton?.disabled).toBe(true);
    expect(disabledDownloadButton?.getAttribute('aria-busy')).toBe('false');

    finishCopy?.();
    await copyPromise;
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(findButton(container, 'Copy full backup')?.disabled).toBe(false);
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
          onCopyBackup={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onDownloadBackup={async () => {}}
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
          onCopyBackup={async () => {}}
          onCopyFolderExport={async () => {}}
          onDeleteFolder={async () => {}}
          onDeleteTrade={async () => {}}
          onDownloadBackup={async () => {}}
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
});

function findButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent === label,
  );
}
