// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FolderIconPicker } from '../src/components/FolderIcon';
import { FOLDER_ICON_OPTIONS } from '../src/lib/bookmarks/folderIcons';

describe('FolderIconPicker', () => {
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

  it('opens a capped listbox and closes after choosing an icon', () => {
    const onChange = vi.fn();
    flushSync(() => {
      root.render(<FolderIconPicker onChange={onChange} value="divine" />);
    });

    const details = container.querySelector('details');
    const summary = container.querySelector('summary');
    summary?.click();

    expect(details?.open).toBe(true);
    expect(summary?.getAttribute('aria-haspopup')).toBeNull();
    expect(summary?.getAttribute('aria-label')).toBe(
      'Folder icon: Currency — Divine Orb',
    );
    expect(container.querySelector('[role="group"]')).not.toBeNull();
    expect(
      container.querySelectorAll('.btff-folder-icon-picker__option'),
    ).toHaveLength(
      FOLDER_ICON_OPTIONS.length + 1,
    );
    expect(container.querySelector('.btff-folder-icon-picker__options')).not.toBeNull();

    const chaosOption = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-folder-icon-picker__option',
      ),
    ).find((button) => button.textContent?.includes('Chaos Orb'));
    chaosOption?.click();

    expect(onChange).toHaveBeenCalledWith('chaos');
    expect(details?.open).toBe(false);
  });

  it('stays closed and ignores choices while disabled', () => {
    const onChange = vi.fn();
    flushSync(() => {
      root.render(
        <FolderIconPicker
          disabled
          onChange={onChange}
          value={null}
        />,
      );
    });

    const details = container.querySelector('details');
    const summary = container.querySelector('summary');
    summary?.click();

    expect(details?.getAttribute('aria-disabled')).toBe('true');
    expect(details?.open).toBe(false);
    expect(
      Array.from(
        container.querySelectorAll<HTMLButtonElement>(
          '.btff-folder-icon-picker__option',
        ),
      ).every((button) => button.disabled),
    ).toBe(true);

    const chaosOption = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-folder-icon-picker__option',
      ),
    ).find((button) => button.textContent?.includes('Chaos Orb'));
    chaosOption?.click();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows and preserves an imported legacy icon outside the compact choices', () => {
    const onChange = vi.fn();
    flushSync(() => {
      root.render(<FolderIconPicker onChange={onChange} value="poe2-lich" />);
    });

    expect(container.querySelector('summary')?.textContent).toContain('Lich');
    expect(container.querySelector('summary')?.textContent).not.toContain('None');

    container.querySelector('summary')?.click();
    const importedChoice = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.btff-folder-icon-picker__option',
      ),
    ).find((button) => button.textContent?.includes('Imported'));
    importedChoice?.click();

    expect(importedChoice?.getAttribute('aria-pressed')).toBe('true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('brings the opened picker into its nearest panel viewport', async () => {
    flushSync(() => {
      root.render(
        <div className="popup-shell">
          <FolderIconPicker onChange={() => {}} value="divine" />
        </div>,
      );
    });

    const viewport = container.querySelector<HTMLElement>('.popup-shell');
    const details = container.querySelector<HTMLDetailsElement>('details');
    expect(viewport).not.toBeNull();
    expect(details).not.toBeNull();

    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      value: 40,
      writable: true,
    });
    vi.spyOn(viewport!, 'getBoundingClientRect').mockReturnValue(
      createRect(0, 600),
    );
    vi.spyOn(details!, 'getBoundingClientRect').mockReturnValue(
      createRect(230, 620),
    );

    container.querySelector('summary')?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(viewport?.scrollTop).toBe(68);
  });

  it('centers the selected row relative to the options scroller', async () => {
    flushSync(() => {
      root.render(<FolderIconPicker onChange={() => {}} value="slayer" />);
    });

    const options = container.querySelector<HTMLElement>(
      '.btff-folder-icon-picker__options',
    );
    const selected = container.querySelector<HTMLElement>(
      '.btff-folder-icon-picker__option[aria-pressed="true"]',
    );
    expect(options).not.toBeNull();
    expect(selected).not.toBeNull();

    Object.defineProperty(options, 'clientHeight', {
      configurable: true,
      value: 100,
    });
    options!.scrollTop = 200;
    vi.spyOn(options!, 'getBoundingClientRect').mockReturnValue(
      createRect(300, 400),
    );
    vi.spyOn(selected!, 'getBoundingClientRect').mockReturnValue(
      createRect(320, 350),
    );

    container.querySelector('summary')?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(options?.scrollTop).toBe(185);
  });
});

function createRect(top: number, bottom: number): DOMRect {
  return {
    bottom,
    height: bottom - top,
    left: 0,
    right: 300,
    top,
    width: 300,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}
