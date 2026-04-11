// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
    expect(container.textContent).not.toContain('poe2/');
    expect(historyLink?.href).toContain(
      '/trade2/search/poe2/Fate%20of%20the%20Vaal/kqEmw8Wf5',
    );
  });
});
