import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEmptyStorageSchema } from '../src/lib/storage/schema';
import { STORAGE_SCHEMA_KEY } from '../src/lib/storage/runtime';

interface InstalledDetails {
  previousVersion?: string;
  reason: string;
  temporary?: boolean;
}

type InstalledListener = (
  details: InstalledDetails,
) => Promise<void> | void;

describe('background update notice lifecycle', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('queues the current version after an extension update', async () => {
    const schema = createEmptyStorageSchema('background-update-test');
    schema.preferences.hasCompletedOnboarding = true;
    schema.preferences.sidePanelDraggable = true;
    const harness = await loadBackgroundHarness(schema);

    await harness.installedListener({
      previousVersion: '1.1.0',
      reason: 'update',
      temporary: false,
    });

    expect(harness.get).toHaveBeenCalledWith(STORAGE_SCHEMA_KEY);
    expect(harness.set).toHaveBeenCalledWith({
      [STORAGE_SCHEMA_KEY]: {
        ...schema,
        preferences: {
          ...schema.preferences,
          pendingUpdateNotice: '1.2.0',
        },
      },
    });
  });

  it('does not show an update notice after a fresh installation', async () => {
    const schema = createEmptyStorageSchema('background-install-test');
    const harness = await loadBackgroundHarness(schema);

    await harness.installedListener({ reason: 'install' });

    expect(harness.get).not.toHaveBeenCalled();
    expect(harness.set).not.toHaveBeenCalled();
  });

  it('ignores a same-version development reload reported as an update', async () => {
    const schema = createEmptyStorageSchema('background-reload-test');
    const harness = await loadBackgroundHarness(schema);

    await harness.installedListener({
      previousVersion: '1.2.0',
      reason: 'update',
      temporary: true,
    });

    expect(harness.get).not.toHaveBeenCalled();
    expect(harness.set).not.toHaveBeenCalled();
  });
});

async function loadBackgroundHarness(schema: ReturnType<typeof createEmptyStorageSchema>) {
  let isInstalledListenerRegistered = false;
  let installedListener: InstalledListener = () => {
    throw new Error('Background installation listener was not registered.');
  };
  const get = vi.fn(async () => ({ [STORAGE_SCHEMA_KEY]: schema }));
  const set = vi.fn(async () => undefined);

  vi.stubGlobal('defineBackground', (setup: () => void) => setup());
  vi.stubGlobal('browser', {
    runtime: {
      id: '{7396a824-2f77-4f7e-a84c-f0b0ae80cfdc}',
      getManifest: () => ({ version: '1.2.0' }),
      onInstalled: {
        addListener: vi.fn((listener: InstalledListener) => {
          installedListener = listener;
          isInstalledListenerRegistered = true;
        }),
      },
      onMessage: {
        addListener: vi.fn(),
      },
    },
    storage: {
      local: { get, set },
    },
  });

  await import('../entrypoints/background');

  if (!isInstalledListenerRegistered) {
    throw new Error('Background did not register its installation listener.');
  }

  return {
    get,
    installedListener,
    set,
  };
}
