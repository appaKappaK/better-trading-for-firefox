// @vitest-environment jsdom

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsView } from '../src/popup/SettingsView';
import { createEmptyStorageSchema } from '../src/lib/storage/schema';

describe('SettingsView session pins toggle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal('browser', {
      runtime: {
        getManifest: () => ({
          version: '1.0.6',
        }),
      },
    });
  });

  afterEach(() => {
    flushSync(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
  });

  it('renders the session pins toggle and enables it immediately', () => {
    const schema = createEmptyStorageSchema('settings-view-test');
    const onSetPinnedItemsSessionPersistence = vi.fn();

    renderView({
      onSetPinnedItemsSessionPersistence,
      schema,
    });

    const checkbox = findSettingCheckbox('Keep pins across searches in this tab');
    expect(container.textContent).toContain('Keep pins across searches in this tab');
    expect(container.textContent).toContain(
      'Pinned items survive multiple searches and filter changes in this trade tab for the current Firefox session.',
    );
    checkbox?.click();

    expect(onSetPinnedItemsSessionPersistence).toHaveBeenCalledWith(true);
  });

  it('requires confirmation before disabling session pins', async () => {
    const schema = createEmptyStorageSchema('settings-view-test');
    schema.preferences.persistPinnedItemsInSession = true;
    const onSetPinnedItemsSessionPersistence = vi.fn();

    renderView({
      onSetPinnedItemsSessionPersistence,
      schema,
    });

    const checkbox = findSettingCheckbox('Keep pins across searches in this tab');
    flushSync(() => {
      checkbox?.click();
    });

    await Promise.resolve();

    expect(onSetPinnedItemsSessionPersistence).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Disable session pins?');
    expect(container.querySelector('.popup-confirmation')).toBeNull();
    const dialog = container.querySelector<HTMLDialogElement>(
      '[data-confirmation="disable-session-pins"]',
    );
    expect(dialog?.tagName).toBe('DIALOG');
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.hasAttribute('open')).toBe(true);

    const confirmButton = Array.from(
      dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) => button.textContent === 'Disable session pins');

    confirmButton?.click();

    expect(onSetPinnedItemsSessionPersistence).toHaveBeenCalledWith(false);
  });

  it('describes the popup header visibility toggle directly', () => {
    const schema = createEmptyStorageSchema('settings-view-test');
    schema.preferences.popupIntroHidden = true;
    const onSetPopupIntroHidden = vi.fn();

    renderView({
      onSetPopupIntroHidden,
      schema,
    });

    const setting = findSetting('Show header');
    const checkbox = findSettingCheckbox('Show header');

    expect(setting?.textContent).toContain(
      'Shows or hides the Better Trading header above the tabs.',
    );
    expect(checkbox?.checked).toBe(false);

    checkbox?.click();

    expect(onSetPopupIntroHidden).toHaveBeenCalledWith(false);
  });

  function renderView(
    overrides: Partial<React.ComponentProps<typeof SettingsView>> = {},
  ) {
    const schema = createEmptyStorageSchema('settings-view-test');

    flushSync(() => {
      root.render(
        <SettingsView
          isSchemaLoading={false}
          onSetPinnedItemsSessionPersistence={async () => {}}
          onSetPopupIntroHidden={async () => {}}
          onSetSidePanelCollapsed={async () => {}}
          onSetSidePanelDraggable={async () => {}}
          onSetSidePanelSidebar={async () => {}}
          onToggleEnhancer={async () => {}}
          schema={schema}
          {...overrides}
        />,
      );
    });
  }

  function findSetting(labelText: string) {
    return Array.from(
      container.querySelectorAll<HTMLLabelElement>('.popup-setting-card'),
    ).find((label) => label.textContent?.includes(labelText));
  }

  function findSettingCheckbox(labelText: string) {
    return findSetting(labelText)?.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
  }
});
