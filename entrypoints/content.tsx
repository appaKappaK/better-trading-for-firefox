import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

import { Phase0Panel } from '@/src/content/Phase0Panel';
import {
  applyEquivalentPricings,
} from '@/src/content/equivalentPricings';
import {
  applyHighlightStatFilters,
  clearHighlightStatFilters,
} from '@/src/content/highlightStatFilters';
import {
  createPinnedItemsStore,
  PINNED_ITEMS_HOST_PAGE_STYLES,
  type PinnedItemRecord,
} from '@/src/content/pinnedItems';
import {
  clampPanelPosition,
  hasExceededDragThreshold,
  resolvePanelDragSurface,
  type PanelDragSurface,
} from '@/src/content/panelDrag';
import {
  clearPendingPinnedJump,
  isSessionPinsActive,
  loadPendingPinnedJump,
  loadSessionPinnedItems,
  savePendingPinnedJump,
  saveSessionPinnedItems,
  setSessionPinsActive,
  type PendingPinnedJump,
} from '@/src/content/pinnedSession';
import { createPageTitleController } from '@/src/content/pageTitle';
import {
  createRegroupSimilarsController,
  REGROUP_SIMILARS_HOST_PAGE_STYLES,
} from '@/src/content/regroupSimilars';
import {
  applyMaximumSocketWarnings,
  collectTradePageSnapshot,
} from '@/src/content/tradePage';
import { isEnhancerEnabled } from '@/src/lib/preferences/enhancers';
import type { PoeNinjaChaosRatios } from '@/src/lib/poeNinja/chaosRatios';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';
import {
  clearStoredHistory,
  completeStoredOnboarding,
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
    let currentPage: ContentPage = normalizeContentPage(null);
    let pageHideCleanup: (() => void) | null = null;
    let pageShowCleanup: (() => void) | null = null;
    let pendingJumpIntervalId: number | null = null;
    let pendingJumpTimeoutId: number | null = null;
    let sessionPinsActive = false;
    const sessionStorageRef = window.sessionStorage;

    const render = () => {
      if (!root) return;

      root.render(
        <Phase0Panel
          currentPage={currentPage}
          isPinnedItemOnCurrentPage={isPinnedItemOnCurrentPage}
          isCollapsed={Boolean(schema?.preferences.sidePanelCollapsed)}
          isSchemaLoading={isSchemaLoading}
          onClearHistory={() => clearHistory()}
          onClearPinnedItems={clearPinnedItems}
          onCompleteOnboarding={() => completeOnboarding()}
          onRenameTrade={(folderId, tradeId, title) =>
            renameTrade(folderId, tradeId, title)
          }
          onCopyFolderExport={(folderId) => copyFolderExport(folderId)}
          onReorderFolders={(fromIndex, toIndex) => reorderFolders(fromIndex, toIndex)}
          onSaveTrade={(draft) => saveTrade(draft)}
          onActivatePinnedItem={activatePinnedItem}
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
          schema={schema}
          snapshot={snapshot}
        />,
      );
    };

    const refresh = () => {
      snapshot = collectTradePageSnapshot(document);
      pinnedItemsStore.setSourcePath(snapshot.currentPath);
      pageTitleController.update(schema, snapshot.tradeLocation);

      if (
        !sessionPinsActive &&
        ((lastPinnedPath !== null && snapshot.currentPath !== lastPinnedPath) ||
          snapshot.resultsFound === 0)
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
      if (sessionPinsActive) {
        resumePendingPinnedJump();
      }
      render();
    };

    const debouncedRefresh = debounce(refresh, REFRESH_DEBOUNCE_MS);

    let shadowHostRef: HTMLElement | null = null;
    let hostSidebarStyle: HTMLStyleElement | null = null;
    let dragHeaderCleanup: (() => void) | null = null;
    let dragState:
      | {
          dragged: boolean;
          offsetX: number;
          offsetY: number;
          startX: number;
          startY: number;
          startedOnLauncher: boolean;
          surface: PanelDragSurface;
        }
      | null = null;
    let suppressLauncherClick = false;
    let suppressLauncherClickTimeoutId: number | null = null;
    let overlayPosition:
      | {
          left: number;
          top: number;
        }
      | null = null;

    function applyOverlayPosition() {
      if (!shadowHostRef) return;
      if (!overlayPosition) {
        shadowHostRef.style.removeProperty('--btff-panel-left');
        shadowHostRef.style.setProperty('--btff-panel-top', '16px');
        shadowHostRef.style.setProperty('--btff-panel-right', '16px');
        return;
      }

      shadowHostRef.style.setProperty('--btff-panel-top', `${overlayPosition.top}px`);
      shadowHostRef.style.setProperty('--btff-panel-left', `${overlayPosition.left}px`);
      shadowHostRef.style.setProperty('--btff-panel-right', 'auto');
    }

    function reclampOverlayPositionAfterRender() {
      if (!overlayPosition) return;

      window.requestAnimationFrame(() => {
        if (!overlayPosition || !shadowHostRef) return;

        const panel = shadowHostRef.shadowRoot?.querySelector<HTMLElement>(
          '.btff-panel',
        );
        if (!panel) return;

        overlayPosition = clampPanelPosition(
          overlayPosition,
          { height: window.innerHeight, width: window.innerWidth },
          {
            height: panel.offsetHeight || panel.getBoundingClientRect().height,
            width: panel.offsetWidth || panel.getBoundingClientRect().width,
          },
        );
        applyOverlayPosition();
      });
    }

    function attachDragHandlers(shadow: ShadowRoot) {
      if (!shadowHostRef) return;

      const getDraggableElement = () =>
        shadow.querySelector<HTMLElement>('.btff-panel-dock') ??
        shadow.querySelector<HTMLElement>('.btff-panel');

      // Attach to the shadow root, not the header element directly.
      // React replaces the header DOM node on collapse/expand, so a cached
      // reference goes stale. The shadow root itself is stable for the lifetime
      // of the content script.
      const startDrag = ((rawEvent: Event) => {
        const event = rawEvent as MouseEvent;
        if (event.button !== 0) return;

        const path = event.composedPath();
        const surface = resolvePanelDragSurface(path);
        if (!surface) return;
        if (!schema?.preferences.sidePanelDraggable) return;
        if (schema?.preferences.sidePanelSidebar) return;
        if (surface === 'expanded-header') event.preventDefault();

        const panelEl = getDraggableElement();
        const rect = panelEl ? panelEl.getBoundingClientRect() : shadowHostRef!.getBoundingClientRect();
        dragState = {
          dragged: false,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          startX: event.clientX,
          startY: event.clientY,
          startedOnLauncher: path.some(
            (target) =>
              target instanceof Element &&
              target.classList.contains('btff-panel-dock__button'),
          ),
          surface,
        };
      }) as EventListener;

      const onMove = (event: MouseEvent) => {
        if (!dragState || !shadowHostRef) return;
        if (schema?.preferences.sidePanelSidebar) return;
        if (!schema?.preferences.sidePanelDraggable) return;
        if (
          !dragState.dragged &&
          !hasExceededDragThreshold(
            { x: dragState.startX, y: dragState.startY },
            { x: event.clientX, y: event.clientY },
          )
        ) {
          return;
        }

        dragState.dragged = true;
        shadowHostRef.setAttribute('data-dragging', 'true');
        event.preventDefault();

        const panelEl = getDraggableElement();
        const panelWidth = panelEl?.offsetWidth || 320;
        const panelHeight = panelEl?.offsetHeight || 300;
        overlayPosition = clampPanelPosition(
          {
            left: event.clientX - dragState.offsetX,
            top: event.clientY - dragState.offsetY,
          },
          { height: window.innerHeight, width: window.innerWidth },
          { height: panelHeight, width: panelWidth },
        );
        applyOverlayPosition();
      };

      const stopDrag = () => {
        if (dragState?.dragged && dragState.startedOnLauncher) {
          suppressLauncherClick = true;
          if (suppressLauncherClickTimeoutId !== null) {
            window.clearTimeout(suppressLauncherClickTimeoutId);
          }
          suppressLauncherClickTimeoutId = window.setTimeout(() => {
            suppressLauncherClick = false;
            suppressLauncherClickTimeoutId = null;
          }, 0);
        }

        dragState = null;
        shadowHostRef?.removeAttribute('data-dragging');
      };

      const suppressDraggedLauncherClick = ((rawEvent: Event) => {
        if (!suppressLauncherClick) return;

        const event = rawEvent as MouseEvent;
        const inLauncher = event.composedPath().some(
          (target) =>
            target instanceof Element &&
            target.classList.contains('btff-panel-dock__button'),
        );
        if (!inLauncher) return;

        suppressLauncherClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }) as EventListener;

      const cancelDrag = () => {
        dragState = null;
        shadowHostRef?.removeAttribute('data-dragging');
      };

      shadow.addEventListener('mousedown', startDrag as EventListener);
      shadow.addEventListener('click', suppressDraggedLauncherClick, true);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('blur', cancelDrag);

      dragHeaderCleanup = () => {
        shadow.removeEventListener('mousedown', startDrag as EventListener);
        shadow.removeEventListener('click', suppressDraggedLauncherClick, true);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', stopDrag);
        window.removeEventListener('blur', cancelDrag);
        if (suppressLauncherClickTimeoutId !== null) {
          window.clearTimeout(suppressLauncherClickTimeoutId);
          suppressLauncherClickTimeoutId = null;
        }
        suppressLauncherClick = false;
        dragHeaderCleanup = null;
      };
    }

    function applySidebarMode(isSidebar: boolean) {
      if (!shadowHostRef) return;
      if (isSidebar) {
        shadowHostRef.setAttribute('data-sidebar', 'true');
        shadowHostRef.removeAttribute('data-draggable');
        if (!hostSidebarStyle) {
          hostSidebarStyle = document.createElement('style');
          hostSidebarStyle.id = 'btff-sidebar-margin';
          document.head.appendChild(hostSidebarStyle);
        }
        hostSidebarStyle.textContent = [
          'body{padding-right:320px!important;}',
          // Push the trade site's fixed scroll-to-top button so the panel doesn't cover it.
          '.top-btn{right:340px!important;transition:right 0.2s ease;}',
        ].join('\n');
      } else {
        shadowHostRef.removeAttribute('data-sidebar');
        if (schema?.preferences.sidePanelDraggable) {
          shadowHostRef.setAttribute('data-draggable', 'true');
        } else {
          shadowHostRef.removeAttribute('data-draggable');
        }
        applyOverlayPosition();
        if (hostSidebarStyle) {
          hostSidebarStyle.remove();
          hostSidebarStyle = null;
        }
      }
    }

    const ui = await createShadowRootUi(ctx, {
      name: 'btff-phase0-panel',
      position: 'overlay',
      alignment: 'top-right',
      anchor: 'body',
      append: 'last',
      onMount(container, shadow, shadowHost) {
        shadowHostRef = shadowHost;
        shadowHost.setAttribute('data-btff-phase0-host', 'true');
        document.documentElement.setAttribute('data-btff-phase0', 'mounted');

        pageTitleController.connect();
        root = createRoot(container);
        unsubscribePinnedItems = pinnedItemsStore.subscribe((nextPinnedItems) => {
          pinnedItems = nextPinnedItems;
          if (sessionPinsActive) {
            saveSessionPinnedItems(sessionStorageRef, nextPinnedItems);
          }
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

        attachDragHandlers(shadow);

        const hostStyle = document.createElement('style');
        hostStyle.id = 'btff-host-styles';
        hostStyle.textContent = [
          PINNED_ITEMS_HOST_PAGE_STYLES,
          REGROUP_SIMILARS_HOST_PAGE_STYLES,
        ].join('\n');
        document.head.appendChild(hostStyle);

        void syncSchema();
        attachPageLifecycleListeners();

        return root;
      },
      onRemove(mountedRoot) {
        document.getElementById('btff-host-styles')?.remove();
        document.documentElement.removeAttribute('data-btff-phase0');
        applySidebarMode(false);
        shadowHostRef = null;
        observer?.disconnect();
        pageTitleController.disconnect();
        browser.storage.onChanged.removeListener(handleStorageChange);
        dragHeaderCleanup?.();
        unsubscribePinnedItems?.();
        observer = null;
        unsubscribePinnedItems = null;
        stopPendingPinnedJumpWatch();
        pageHideCleanup?.();
        pageShowCleanup?.();
        pageHideCleanup = null;
        pageShowCleanup = null;
        mountedRoot?.unmount();
        root = null;
      },
    });

    ui.autoMount();
    refresh();
    browser.storage.onChanged.addListener(handleStorageChange);

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

    function isPinnedItemOnCurrentPage(itemId: string) {
      return pinnedItemsStore.hasRow(itemId);
    }

    function activatePinnedItem(itemId: string) {
      const item = pinnedItemsStore.getItem(itemId);
      if (!item) return;

      if (pinnedItemsStore.hasRow(itemId)) {
        pinnedItemsStore.scrollToItem(itemId);
        clearPendingPinnedJump(sessionStorageRef);
        stopPendingPinnedJumpWatch();
        return;
      }

      if (!sessionPinsActive) {
        return;
      }

      const pendingJump: PendingPinnedJump = {
        itemId,
        sourcePath: item.sourcePath,
        startedAt: Date.now(),
      };

      savePendingPinnedJump(sessionStorageRef, pendingJump);

      if (window.location.pathname !== item.sourcePath) {
        window.location.assign(item.sourcePath);
        return;
      }

      startPendingPinnedJumpWatch(pendingJump);
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

    async function completeOnboarding() {
      try {
        const nextSchema = await completeStoredOnboarding();
        applySchema(nextSchema);
      } catch (error) {
        console.error('Failed to complete onboarding.', error);
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
      const pendingJump = loadPendingPinnedJump(sessionStorageRef);
      if (pendingJump?.itemId === itemId) {
        clearPendingPinnedJump(sessionStorageRef);
        stopPendingPinnedJumpWatch();
      }
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
      const wasCollapsed = Boolean(schema?.preferences.sidePanelCollapsed);
      const wasSessionPinsActive = sessionPinsActive;
      schema = nextSchema;
      sessionPinsActive = syncSessionPinActivation(nextSchema);
      if (currentPage !== 'pinned') {
        currentPage = normalizeContentPage(nextSchema.preferences.currentPage);
      }
      if (sessionPinsActive && !wasSessionPinsActive) {
        restoreOrPersistSessionPins();
      }
      applySidebarMode(Boolean(nextSchema.preferences.sidePanelSidebar));
      snapshot.socketWarnings = applyTradePageEnhancers();
      pageTitleController.update(nextSchema, snapshot.tradeLocation);
      if (sessionPinsActive) {
        resumePendingPinnedJump();
      }
      render();
      if (wasCollapsed && !nextSchema.preferences.sidePanelCollapsed) {
        reclampOverlayPositionAfterRender();
      }
    }

    function attachPageLifecycleListeners() {
      const handlePageHide = () => {
        stopPendingPinnedJumpWatch();
      };
      const handlePageShow = () => {
        if (sessionPinsActive) {
          restoreOrPersistSessionPins();
          resumePendingPinnedJump();
        }
        refresh();
      };

      window.addEventListener('pagehide', handlePageHide);
      window.addEventListener('pageshow', handlePageShow);

      pageHideCleanup = () => {
        window.removeEventListener('pagehide', handlePageHide);
      };
      pageShowCleanup = () => {
        window.removeEventListener('pageshow', handlePageShow);
      };
    }

    function restoreOrPersistSessionPins() {
      const storedPins = loadSessionPinnedItems(sessionStorageRef);

      if (storedPins.length > 0) {
        pinnedItemsStore.replaceItems(storedPins);
        return;
      }

      if (pinnedItemsStore.getItems().length > 0) {
        saveSessionPinnedItems(sessionStorageRef, pinnedItemsStore.getItems());
      }
    }

    function syncSessionPinActivation(nextSchema: StorageSchemaV1) {
      const preferenceEnabled = Boolean(
        nextSchema.preferences.persistPinnedItemsInSession,
      );
      const alreadyActive = isSessionPinsActive(sessionStorageRef);

      if (preferenceEnabled && !alreadyActive) {
        setSessionPinsActive(sessionStorageRef, true);
        return true;
      }

      return preferenceEnabled || alreadyActive;
    }

    function resumePendingPinnedJump() {
      const pendingJump = loadPendingPinnedJump(sessionStorageRef);
      if (!pendingJump) return;
      if (window.location.pathname !== pendingJump.sourcePath) return;

      startPendingPinnedJumpWatch(pendingJump);
    }

    function startPendingPinnedJumpWatch(pendingJump: PendingPinnedJump) {
      stopPendingPinnedJumpWatch();

      if (pinnedItemsStore.hasRow(pendingJump.itemId)) {
        pinnedItemsStore.scrollToItem(pendingJump.itemId);
        clearPendingPinnedJump(sessionStorageRef);
        return;
      }

      pendingJumpIntervalId = window.setInterval(() => {
        if (window.location.pathname !== pendingJump.sourcePath) {
          stopPendingPinnedJumpWatch();
          return;
        }

        if (pinnedItemsStore.hasRow(pendingJump.itemId)) {
          pinnedItemsStore.scrollToItem(pendingJump.itemId);
          clearPendingPinnedJump(sessionStorageRef);
          stopPendingPinnedJumpWatch();
        }
      }, 200);

      pendingJumpTimeoutId = window.setTimeout(() => {
        clearPendingPinnedJump(sessionStorageRef);
        stopPendingPinnedJumpWatch();
      }, 10_000);
    }

    function stopPendingPinnedJumpWatch() {
      if (pendingJumpIntervalId !== null) {
        window.clearInterval(pendingJumpIntervalId);
        pendingJumpIntervalId = null;
      }
      if (pendingJumpTimeoutId !== null) {
        window.clearTimeout(pendingJumpTimeoutId);
        pendingJumpTimeoutId = null;
      }
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
  if (currentPage === 'history') return 'history';
  if (currentPage === 'bookmarks') return 'bookmarks';
  return 'pinned';
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
