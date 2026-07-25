// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MigrationPanel } from '../entrypoints/popup/App';

describe('popup fresh-start controls', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
  });

  it('requires an accessible modal before clearing initialized extension data', async () => {
    const onClearSavedData = vi.fn();
    renderMigrationPanel(MigrationPanel, {
      onClearSavedData,
    });

    const resetButton = findButton('Clear saved data');
    expect(resetButton?.classList.contains('popup-button--danger')).toBe(true);
    resetButton?.focus();
    flushSync(() => resetButton?.click());
    await Promise.resolve();

    expect(onClearSavedData).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Clear Better Trading data?');
    expect(container.textContent).toContain('Your settings will stay the same.');
    expect(container.textContent).not.toContain('resets your settings');
    const dialog = container.querySelector<HTMLDialogElement>(
      '.popup-confirmation-dialog',
    );
    expect(dialog?.tagName).toBe('DIALOG');
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(document.activeElement?.textContent).toBe('Cancel');

    flushSync(() => {
      dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));
    });
    expect(container.querySelector('.popup-confirmation-dialog')).toBeNull();
    expect(onClearSavedData).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(resetButton);

    flushSync(() => resetButton?.click());
    const reopenedDialog = container.querySelector<HTMLDialogElement>(
      '.popup-confirmation-dialog',
    );
    Array.from(
      reopenedDialog?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find(
      (button) => button.textContent === 'Clear saved data',
    )?.click();
    expect(onClearSavedData).toHaveBeenCalledOnce();
  });

  it('shows the normal import controls without a separate setup choice', () => {
    const onClearSavedData = vi.fn();
    renderMigrationPanel(MigrationPanel, {
      onClearSavedData,
    });

    expect(findButton('Start fresh')).toBeUndefined();
    expect(findButton('Continue without import')).toBeUndefined();
    expect(findButton('Clear saved data')).toBeDefined();
    expect(onClearSavedData).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Clear Better Trading data?');
  });

  it('keeps full-backup actions with the import and clear controls', () => {
    renderMigrationPanel(MigrationPanel, {
      hasBookmarks: true,
    });

    const actions = container.querySelector('.popup-actions');
    expect(actions?.textContent).toContain('Import legacy data');
    expect(actions?.textContent).toContain('Copy full backup');
    expect(actions?.textContent).toContain('Download backup');
    expect(actions?.textContent).toContain('Clear saved data');
    expect(findButton('Copy full backup')?.disabled).toBe(false);
    expect(findButton('Download backup')?.disabled).toBe(false);
  });

  it('disables full-backup actions when no bookmark folders exist', () => {
    renderMigrationPanel(MigrationPanel, {
      hasBookmarks: false,
    });

    expect(findButton('Copy full backup')?.disabled).toBe(true);
    expect(findButton('Download backup')?.disabled).toBe(true);
  });

  function renderMigrationPanel(
    MigrationPanel: React.ComponentType<any>,
    overrides: Record<string, unknown>,
  ) {
    flushSync(() => {
      root.render(
        <MigrationPanel
          importInput=""
          importPreview={{
            state: 'empty',
            source: null,
            folderCount: 0,
            tradeCount: 0,
            archivedFolderCount: 0,
            folders: [],
          }}
          hasBookmarks={false}
          isReadingImportFile={false}
          isSchemaLoading={false}
          isSubmitting={false}
          onCopyBackup={async () => {}}
          onDownloadBackup={async () => {}}
          onImportFileChange={() => {}}
          onImportInputChange={() => {}}
          onImportSubmit={() => {}}
          onClearSavedData={() => {}}
          {...overrides}
        />,
      );
    });
  }

  function findButton(text: string) {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent === text,
    );
  }
});
