// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../entrypoints/popup/App';
import { createEmptyStorageSchema, type StorageSchemaV1 } from '../src/lib/storage/schema';
import { STORAGE_SCHEMA_KEY } from '../src/lib/storage/runtime';

describe('popup introduction visibility', () => {
  let container: HTMLDivElement;
  let currentSchema: StorageSchemaV1;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    currentSchema = createEmptyStorageSchema('popup-header-test');
    currentSchema.preferences.hasCompletedOnboarding = true;

    vi.stubGlobal('browser', {
      runtime: {
        getManifest: () => ({ version: '1.1.0' }),
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

  it('toggles the persisted introduction with the two context-menu shortcuts', async () => {
    flushSync(() => root.render(<App />));

    await vi.waitFor(() => {
      expect(container.querySelector('.popup-hero')).not.toBeNull();
    });

    const hideEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    const allowed = container.querySelector('.popup-hero')?.dispatchEvent(hideEvent);

    expect(allowed).toBe(false);
    await vi.waitFor(() => {
      expect(container.querySelector('.popup-hero')).toBeNull();
    });
    expect(currentSchema.preferences.popupIntroHidden).toBe(true);
    expect(
      container.querySelector('.popup-shell')?.getAttribute('data-popup-intro-hidden'),
    ).toBe('true');

    const restoreEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    const restoredNormally = container
      .querySelector('.popup-tabs')
      ?.dispatchEvent(restoreEvent);

    expect(restoredNormally).toBe(false);
    await vi.waitFor(() => {
      expect(container.querySelector('.popup-hero')).not.toBeNull();
    });
    expect(currentSchema.preferences.popupIntroHidden).toBe(false);
  });
});
