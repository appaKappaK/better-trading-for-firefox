import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

import { Phase0Panel, type PoeNinjaStatus } from '@/src/content/Phase0Panel';
import {
  applyEquivalentPricings,
} from '@/src/content/equivalentPricings';
import {
  applyHighlightStatFilters,
  clearHighlightStatFilters,
} from '@/src/content/highlightStatFilters';
import {
  createPinnedItemsStore,
  type PinnedItemRecord,
} from '@/src/content/pinnedItems';
import { createPageTitleController } from '@/src/content/pageTitle';
import { createRegroupSimilarsController } from '@/src/content/regroupSimilars';
import {
  applyMaximumSocketWarnings,
  collectTradePageSnapshot,
} from '@/src/content/tradePage';
import { isEnhancerEnabled } from '@/src/lib/preferences/enhancers';
import type { PoeNinjaChaosRatios } from '@/src/lib/poeNinja/chaosRatios';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';
import {
  clearStoredHistory,
  exportStoredBookmarkFolder,
  loadStoredSchema,
  renameStoredBookmarkTrade,
  reorderStoredBookmarkFolders,
  saveStoredBookmarkTrade,
  setStoredCurrentPage,
  STORAGE_SCHEMA_KEY,
  syncTradePageContext,
  toggleStoredBookmarkFolderArchive,
  toggleStoredBookmarkTradeCompletion,
  toggleStoredExpandedFolder,
  updateStoredPreferences,
  updateStoredBookmarkTradeLocation,
} from '@/src/lib/storage/runtime';

import '@/src/content/panel.css';

const MATCHES = [
  '*://pathofexile.com/trade*',
  '*://www.pathofexile.com/trade*',
  '*://pathofexile.com/trade2*',
  '*://www.pathofexile.com/trade2*',
];

const REFRESH_DEBOUNCE_MS = 150;

type ContentPage = 'bookmarks' | 'history' | 'pinned';

