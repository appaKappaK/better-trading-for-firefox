// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../entrypoints/popup/App';
import { createEmptyStorageSchema, type StorageSchemaV1 } from '../src/lib/storage/schema';
import { STORAGE_SCHEMA_KEY } from '../src/lib/storage/runtime';

describe('popup update notice', () => {
  let container: HTMLDivElement;
  let currentSchema: StorageSchemaV1;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    currentSchema = createEmptyStorageSchema('popup-update-test');
    currentSchema.preferences.hasCompletedOnboarding = true;
    currentSchema.preferences.pendingUpdateNotice = '1.3.0';

    vi.stubGlobal('browser', {
      runtime: {
        getManifest: () => ({ version: '1.3.0' }),
      },
      storage: {
        local: {
          get: vi.fn(async () => ({ [STORAGE_SCHEMA_KEY]: currentSchema })),
          set: vi.fn(async (value: Record<string, unknown>) => {
            currentSchema = value[STORAGE_SCHEMA_KEY] as StorageSchemaV1;
          }),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('previews the matching release notes from the changelog link', async () => {
    flushSync(() => root.render(<App />));

    await vi.waitFor(() => {
      expect(
        container.querySelector('[data-confirmation="update-notice"]'),
      ).not.toBeNull();
    });

    expect(container.querySelector('.popup-update-notice')).toBeNull();
    const dialog = container.querySelector<HTMLDialogElement>(
      '[data-confirmation="update-notice"]',
    );
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button');

    expect(dialog?.tagName).toBe('DIALOG');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('data-tone')).toBe('notice');
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(dialog?.textContent).toContain('Updated to v1.3.0');
    expect(dialog?.textContent).toContain('Check the changelog for what is new.');
    const changelogLink = dialog?.querySelector<HTMLAnchorElement>(
      '.popup-release-notes__link',
    );
    expect(changelogLink?.textContent).toBe('changelog');
    expect(changelogLink?.href).toBe(
      'https://github.com/appaKappaK/better-trading-for-firefox/releases/tag/v1.3.0',
    );
    expect(changelogLink?.target).toBe('_blank');
    expect(dialog?.querySelector('.popup-release-notes__preview')).toBeNull();

    changelogLink?.focus();

    await vi.waitFor(() => {
      expect(
        dialog?.querySelector('.popup-release-notes__preview'),
      ).not.toBeNull();
    });
    const preview = dialog?.querySelector('.popup-release-notes__preview');
    expect(
      dialog
        ?.querySelector('.popup-update-notice-content')
        ?.getAttribute('data-preview-visible'),
    ).toBe('true');
    expect(preview?.textContent).toContain("What's new in v1.3.0");
    expect(
      Array.from(preview?.querySelectorAll('li') ?? [], (item) => item.textContent),
    ).toEqual([
      'Reorder bookmark folders and pinned items with smooth dragging, including wheel scrolling through long lists.',
      'See saved leagues on bookmark folders and compact price and league details in the collapsed launcher.',
      'Browse long saved-data lists with tighter cards, contained names, preserved positions, and transient scrollbars.',
    ]);
    expect(buttons).toHaveLength(1);
    expect(buttons?.[0].textContent).toBe('Dismiss');
    expect(buttons?.[0].classList.contains('popup-button--danger')).toBe(false);

    buttons?.[0].click();

    await vi.waitFor(() => {
      expect(
        container.querySelector('[data-confirmation="update-notice"]'),
      ).toBeNull();
    });
    expect(currentSchema.preferences.pendingUpdateNotice).toBeNull();
  });
});
