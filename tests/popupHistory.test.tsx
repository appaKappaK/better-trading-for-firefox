// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HistoryPanel } from '../entrypoints/popup/App';

describe('popup history rendering', () => {
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

  it('shows PoE2 league labels while keeping history links encoded', () => {
    flushSync(() => {
      root.render(
        <HistoryPanel
          historyEntries={[
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
          ]}
          isSchemaLoading={false}
          onClearHistory={async () => {}}
        />,
      );
    });

    const leaguePill = Array.from(
      container.querySelectorAll('.popup-history-pill'),
    ).find((node) => node.textContent === 'PoE2 - Fate of the Vaal');
    const historyLink = container.querySelector<HTMLAnchorElement>(
      '.popup-history-link',
    );

    expect(leaguePill).toBeTruthy();
    expect(container.textContent).toContain('Clear all history');
    expect(container.querySelector('.popup-history-slug')).toBeNull();
    expect(container.textContent).not.toContain('poe2/');
    expect(historyLink?.href).toContain(
      '/trade2/search/poe2/Fate%20of%20the%20Vaal/kqEmw8Wf5',
    );
  });

  it('requires confirmation before clearing history from the panel header', async () => {
    const onClearHistory = vi.fn(async () => {});

    flushSync(() => {
      root.render(
        <HistoryPanel
          historyEntries={[
            {
              id: 'history-1',
              title: 'Headhunter Leather Belt',
              createdAt: '2026-04-10T00:00:00.000Z',
              version: '1',
              type: 'search',
              league: 'Standard',
              slug: 'X3m5erbecP',
              isLive: false,
            },
          ]}
          isSchemaLoading={false}
          onClearHistory={onClearHistory}
        />,
      );
    });

    const clearButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent === 'Clear all history');
    expect(clearButton?.closest('.popup-panel-header')).not.toBeNull();
    expect(clearButton?.classList.contains('popup-button--danger')).toBe(true);

    flushSync(() => clearButton?.click());

    expect(onClearHistory).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Clear all saved history?');
    const dialog = container.querySelector<HTMLDialogElement>(
      '.popup-confirmation-dialog',
    );
    expect(dialog?.tagName).toBe('DIALOG');
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.hasAttribute('open')).toBe(true);

    const confirmButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent === 'Clear history');
    confirmButton?.click();
    await Promise.resolve();

    expect(onClearHistory).toHaveBeenCalledOnce();
  });
});