export default defineContentScript({
  matches: MATCHES,
  cssInjectionMode: 'ui',
  async main(ctx) {
    const pinnedItemsStore = createPinnedItemsStore(document);
    let schema: StorageSchemaV1 | null = null;
    let snapshot = collectTradePageSnapshot();
    const pageTitleController = createPageTitleController(document);
    const regroupSimilarsController = createRegroupSimilarsController(document);
    let root: Root | null = null;
    let observer: MutationObserver | null = null;
    let unsubscribePinnedItems: (() => void) | null = null;
    let isSchemaLoading = true;
    let lastPinnedPath: string | null = null;
    let chaosRatios: PoeNinjaChaosRatios | null = null;
    let chaosRatiosLeague: string | null = null;
    let equivalentPricingRequestId = 0;
    let lastSyncedPath: string | null = null;
    let pinnedItems: PinnedItemRecord[] = pinnedItemsStore.getItems();
    let poeNinjaStatus: PoeNinjaStatus = {
      state: 'idle',
      message: 'Background fetch not tested yet.',
    };
    let currentPage: ContentPage = normalizeContentPage(null);

    const render = () => {
      if (!root) return;

      root.render(
        <Phase0Panel
          currentPage={currentPage}
          isCollapsed={Boolean(schema?.preferences.sidePanelCollapsed)}
          isSchemaLoading={isSchemaLoading}
          onClearHistory={() => clearHistory()}
          onClearPinnedItems={clearPinnedItems}
          onPoeNinjaPing={() => {
            void pingPoeNinja();
          }}
          onRefresh={refresh}
          onRenameTrade={(folderId, tradeId, title) =>
            renameTrade(folderId, tradeId, title)
          }
          onCopyFolderExport={(folderId) => copyFolderExport(folderId)}
          onReorderFolders={(fromIndex, toIndex) => reorderFolders(fromIndex, toIndex)}
          onSaveTrade={(draft) => saveTrade(draft)}
          onScrollToPinnedItem={scrollToPinnedItem}
          onSelectPage={(page) => {
            void selectPage(page);
          }}
          onSetCollapsed={(collapsed) => {
            void setSidePanelCollapsed(collapsed);
          }}
          onToggleFolder={(folderId) => {
            void toggleFolder(folderId);
          }}
          onToggleFolderArchive={(folderId) => toggleFolderArchive(folderId)}
          onToggleTradeCompletion={(folderId, tradeId) =>
            toggleTradeCompletion(folderId, tradeId)
          }
          onUnpinItem={unpinItem}
          onUpdateTradeLocation={(folderId, tradeId) =>
            updateTradeLocation(folderId, tradeId)
          }
          pinnedItems={pinnedItems}
          poeNinjaStatus={poeNinjaStatus}
          schema={schema}
          snapshot={snapshot}
        />,
      );
    };

    const refresh = () => {
      snapshot = collectTradePageSnapshot(document);
      pageTitleController.update(schema, snapshot.tradeLocation);

      if (
        (lastPinnedPath !== null && snapshot.currentPath !== lastPinnedPath) ||
        snapshot.resultsFound === 0
      ) {
        pinnedItemsStore.clear();
        regroupSimilarsController.reset();
      }
      lastPinnedPath = snapshot.currentPath;

      snapshot.socketWarnings = applyTradePageEnhancers();

      if (snapshot.tradeLocation && snapshot.currentPath !== lastSyncedPath) {
        lastSyncedPath = snapshot.currentPath;
        void syncTradePageContext(
          snapshot.tradeLocation,
          pageTitleController.getHistorySourceTitle(),
        ).then(applySchema);
      }
      render();
    };

    const debouncedRefresh = debounce(refresh, REFRESH_DEBOUNCE_MS);

    const ui = await createShadowRootUi(ctx, {
      name: 'btff-phase0-panel',
      position: 'overlay',
      alignment: 'top-right',
      anchor: 'body',
      append: 'last',
      onMount(container, _shadow, shadowHost) {
        shadowHost.setAttribute('data-btff-phase0-host', 'true');
        document.documentElement.setAttribute('data-btff-phase0', 'mounted');

        pageTitleController.connect();
        root = createRoot(container);
        unsubscribePinnedItems = pinnedItemsStore.subscribe((nextPinnedItems) => {
          pinnedItems = nextPinnedItems;
          if (nextPinnedItems.length > 0) {
            currentPage = 'pinned';
          }
          render();
        });
        refresh();

        observer = new MutationObserver(() => {
          debouncedRefresh();
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        void syncSchema();

        return root;
      },
      onRemove(mountedRoot) {
        document.documentElement.removeAttribute('data-btff-phase0');
        observer?.disconnect();
        pageTitleController.disconnect();
        browser.storage.onChanged.removeListener(handleStorageChange);
        unsubscribePinnedItems?.();
        observer = null;
        unsubscribePinnedItems = null;
        mountedRoot?.unmount();
        root = null;
      },
    });

    ui.autoMount();
    refresh();
    browser.storage.onChanged.addListener(handleStorageChange);

    async function pingPoeNinja() {
      poeNinjaStatus = {
        state: 'loading',
        message: 'Contacting poe.ninja from background...',
      };
      render();

      try {
        const response = (await browser.runtime.sendMessage({
          type: 'btff:poe-ninja-ping',
        })) as {
          durationMs?: number;
          error?: string;
          fetchedAt?: string;
          lineCount?: number;
          ok?: boolean;
        };

        if (response?.ok) {
          poeNinjaStatus = {
            state: 'success',
            message: `Received ${response.lineCount ?? 0} currency rows from poe.ninja.`,
            details: `${response.durationMs ?? 0} ms | ${response.fetchedAt ?? 'unknown time'}`,
          };
        } else {
          poeNinjaStatus = {
            state: 'error',
            message: response?.error ?? 'Unknown background fetch failure.',
          };
        }
      } catch (error) {
        poeNinjaStatus = {
          state: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }

      render();
    }

    async function syncSchema() {
      isSchemaLoading = true;
      render();

      try {
        const nextSchema = await loadStoredSchema();
        applySchema(nextSchema);
      } finally {
        isSchemaLoading = false;
        render();
      }
    }

    async function syncEquivalentPricing(enabled: boolean) {
      const tradeLocation = snapshot.tradeLocation;

      if (
        !enabled ||
        !tradeLocation ||
        tradeLocation.version !== '1' ||
        snapshot.resultsFound === 0
      ) {
        applyEquivalentPricings(document, snapshot.version, null);
        return;
      }

      if (chaosRatiosLeague === tradeLocation.league && chaosRatios) {
        applyEquivalentPricings(document, snapshot.version, chaosRatios);
        return;
      }

      const requestId = ++equivalentPricingRequestId;

      try {
        const response = (await browser.runtime.sendMessage({
          type: 'btff:poe-ninja-chaos-ratios',
          league: tradeLocation.league,
        })) as {
          ok?: boolean;
          ratios?: PoeNinjaChaosRatios;
        };

        if (requestId !== equivalentPricingRequestId) {
          return;
        }

        if (!response?.ok || !response.ratios) {
          applyEquivalentPricings(document, snapshot.version, null);
          return;
        }

        chaosRatiosLeague = tradeLocation.league;
        chaosRatios = response.ratios;
        applyEquivalentPricings(document, snapshot.version, response.ratios);
      } catch (error) {
        console.error('Failed to apply equivalent pricing.', error);
        applyEquivalentPricings(document, snapshot.version, null);
      }
    }

    function applyTradePageEnhancers() {
      const disabledEnhancers = schema?.preferences.disabledEnhancers ?? [];

      pinnedItemsStore.ensureButtons(document);

      if (isEnhancerEnabled(disabledEnhancers, 'highlight-stat-filters')) {
        applyHighlightStatFilters(document);
      } else {
        clearHighlightStatFilters(document);
      }

      if (isEnhancerEnabled(disabledEnhancers, 'regroup-similars')) {
        regroupSimilarsController.apply(document);
      } else {
        regroupSimilarsController.clear(document);
        regroupSimilarsController.reset();
      }

      const socketWarnings = applyMaximumSocketWarnings(
        document,
        isEnhancerEnabled(disabledEnhancers, 'maximum-sockets'),
      );

      void syncEquivalentPricing(
        isEnhancerEnabled(disabledEnhancers, 'equivalent-pricings'),
      );

      return socketWarnings;
    }

    async function selectPage(page: ContentPage) {
      currentPage = page;
      render();

      if (page === 'pinned') {
        return;
      }

      try {
        const nextSchema = await setStoredCurrentPage(page);
        applySchema(nextSchema);
      } catch (error) {
        console.error('Failed to persist content panel page preference.', error);
      }
    }

    function clearPinnedItems() {
      pinnedItemsStore.clear();
    }

    function scrollToPinnedItem(itemId: string) {
      pinnedItemsStore.scrollToItem(itemId);
    }

    async function setSidePanelCollapsed(collapsed: boolean) {
      try {
        const nextSchema = await updateStoredPreferences({
          sidePanelCollapsed: collapsed,
        });
        applySchema(nextSchema);
      } catch (error) {
        console.error('Failed to persist side-panel collapse state.', error);
      }
    }

    async function toggleFolder(folderId: string) {
      try {
        const nextSchema = await toggleStoredExpandedFolder(folderId);
        applySchema(nextSchema);
      } catch (error) {
        console.error('Failed to persist folder expansion state.', error);
      }
    }

    function unpinItem(itemId: string) {
      pinnedItemsStore.unpin(itemId);
    }

    async function saveTrade(draft: {
      folderId: string | null;
      folderTitle: string | null;
      folderIcon: string | null;
      title: string;
    }) {
      if (!snapshot.tradeLocation) {
        throw new Error('The current trade page does not expose a saveable search yet.');
      }

      const nextSchema = await saveStoredBookmarkTrade({
        folderId: draft.folderId,
        folderTitle: draft.folderTitle,
        folderIcon: draft.folderIcon,
        title: draft.title,
        location: {
          version: snapshot.tradeLocation.version,
          type: snapshot.tradeLocation.type,
          slug: snapshot.tradeLocation.slug,
        },
      });
      applySchema(nextSchema);
    }

    async function reorderFolders(fromIndex: number, toIndex: number) {
      const nextSchema = await reorderStoredBookmarkFolders(fromIndex, toIndex);
      applySchema(nextSchema);
    }

    async function clearHistory() {
      const nextSchema = await clearStoredHistory();
      applySchema(nextSchema);
    }

    async function renameTrade(folderId: string, tradeId: string, title: string) {
      const nextSchema = await renameStoredBookmarkTrade({
        folderId,
        tradeId,
        title,
      });
      applySchema(nextSchema);
    }

    async function updateTradeLocation(folderId: string, tradeId: string) {
      if (!snapshot.tradeLocation) {
        throw new Error('Open a trade search before updating a saved trade location.');
      }

      const nextSchema = await updateStoredBookmarkTradeLocation({
        folderId,
        tradeId,
        location: {
          version: snapshot.tradeLocation.version,
          type: snapshot.tradeLocation.type,
          slug: snapshot.tradeLocation.slug,
        },
      });
      applySchema(nextSchema);
    }

    async function toggleTradeCompletion(folderId: string, tradeId: string) {
      const nextSchema = await toggleStoredBookmarkTradeCompletion({
        folderId,
        tradeId,
      });
      applySchema(nextSchema);
    }

    async function toggleFolderArchive(folderId: string) {
      const nextSchema = await toggleStoredBookmarkFolderArchive({
        folderId,
      });
      applySchema(nextSchema);
    }

    async function copyFolderExport(folderId: string) {
      const exportText = await exportStoredBookmarkFolder(folderId);
      await copyTextToClipboard(exportText);
    }

    function handleStorageChange(
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      areaName: string,
    ) {
      if (areaName !== 'local' || !changes[STORAGE_SCHEMA_KEY]) return;
      void syncSchema();
    }

    function applySchema(nextSchema: StorageSchemaV1) {
      schema = nextSchema;
      if (currentPage !== 'pinned') {
        currentPage = normalizeContentPage(nextSchema.preferences.currentPage);
      }
      snapshot.socketWarnings = applyTradePageEnhancers();
      pageTitleController.update(nextSchema, snapshot.tradeLocation);
      render();
    }
  },
});

function debounce(callback: () => void, delayMs: number) {
  let timeoutId: number | null = null;

  return () => {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(callback, delayMs);
  };
}

function normalizeContentPage(currentPage: string | null): ContentPage {
  if (currentPage === 'pinned') return 'pinned';
  return currentPage === 'history' ? 'history' : 'bookmarks';
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}
