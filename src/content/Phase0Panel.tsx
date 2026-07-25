import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import betterTradingIcon from '/public/icon/better_tradingICO.png?url';
import ancientOrbIconUrl from '/public/assets/images/bookmark-folder/Ancient_Orb_inventory_icon.png?url';
import alchemyIconUrl from '/public/assets/images/bookmark-folder/alchemy.png?url';
import chaosIconUrl from '/public/assets/images/bookmark-folder/chaos.png?url';
import divineIconUrl from '/public/assets/images/bookmark-folder/divine.png?url';
import exaltedOrbIconUrl from '/public/assets/images/bookmark-folder/exalt.png?url';
import glassblowersBaubleIconUrl from "/public/assets/images/bookmark-folder/Glassblower's_Bauble_inventory_icon.png?url";
import jewellersOrbIconUrl from "/public/assets/images/bookmark-folder/Jeweller's_Orb_inventory_icon.png?url";
import mirrorOfKalandraIconUrl from '/public/assets/images/bookmark-folder/mirror.png?url';
import orbOfAlterationIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Alteration_inventory_icon.png?url';
import orbOfAnnulmentIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Annulment_inventory_icon.png?url';
import orbOfAugmentationIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Augmentation_inventory_icon.png?url';
import orbOfBindingIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Binding_inventory_icon.png?url';
import orbOfChanceIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Chance_inventory_icon.png?url';
import orbOfFusingIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Fusing_inventory_icon.png?url';
import orbOfScouringIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Scouring_inventory_icon.png?url';
import orbOfUnmakingIconUrl from '/public/assets/images/bookmark-folder/Orb_of_Unmaking_inventory_icon.png?url';
import regalOrbIconUrl from '/public/assets/images/bookmark-folder/Regal_Orb_inventory_icon.png?url';
import vaalOrbIconUrl from '/public/assets/images/bookmark-folder/Vaal_Orb_inventory_icon.png?url';

import type {
  BookmarkColor,
  BookmarkFolder,
  BookmarkTrade,
} from '@/src/features/bookmarks/types';
import { FolderIcon, FolderIconPicker } from '@/src/components/FolderIcon';
import { NameColorPicker } from '@/src/components/NameColorPicker';
import { getFolderIconLabel } from '@/src/lib/bookmarks/folderIcons';
import { getBookmarkColorHex } from '@/src/lib/bookmarks/nameColors';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';
import {
  formatTradeLeagueLabel,
  formatRelativeTimestamp,
  getTradeUrl,
  parseTradeLocationFromPathname,
  type ParsedTradeLocation,
} from '@/src/lib/trade/location';
import { attachTransientScrollbar } from '@/src/lib/ui/transientScrollbar';

import {
  getPinnedItemDisplayTitle,
  type PinnedItemRecord,
} from './pinnedItems';
import type { TradePageSnapshot } from './tradePage';

type PanelPage = 'bookmarks' | 'history' | 'pinned';
type FolderReorderEdge = 'after' | 'before';

interface FolderReorderDragState {
  bounds: FolderReorderBounds[];
  currentY: number;
  edge: FolderReorderEdge;
  fromIndex: number;
  isCommitting: boolean;
  overIndex: number;
  pointerId: number;
  scrollOffset: number;
  shiftDistance: number;
  sourceHeight: number;
  startScrollTop: number;
  startY: number;
  toIndex: number;
}

interface FolderReorderBounds {
  bottom: number;
  height: number;
  top: number;
}

type FolderReorderStyle = CSSProperties & {
  '--btff-folder-drag-y'?: string;
  '--btff-folder-shift-y'?: string;
  '--btff-folder-slot-height'?: string;
  '--btff-folder-slot-y'?: string;
};

const SUCCESS_FEEDBACK_DURATION_MS = 3_000;

interface SaveTradeDraft {
  bookmarkColor: BookmarkColor | null;
  folderColor: BookmarkColor | null;
  folderId: string | null;
  folderTitle: string | null;
  folderIcon: string | null;
  title: string;
}

interface Props {
  currentPage: PanelPage;
  isPinnedItemOnCurrentPage: (itemId: string) => boolean;
  isCollapsed: boolean;
  isSchemaLoading: boolean;
  onClearHistory: () => Promise<void> | void;
  onClearPinnedItems: () => void;
  onReorderFolders: (fromIndex: number, toIndex: number) => Promise<void> | void;
  onReorderPinnedItems: (fromIndex: number, toIndex: number) => void;
  onRenameTrade: (
    folderId: string,
    tradeId: string,
    title: string,
  ) => Promise<void> | void;
  onCopyFolderExport: (folderId: string) => Promise<void> | void;
  onSaveTrade: (draft: SaveTradeDraft) => Promise<void> | void;
  onSelectPage: (page: PanelPage) => void;
  onSetHeaderHidden: (hidden: boolean) => void;
  onSetCollapsed: (collapsed: boolean) => void;
  onActivatePinnedItem: (itemId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onToggleFolderArchive: (folderId: string) => Promise<void> | void;
  onToggleTradeCompletion: (
    folderId: string,
    tradeId: string,
  ) => Promise<void> | void;
  onUnpinItem: (itemId: string) => void;
  onUpdateTradeLocation: (
    folderId: string,
    tradeId: string,
  ) => Promise<void> | void;
  //onPoeNinjaPing?: () => void; // Add this line (make it optional with ?)
  //onRefresh?: () => void; // Add this line (make it optional with ?)
  pinnedItems: PinnedItemRecord[];
  schema: StorageSchemaV1 | null;
  snapshot: TradePageSnapshot;
}

export function Phase0Panel({
  currentPage,
  isPinnedItemOnCurrentPage,
  isCollapsed,
  isSchemaLoading,
  onClearPinnedItems,
  onRenameTrade,
  onReorderFolders,
  onReorderPinnedItems,
  onCopyFolderExport,
  onSaveTrade,
  onSelectPage,
  onSetHeaderHidden,
  onSetCollapsed,
  onActivatePinnedItem,
  onToggleFolder,
  onToggleFolderArchive,
  onToggleTradeCompletion,
  onUnpinItem,
  onUpdateTradeLocation,
  //onPoeNinjaPing,
  //onRefresh,
  pinnedItems,
  schema,
  snapshot,
}: Props) {
  const isSidebar = schema?.preferences.sidePanelSidebar ?? false;
  const folders = schema?.bookmarks.folders ?? [];
  const historyEntries = schema?.history.entries ?? [];
  const bookmarkFolderCount = folders.length;
  const dockLeagueSummary = resolveDockLeagueSummary(
    snapshot.tradeLocation,
    pinnedItems,
  );
  const dockSummary = [
    `${pinnedItems.length} pinned`,
    `${snapshot.resultsFound} results`,
    dockLeagueSummary,
  ]
    .filter(Boolean)
    .join(' | ');
  const panelRef = useRef<HTMLElement | null>(null);
  const panelScrollAreaRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const scrollArea = panelScrollAreaRef.current;
    if (!panel || !scrollArea || isCollapsed) return;

    const detachTransientScrollbar = attachTransientScrollbar(scrollArea);
    const handleContainedWheel = (event: WheelEvent) => {
      const eventTarget = event.target;
      const nestedSurface =
        eventTarget instanceof Element
          ? eventTarget.closest<HTMLElement>(
              '[data-transient-scrollbar="true"]',
            )
          : null;
      const scrollSurface =
        nestedSurface && panel.contains(nestedSurface)
          ? nestedSurface
          : currentPage === 'bookmarks'
            ? panel.querySelector<HTMLElement>(
                '.btff-panel__bookmark-list-scroll',
              )
            : scrollArea;

      event.preventDefault();
      event.stopPropagation();
      if (!scrollSurface) return;

      const deltaMultiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? Math.max(scrollSurface.clientHeight, 1)
            : 1;
      scrollSurface.scrollTop += event.deltaY * deltaMultiplier;
      scrollSurface.scrollLeft += event.deltaX * deltaMultiplier;
      scrollSurface.dispatchEvent(new Event('scroll'));
    };

    panel.addEventListener('wheel', handleContainedWheel, { passive: false });

    return () => {
      panel.removeEventListener('wheel', handleContainedWheel);
      detachTransientScrollbar();
    };
  }, [currentPage, isCollapsed]);

  if (isCollapsed) {
    return (
      <section className="btff-panel-dock">
        <button
          aria-label="Expand Better Trading for Firefox"
          className="btff-panel-dock__button"
          onClick={() => onSetCollapsed(false)}
          title="Drag to move; click to expand"
          type="button">
          <strong>Better Trading</strong>
          <span className="btff-panel-dock__summary" title={dockSummary}>
            {dockSummary}
          </span>
        </button>
        {pinnedItems.length > 0 ? (
          <>
            <ul className="btff-panel-dock__pinned-list">
              {pinnedItems.slice(0, 3).map((item) => {
                const displayTitle = getPinnedItemDisplayTitle(item.title);
                const isOnCurrentPage = isPinnedItemOnCurrentPage(item.id);

                return (
                  <li key={item.id} className="btff-panel-dock__pinned-item">
                    {item.imageUrl ? (
                      <img
                        alt=""
                        aria-hidden="true"
                        className="btff-panel-dock__pinned-thumb"
                        draggable={false}
                        src={item.imageUrl}
                      />
                    ) : null}
                    <span className="btff-panel-dock__pinned-copy">
                      <span
                        className="btff-panel-dock__pinned-title"
                        title={displayTitle}>
                        {displayTitle}
                      </span>
                      {item.price ? (
                        <PinnedPrice
                          className="btff-panel-dock__pinned-price"
                          currencyIconUrl={item.currencyIconUrl}
                          price={item.price}
                        />
                      ) : null}
                    </span>
                    <button
                      className="btff-panel-dock__pinned-jump"
                      onClick={() => onActivatePinnedItem(item.id)}
                      aria-label={
                        isOnCurrentPage
                          ? `Jump to ${displayTitle}`
                          : `Open saved search for ${displayTitle}`
                      }
                      title={
                        isOnCurrentPage
                          ? 'Jump to pinned item'
                          : 'Open saved search for pinned item'
                      }
                      type="button">
                      {isOnCurrentPage ? 'Jump' : 'Open'}
                    </button>
                  </li>
                );
              })}
            </ul>
            {pinnedItems.length > 3 ? (
              <button
                aria-label={`Show ${pinnedItems.length - 3} more pinned ${
                  pinnedItems.length - 3 === 1 ? 'item' : 'items'
                }`}
                className="btff-panel-dock__more"
                onClick={() => onSetCollapsed(false)}
                type="button">
                +{pinnedItems.length - 3} more
              </button>
            ) : null}
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section className="btff-panel" ref={panelRef}>
      {!schema?.preferences.popupIntroHidden ? (
        <div
          className="btff-panel__header"
          onContextMenu={(event) => {
            event.preventDefault();
            onSetHeaderHidden(true);
          }}
          title="Right-click to hide the panel header">
          <div className="btff-panel__header-copy">
            <h1 className="btff-panel__title">Path of Exile</h1>
            <p className="btff-panel__eyebrow">Better Trading</p>
          </div>
          <button
            aria-label="Shrink Better Trading panel"
            className="btff-panel__logo-button"
            disabled={isSidebar}
            onClick={(event) => {
              if (event.detail === 0 && !isSidebar) onSetCollapsed(true);
            }}
            onDoubleClick={() => {
              if (!isSidebar) onSetCollapsed(true);
            }}
            title="Double-click to shrink"
            type="button">
            <img
              alt=""
              aria-hidden="true"
              className="btff-panel__logo-image"
              draggable="false"
              src={betterTradingIcon}
            />
          </button>
        </div>
      ) : null}

      <nav
        className="btff-panel__tabs"
        aria-label="Saved data views"
        onContextMenu={(event) => {
          if (!schema?.preferences.popupIntroHidden) return;

          event.preventDefault();
          onSetHeaderHidden(false);
        }}
        title={
          schema?.preferences.popupIntroHidden
            ? 'Right-click to show the panel header'
            : undefined
        }>
        <button
          className="btff-panel__tab"
          data-active={currentPage === 'pinned'}
          onClick={() => onSelectPage('pinned')}
          type="button">
          Pinned
        </button>
        <button
          className="btff-panel__tab"
          data-active={currentPage === 'bookmarks'}
          onClick={() => onSelectPage('bookmarks')}
          type="button">
          Bookmarks
        </button>
        <button
          className="btff-panel__tab"
          data-active={currentPage === 'history'}
          onClick={() => onSelectPage('history')}
          type="button">
          History
        </button>
      </nav>

      {currentPage !== 'bookmarks' ? (
        <div
          aria-hidden="true"
          className="btff-panel__section-divider btff-panel__section-divider--list"
        />
      ) : null}

      <div
        className="btff-panel__scroll-area"
        data-page={currentPage}
        ref={panelScrollAreaRef}>
        {currentPage === 'bookmarks' ? (
          <BookmarksView
            expandedFolderIds={schema?.preferences.expandedFolderIds ?? []}
            folders={folders}
            historyEntries={historyEntries}
            isSchemaLoading={isSchemaLoading}
            lastSeenLeagues={
              schema?.preferences.lastSeenLeagues ?? { '1': null, '2': null }
            }
            onCopyFolderExport={onCopyFolderExport}
            onRenameTrade={onRenameTrade}
            onReorderFolders={onReorderFolders}
            onSaveTrade={onSaveTrade}
            onToggleFolder={onToggleFolder}
            onToggleFolderArchive={onToggleFolderArchive}
            onToggleTradeCompletion={onToggleTradeCompletion}
            onUpdateTradeLocation={onUpdateTradeLocation}
            snapshot={snapshot}
            tradesByFolderId={schema?.bookmarks.tradesByFolderId ?? {}}
          />
        ) : null}

        {currentPage === 'history' ? (
          <HistoryView
            historyEntries={historyEntries}
            isSchemaLoading={isSchemaLoading}
          />
        ) : null}

        {currentPage === 'pinned' ? (
          <PinnedItemsView
            isPinnedItemOnCurrentPage={isPinnedItemOnCurrentPage}
            isSchemaLoading={isSchemaLoading}
            items={pinnedItems}
            onActivateItem={onActivatePinnedItem}
            onReorderItems={onReorderPinnedItems}
            onUnpinItem={onUnpinItem}
          />
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="btff-panel__section-divider btff-panel__section-divider--footer"
      />

      <section className="btff-panel__footer">
        <span>
          {bookmarkFolderCount} bookmark{bookmarkFolderCount === 1 ? '' : 's'}
        </span>
        {!isSidebar ? (
          <button
            aria-label="Collapse Better Trading for Firefox"
            className="btff-panel__chrome-button btff-panel__chrome-button--footer"
            onClick={() => onSetCollapsed(true)}
            type="button">
            Shrink
          </button>
        ) : null}
        <span>{snapshot.socketWarnings} socket warnings</span>
      </section>
    </section>
  );
}

interface BookmarksViewProps {
  expandedFolderIds: string[];
  folders: BookmarkFolder[];
  historyEntries: StorageSchemaV1['history']['entries'];
  isSchemaLoading: boolean;
  lastSeenLeagues: StorageSchemaV1['preferences']['lastSeenLeagues'];
  onCopyFolderExport: (folderId: string) => Promise<void> | void;
  onReorderFolders: (fromIndex: number, toIndex: number) => Promise<void> | void;
  onRenameTrade: (
    folderId: string,
    tradeId: string,
    title: string,
  ) => Promise<void> | void;
  onSaveTrade: (draft: SaveTradeDraft) => Promise<void> | void;
  onToggleFolder: (folderId: string) => void;
  onToggleFolderArchive: (folderId: string) => Promise<void> | void;
  onToggleTradeCompletion: (
    folderId: string,
    tradeId: string,
  ) => Promise<void> | void;
  onUpdateTradeLocation: (
    folderId: string,
    tradeId: string,
  ) => Promise<void> | void;
  snapshot: TradePageSnapshot;
  tradesByFolderId: Record<string, BookmarkTrade[]>;
}

function BookmarksView({
  expandedFolderIds,
  folders,
  historyEntries,
  isSchemaLoading,
  lastSeenLeagues,
  onRenameTrade,
  onReorderFolders,
  onSaveTrade,
  onToggleFolder,
  onToggleTradeCompletion,
  onUpdateTradeLocation,
  snapshot,
  tradesByFolderId,
}: BookmarksViewProps) {
  const currentTradeLocation = snapshot.tradeLocation;
  const activeVersion = currentTradeLocation?.version ?? null;
  const eligibleFolders = useMemo(
    () =>
      activeVersion
        ? folders.filter(
            (folder) => folder.version === activeVersion && folder.archivedAt === null,
          )
        : [],
    [activeVersion, folders],
  );
  const [saveMode, setSaveMode] = useState<'existing' | 'new'>(
    eligibleFolders.length > 0 ? 'existing' : 'new',
  );
  const [selectedFolderId, setSelectedFolderId] = useState(
    eligibleFolders[0]?.id ?? '',
  );
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState<string | null>(null);
  const [newFolderColor, setNewFolderColor] = useState<BookmarkColor | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftColor, setDraftColor] = useState<BookmarkColor | null>(null);
  const [editingTrade, setEditingTrade] = useState<{
    folderId: string;
    title: string;
    tradeId: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: 'error' | 'success';
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bookmarkListRef = useRef<HTMLDivElement | null>(null);
  const pendingBookmarkScrollRef = useRef<{
    folderId: string;
    scrollTop: number;
    shouldExpand: boolean;
  } | null>(null);
  const folderRecordRefs = useRef<Array<HTMLElement | null>>([]);
  const folderReorderDragRef = useRef<FolderReorderDragState | null>(null);
  const [folderReorderDrag, setFolderReorderDrag] =
    useState<FolderReorderDragState | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');

  useEffect(() => {
    if (saveMode === 'existing' && eligibleFolders.length === 0) {
      setSaveMode('new');
    }

    if (saveMode === 'new' && eligibleFolders.length > 0 && !selectedFolderId) {
      setSelectedFolderId(eligibleFolders[0].id);
    }

    if (selectedFolderId && !eligibleFolders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(eligibleFolders[0]?.id ?? '');
    }
  }, [eligibleFolders, saveMode, selectedFolderId]);

  useEffect(() => {
    if (feedback?.kind !== 'success') return;

    const timeoutId = window.setTimeout(() => {
      setFeedback((currentFeedback) =>
        currentFeedback === feedback ? null : currentFeedback,
      );
    }, SUCCESS_FEEDBACK_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useLayoutEffect(() => {
    const pendingScroll = pendingBookmarkScrollRef.current;
    if (!pendingScroll) return;

    const didReachRequestedState =
      expandedFolderIds.includes(pendingScroll.folderId) ===
      pendingScroll.shouldExpand;
    if (!didReachRequestedState) return;

    if (bookmarkListRef.current) {
      bookmarkListRef.current.scrollTop = pendingScroll.scrollTop;
    }
    pendingBookmarkScrollRef.current = null;
  }, [expandedFolderIds]);

  if (isSchemaLoading) {
    return <p className="btff-panel__empty">Loading saved bookmark folders...</p>;
  }

  async function handleSaveTrade() {
    setFeedback(null);

    if (!currentTradeLocation) {
      setFeedback({
        kind: 'error',
        message: 'Open a trade search before saving the current page.',
      });
      return;
    }

    const title = draftTitle.trim();
    if (!title) {
      setFeedback({
        kind: 'error',
        message: 'Give this saved trade a title first.',
      });
      return;
    }

    const shouldCreateFolder = saveMode === 'new' || eligibleFolders.length === 0;
    const folderTitle = shouldCreateFolder ? newFolderTitle.trim() : null;
    const folderId = shouldCreateFolder
      ? null
      : selectedFolderId || eligibleFolders[0]?.id || null;

    if (shouldCreateFolder && !folderTitle) {
      setFeedback({
        kind: 'error',
        message: 'Choose a folder title for the new bookmark folder.',
      });
      return;
    }

    if (!shouldCreateFolder && !folderId) {
      setFeedback({
        kind: 'error',
        message: 'Pick an existing folder before saving this trade.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveTrade({
        bookmarkColor: draftColor,
        folderColor: shouldCreateFolder ? newFolderColor : null,
        folderId,
        folderTitle,
        folderIcon: shouldCreateFolder ? newFolderIcon : null,
        title,
      });
      setFeedback({
        kind: 'success',
        message: shouldCreateFolder
          ? 'Saved the current trade into a new folder.'
          : 'Saved the current trade into the selected folder.',
      });
      setDraftTitle('');
      setDraftColor(null);
      setNewFolderTitle('');
      setNewFolderIcon(null);
      setNewFolderColor(null);
      setSaveMode('existing');
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save trade.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRenameTrade() {
    if (!editingTrade) return;

    const title = editingTrade.title.trim();
    if (!title) {
      setFeedback({
        kind: 'error',
        message: 'Trade titles cannot be empty.',
      });
      return;
    }

    setFeedback(null);
    try {
      await onRenameTrade(editingTrade.folderId, editingTrade.tradeId, title);
      setEditingTrade(null);
      setFeedback({
        kind: 'success',
        message: 'Saved the new trade title.',
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to rename trade.',
      });
    }
  }

  function updateFolderReorderDrag(nextState: FolderReorderDragState | null) {
    folderReorderDragRef.current = nextState;
    setFolderReorderDrag(nextState);
  }

  function handleToggleFolder(folderId: string) {
    const bookmarkList = bookmarkListRef.current;
    if (bookmarkList) {
      pendingBookmarkScrollRef.current = {
        folderId,
        scrollTop: bookmarkList.scrollTop,
        shouldExpand: !expandedFolderIds.includes(folderId),
      };
    }

    onToggleFolder(folderId);
  }

  function handleFolderPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    fromIndex: number,
  ) {
    if (event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const bounds = folderRecordRefs.current
      .slice(0, folders.length)
      .flatMap((record) => {
        if (!record) return [];
        const rect = record.getBoundingClientRect();
        return [{ bottom: rect.bottom, height: rect.height, top: rect.top }];
      });
    const sourceBounds = bounds[fromIndex];
    if (!sourceBounds || bounds.length !== folders.length) return;

    const initialTarget = resolveFolderReorderTarget(
      bounds,
      event.clientY,
      fromIndex,
    ) ?? {
      edge: 'before' as const,
      overIndex: fromIndex,
      toIndex: fromIndex,
    };

    updateFolderReorderDrag({
      ...initialTarget,
      bounds,
      currentY: event.clientY,
      fromIndex,
      isCommitting: false,
      pointerId: event.pointerId,
      scrollOffset: 0,
      shiftDistance: resolveFolderShiftDistance(bounds, fromIndex),
      sourceHeight: sourceBounds.height,
      startScrollTop: bookmarkListRef.current?.scrollTop ?? 0,
      startY: event.clientY,
    });
  }

  function handleFolderPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const activeDrag = folderReorderDragRef.current;
    if (
      !activeDrag ||
      activeDrag.isCommitting ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    const nextTarget = resolveFolderReorderTarget(
      resolveReorderViewportBounds(activeDrag),
      event.clientY,
      activeDrag.fromIndex,
    );
    if (!nextTarget) return;

    updateFolderReorderDrag({
      ...activeDrag,
      ...nextTarget,
      currentY: event.clientY,
    });
  }

  function handleFolderListScroll() {
    const activeDrag = folderReorderDragRef.current;
    const bookmarkList = bookmarkListRef.current;
    if (!activeDrag || activeDrag.isCommitting || !bookmarkList) return;

    updateFolderReorderDrag(
      resolveScrolledReorderDrag(activeDrag, bookmarkList.scrollTop),
    );
  }

  function handleFolderPointerEnd(
    event: ReactPointerEvent<HTMLButtonElement>,
    shouldCommit: boolean,
  ) {
    const activeDrag = folderReorderDragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

    if (activeDrag.isCommitting) return;

    const shouldMove =
      shouldCommit && activeDrag.toIndex !== activeDrag.fromIndex;

    if (!shouldMove) {
      updateFolderReorderDrag(null);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    updateFolderReorderDrag({ ...activeDrag, isCommitting: true });

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const folderTitle = folders[activeDrag.fromIndex]?.title ?? 'Bookmark folder';
    const finishReorder = () => {
      updateFolderReorderDrag(null);
      setReorderAnnouncement(
        `${folderTitle} moved to position ${activeDrag.toIndex + 1}.`,
      );
    };
    const reorderResult = onReorderFolders(
      activeDrag.fromIndex,
      activeDrag.toIndex,
    );

    if (reorderResult) {
      void reorderResult.then(finishReorder, () => updateFolderReorderDrag(null));
    } else {
      finishReorder();
    }
  }

  function handleFolderReorderKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    fromIndex: number,
  ) {
    let toIndex = fromIndex;

    if (event.key === 'ArrowUp') toIndex = Math.max(0, fromIndex - 1);
    if (event.key === 'ArrowDown') {
      toIndex = Math.min(folders.length - 1, fromIndex + 1);
    }
    if (event.key === 'Home') toIndex = 0;
    if (event.key === 'End') toIndex = folders.length - 1;
    if (toIndex === fromIndex) return;

    event.preventDefault();
    void onReorderFolders(fromIndex, toIndex);
    setReorderAnnouncement(
      `${folders[fromIndex]?.title ?? 'Bookmark folder'} moved to position ${
        toIndex + 1
      }.`,
    );
  }

  return (
    <div className="btff-panel__bookmarks-view">
      <QuickSavePanel
        currentTradeLocation={currentTradeLocation}
        eligibleFolders={eligibleFolders}
        feedback={feedback}
        isSaving={isSaving}
        newFolderColor={newFolderColor}
        newFolderIcon={newFolderIcon}
        newFolderTitle={newFolderTitle}
        onBookmarkColorChange={setDraftColor}
        onNewFolderColorChange={setNewFolderColor}
        onNewFolderIconChange={setNewFolderIcon}
        onNewFolderTitleChange={setNewFolderTitle}
        onSave={handleSaveTrade}
        onSaveModeChange={setSaveMode}
        onSelectedFolderIdChange={setSelectedFolderId}
        saveMode={saveMode}
        selectedFolderId={selectedFolderId}
        title={draftTitle}
        bookmarkColor={draftColor}
        onTitleChange={setDraftTitle}
      />

      <div
        aria-hidden="true"
        className="btff-panel__bookmark-divider"
      />

      <div
        className="btff-panel__bookmark-list-scroll"
        data-transient-scrollbar="true"
        onScroll={handleFolderListScroll}
        ref={bookmarkListRef}>
        {folders.length === 0 ? (
          <p className="btff-panel__empty">No bookmark folders yet.</p>
        ) : (
          <div className="btff-panel__records">
          <p
            aria-live="polite"
            className="btff-panel__visually-hidden">
            {reorderAnnouncement}
          </p>
          {folderReorderDrag &&
          folderReorderDrag.toIndex !== folderReorderDrag.fromIndex ? (
            <div
              aria-hidden="true"
              className="btff-panel__reorder-slot"
              data-slot-index={folderReorderDrag.toIndex}
              style={resolveFolderSlotStyle(folderReorderDrag)}
            />
          ) : null}
          {folders.map((folder, index) => {
            const trades = tradesByFolderId[folder.id] ?? [];
            const isExpanded = expandedFolderIds.includes(folder.id);
            const isRenamingTradeInFolder = editingTrade?.folderId === folder.id;
            const folderLeagueSummary = resolveBookmarkFolderLeagueSummary(
              trades,
              currentTradeLocation,
              historyEntries,
              lastSeenLeagues,
            );
            const folderIconLabel = folder.icon
              ? getFolderIconLabel(folder.icon)
              : null;
            const folderMetadataLabel = [
              `PoE ${folder.version}`,
              folderIconLabel,
              folderLeagueSummary,
            ]
              .filter(Boolean)
              .join(' · ');
            const reorderShift = resolveFolderReorderShift(
              index,
              folderReorderDrag,
            );

            return (
              <article
                key={folder.id}
                className="btff-panel__record"
                data-reorder-source={
                  folderReorderDrag?.fromIndex === index ? 'true' : undefined
                }
                data-reorder-shift={reorderShift.direction}
                ref={(element) => {
                  folderRecordRefs.current[index] = element;
                }}
                style={reorderShift.style}>
                <div
                  className="btff-panel__record-header">
                  <button
                    aria-expanded={isExpanded}
                    className="btff-panel__record-toggle"
                    onClick={() => handleToggleFolder(folder.id)}
                    type="button">
                    {folder.icon ? (
                      <FolderIcon
                        fallbackClassName="btff-panel__folder-icon-fallback"
                        imageClassName="btff-panel__folder-icon"
                        label={getFolderIconLabel(folder.icon) ?? folder.icon}
                        slug={folder.icon}
                      />
                    ) : null}
                    <div className="btff-panel__record-toggle-body">
                      <div className="btff-panel__record-title-row">
                        <strong
                          data-name-color={folder.color ?? undefined}
                          style={
                            folder.color
                              ? { color: getBookmarkColorHex(folder.color) }
                              : undefined
                          }>
                          {folder.title}
                        </strong>
                        <span className="btff-panel__record-count">
                          {trades.length} search
                          {trades.length === 1 ? '' : 'es'}
                        </span>
                      </div>
                      <small title={folderMetadataLabel}>
                        {folderMetadataLabel}
                      </small>
                    </div>
                  </button>
                  <button
                    aria-label={`Reorder ${folder.title}. Current position ${
                      index + 1
                    } of ${folders.length}.`}
                    className="btff-panel__record-reorder"
                    data-reordering={
                      folderReorderDrag?.fromIndex === index ? 'true' : undefined
                    }
                    disabled={isRenamingTradeInFolder}
                    onKeyDown={(event) =>
                      handleFolderReorderKeyDown(event, index)
                    }
                    onLostPointerCapture={(event) =>
                      handleFolderPointerEnd(event, false)
                    }
                    onPointerCancel={(event) =>
                      handleFolderPointerEnd(event, false)
                    }
                    onPointerDown={(event) =>
                      handleFolderPointerDown(event, index)
                    }
                    onPointerMove={handleFolderPointerMove}
                    onPointerUp={(event) =>
                      handleFolderPointerEnd(event, true)
                    }
                    title="Drag to reorder"
                    type="button">
                    <span
                      aria-hidden="true"
                      className="btff-panel__record-reorder-grip"
                    />
                  </button>
                </div>

                {isExpanded ? (
                  trades.length > 0 ? (
                    <ul className="btff-panel__trade-list">
                      {trades.map((trade) => {
                        const league = resolveBookmarkTradeLeague(
                          trade,
                          currentTradeLocation,
                          historyEntries,
                          lastSeenLeagues,
                        );

                        return (
                          <TradeRow
                            currentTradeLocation={currentTradeLocation}
                            editingTrade={editingTrade}
                            folderId={folder.id}
                            league={league}
                            onRenameTrade={handleRenameTrade}
                            onSetEditingTrade={setEditingTrade}
                            onToggleTradeCompletion={onToggleTradeCompletion}
                            onUpdateTradeLocation={onUpdateTradeLocation}
                            trade={trade}
                          />
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="btff-panel__inline-empty">
                      This folder does not have any saved searches yet.
                    </p>
                  )
                ) : null}
              </article>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}

function resolveFolderReorderTarget(
  bounds: FolderReorderBounds[],
  pointerY: number,
  fromIndex: number,
): Pick<FolderReorderDragState, 'edge' | 'overIndex' | 'toIndex'> | null {
  if (bounds.length === 0) return null;

  let overIndex = bounds.length - 1;
  let edge: FolderReorderEdge = 'after';

  for (const [index, recordBounds] of bounds.entries()) {
    if (pointerY >= recordBounds.bottom) continue;

    overIndex = index;
    edge =
      pointerY < recordBounds.top + recordBounds.height / 2
        ? 'before'
        : 'after';
    break;
  }

  const insertionIndex = overIndex + (edge === 'after' ? 1 : 0);
  const toIndex = insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex;

  return { edge, overIndex, toIndex };
}

function resolveReorderViewportBounds(drag: FolderReorderDragState) {
  return drag.bounds.map((bounds) => ({
    ...bounds,
    bottom: bounds.bottom - drag.scrollOffset,
    top: bounds.top - drag.scrollOffset,
  }));
}

function resolveScrolledReorderDrag(
  drag: FolderReorderDragState,
  scrollTop: number,
): FolderReorderDragState {
  const scrollOffset = scrollTop - drag.startScrollTop;
  const nextDrag = { ...drag, scrollOffset };
  const nextTarget = resolveFolderReorderTarget(
    resolveReorderViewportBounds(nextDrag),
    drag.currentY,
    drag.fromIndex,
  );

  return nextTarget ? { ...nextDrag, ...nextTarget } : nextDrag;
}

function resolveFolderShiftDistance(
  bounds: FolderReorderBounds[],
  fromIndex: number,
) {
  const sourceBounds = bounds[fromIndex];
  if (!sourceBounds) return 0;

  const followingBounds = bounds[fromIndex + 1];
  const precedingBounds = bounds[fromIndex - 1];
  const gap = followingBounds
    ? followingBounds.top - sourceBounds.bottom
    : precedingBounds
      ? sourceBounds.top - precedingBounds.bottom
      : 0;

  return sourceBounds.height + Math.max(0, gap);
}

function resolveFolderReorderShift(
  index: number,
  drag: FolderReorderDragState | null,
): { direction?: 'down' | 'up'; style?: FolderReorderStyle } {
  if (!drag) return {};

  if (index === drag.fromIndex) {
    return {
      style: {
        '--btff-folder-drag-y': `${
          drag.currentY - drag.startY + drag.scrollOffset
        }px`,
      },
    };
  }

  if (drag.toIndex > drag.fromIndex && index > drag.fromIndex && index <= drag.toIndex) {
    return {
      direction: 'up',
      style: { '--btff-folder-shift-y': `${-drag.shiftDistance}px` },
    };
  }

  if (drag.toIndex < drag.fromIndex && index >= drag.toIndex && index < drag.fromIndex) {
    return {
      direction: 'down',
      style: { '--btff-folder-shift-y': `${drag.shiftDistance}px` },
    };
  }

  return {};
}

function resolveFolderSlotStyle(drag: FolderReorderDragState): FolderReorderStyle {
  const firstBounds = drag.bounds[0];
  const destinationBounds = drag.bounds[drag.toIndex];
  const sourceBounds = drag.bounds[drag.fromIndex];
  if (!firstBounds || !destinationBounds || !sourceBounds) return {};

  const slotTop =
    drag.toIndex < drag.fromIndex
      ? destinationBounds.top
      : drag.toIndex > drag.fromIndex
        ? destinationBounds.bottom - drag.sourceHeight
        : sourceBounds.top;

  return {
    '--btff-folder-slot-height': `${drag.sourceHeight}px`,
    '--btff-folder-slot-y': `${slotTop - firstBounds.top}px`,
  };
}

interface QuickSavePanelProps {
  bookmarkColor: BookmarkColor | null;
  currentTradeLocation: ParsedTradeLocation | null;
  eligibleFolders: BookmarkFolder[];
  feedback: {
    kind: 'error' | 'success';
    message: string;
  } | null;
  isSaving: boolean;
  newFolderColor: BookmarkColor | null;
  newFolderIcon: string | null;
  newFolderTitle: string;
  onBookmarkColorChange: (value: BookmarkColor | null) => void;
  onNewFolderColorChange: (value: BookmarkColor | null) => void;
  onNewFolderIconChange: (value: string | null) => void;
  onNewFolderTitleChange: (value: string) => void;
  onSave: () => void;
  onSaveModeChange: (mode: 'existing' | 'new') => void;
  onSelectedFolderIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  saveMode: 'existing' | 'new';
  selectedFolderId: string;
  title: string;
}

function QuickSavePanel({
  bookmarkColor,
  currentTradeLocation,
  eligibleFolders,
  feedback,
  isSaving,
  newFolderColor,
  newFolderIcon,
  newFolderTitle,
  onBookmarkColorChange,
  onNewFolderColorChange,
  onNewFolderIconChange,
  onNewFolderTitleChange,
  onSave,
  onSaveModeChange,
  onSelectedFolderIdChange,
  onTitleChange,
  saveMode,
  selectedFolderId,
  title,
}: QuickSavePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canSaveCurrentTrade = currentTradeLocation !== null;
  const currentTradeLabel = currentTradeLocation
    ? `${currentTradeLocation.type} | ${formatTradeLeagueLabel(
        currentTradeLocation.league,
      )} | ${shortenSlug(currentTradeLocation.slug)}`
    : 'Open a Path of Exile trade search to save it as a bookmark.';

  return (
    <section className="btff-panel__composer">
      <button
        className="btff-panel__composer-toggle"
        onClick={() => setIsOpen((v) => !v)}
        type="button">
        <span className="btff-panel__composer-label">Quick Save</span>
        <span className="btff-panel__composer-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {!isOpen ? null : (
        <div className="btff-panel__composer-body">
          <p className="btff-panel__composer-copy">{currentTradeLabel}</p>

          <div className="btff-panel__inline-actions">
            <button
              aria-pressed={saveMode === 'existing'}
              className="btff-panel__mini-button btff-panel__mini-button--choice"
              disabled={eligibleFolders.length === 0}
              onClick={() => onSaveModeChange('existing')}
              type="button">
              Existing folder
            </button>
            <button
              aria-pressed={saveMode === 'new'}
              className="btff-panel__mini-button btff-panel__mini-button--choice"
              onClick={() => onSaveModeChange('new')}
              type="button">
              New folder
            </button>
          </div>

          {saveMode === 'existing' ? (
            <label className="btff-panel__field">
              <span>Folder</span>
              <select
                disabled={eligibleFolders.length === 0}
                onChange={(event) => onSelectedFolderIdChange(event.target.value)}
                value={selectedFolderId}>
                {eligibleFolders.length === 0 ? (
                  <option value="">
                    No matching folder for this trade version yet
                  </option>
                ) : null}
                {eligibleFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="btff-panel__field">
                <span>Folder name</span>
                <input
                  onChange={(event) => onNewFolderTitleChange(event.target.value)}
                  placeholder="e.g. Belt upgrades"
                  style={
                    newFolderColor
                      ? { color: getBookmarkColorHex(newFolderColor) }
                      : undefined
                  }
                  value={newFolderTitle}
                />
              </label>
              {newFolderTitle.trim().length > 0 ? (
                <>
                  <NameColorPicker
                    disabled={isSaving}
                    label="Folder name color"
                    onChange={onNewFolderColorChange}
                    value={newFolderColor}
                  />
                  <div className="btff-panel__field">
                    <span>Folder icon</span>
                    <FolderIconPicker
                      disabled={isSaving}
                      onChange={onNewFolderIconChange}
                      value={newFolderIcon}
                    />
                  </div>
                </>
              ) : null}
            </>
          )}

          <label className="btff-panel__field">
            <span>Bookmark name</span>
            <input
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="e.g. Headhunter under 20 Divine"
              style={
                bookmarkColor
                  ? { color: getBookmarkColorHex(bookmarkColor) }
                  : undefined
              }
              value={title}
            />
          </label>

          {title.trim().length > 0 ? (
            <NameColorPicker
              disabled={isSaving}
              label="Bookmark name color"
              onChange={onBookmarkColorChange}
              value={bookmarkColor}
            />
          ) : null}

          <div className="btff-panel__inline-actions">
            <button
              className="btff-panel__mini-button"
              disabled={!canSaveCurrentTrade || isSaving}
              onClick={onSave}
              type="button">
              {isSaving ? 'Saving...' : 'Save current search'}
            </button>
          </div>

          {feedback ? (
            <p
              className={`btff-panel__feedback${
                feedback.kind === 'error' ? ' btff-panel__feedback--error' : ''
              }`}>
              {feedback.message}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

interface TradeRowProps {
  currentTradeLocation: ParsedTradeLocation | null;
  editingTrade: {
    folderId: string;
    title: string;
    tradeId: string;
  } | null;
  folderId: string;
  league: string | null;
  onRenameTrade: () => void;
  onSetEditingTrade: (
    value:
      | {
          folderId: string;
          title: string;
          tradeId: string;
        }
      | null,
  ) => void;
  onToggleTradeCompletion: (
    folderId: string,
    tradeId: string,
  ) => Promise<void> | void;
  onUpdateTradeLocation: (
    folderId: string,
    tradeId: string,
  ) => Promise<void> | void;
  trade: BookmarkTrade;
}

function TradeRow({
  currentTradeLocation,
  editingTrade,
  folderId,
  league,
  onRenameTrade,
  onSetEditingTrade,
  onToggleTradeCompletion,
  onUpdateTradeLocation,
  trade,
}: TradeRowProps) {
  return (
    <li className="btff-panel__trade-row" data-completed={Boolean(trade.completedAt)}>
      {league ? (
        <a
          className="btff-panel__trade-link"
          href={getTradeUrl({
            ...trade.location,
            league,
          })}
          rel="noreferrer"
          target="_blank">
          <strong
            className="btff-panel__trade-title"
            data-name-color={trade.color ?? undefined}
            style={
              trade.color ? { color: getBookmarkColorHex(trade.color) } : undefined
            }>
            {trade.title}
          </strong>
          <span>
            {trade.location.type} | {formatTradeLeagueLabel(league)} |{' '}
            {shortenSlug(trade.location.slug)}
          </span>
        </a>
      ) : (
        <div className="btff-panel__trade-link btff-panel__trade-link--static">
          <strong
            className="btff-panel__trade-title"
            data-name-color={trade.color ?? undefined}
            style={
              trade.color ? { color: getBookmarkColorHex(trade.color) } : undefined
            }>
            {trade.title}
          </strong>
          <span>
            {trade.location.type} | need a recent PoE {trade.location.version} league
            before this bookmark can open directly
          </span>
        </div>
      )}

      <div className="btff-panel__trade-actions">
        <button
          className="btff-panel__mini-button btff-panel__mini-button--ghost"
          onClick={() => {
            void onToggleTradeCompletion(folderId, trade.id);
          }}
          type="button">
          {trade.completedAt ? 'Undo done' : 'Mark done'}
        </button>
        <button
          className="btff-panel__mini-button"
          disabled={currentTradeLocation?.version !== trade.location.version}
          onClick={() => {
            void onUpdateTradeLocation(folderId, trade.id);
          }}
          type="button">
          Use current search
        </button>
        <button
          className="btff-panel__mini-button btff-panel__mini-button--ghost"
          onClick={() =>
            onSetEditingTrade({
              folderId,
              title: trade.title,
              tradeId: trade.id,
            })
          }
          type="button">
          Rename
        </button>
      </div>

      {editingTrade?.folderId === folderId && editingTrade.tradeId === trade.id ? (
        <div className="btff-panel__inline-form btff-panel__inline-form--nested">
          <input
            className="btff-panel__input"
            onChange={(event) =>
              onSetEditingTrade({
                ...editingTrade,
                title: event.target.value,
              })
            }
            value={editingTrade.title}
          />
          <div className="btff-panel__inline-actions">
            <button
              className="btff-panel__mini-button"
              onClick={() => {
                void onRenameTrade();
              }}
              type="button">
              Save
            </button>
            <button
              className="btff-panel__mini-button btff-panel__mini-button--ghost"
              onClick={() => onSetEditingTrade(null)}
              type="button">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

interface HistoryViewProps {
  historyEntries: StorageSchemaV1['history']['entries'];
  isSchemaLoading: boolean;
}

function HistoryView({ historyEntries, isSchemaLoading }: HistoryViewProps) {
  const hasEntries = historyEntries.length > 0;
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!hasEntries) {
      return undefined;
    }

    setCurrentTime(Date.now());
    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(timerId);
  }, [hasEntries]);

  if (isSchemaLoading) {
    return <p className="btff-panel__empty">Loading saved history...</p>;
  }

  if (historyEntries.length === 0) {
    return (
      <p className="btff-panel__empty">
        Recent trade searches will appear here.
      </p>
    );
  }

  return (
    <>
      <ul className="btff-panel__history-list">
        {historyEntries.map((entry) => (
          <li key={entry.id} className="btff-panel__history-item">
            <a
              className="btff-panel__trade-link"
              href={getTradeUrl(entry, entry.isLive ? '/live' : '')}
              rel="noreferrer"
              target="_blank">
              <div className="btff-history-entry-header">
                <strong>{entry.title}</strong>
                <small className="btff-history-time">
                  {formatRelativeTimestamp(entry.createdAt, currentTime)}
                </small>
              </div>
              <div className="btff-history-pills">
                <span className="btff-history-pill" data-version={entry.version}>PoE {entry.version}</span>
                <span className="btff-history-pill">
                  {formatTradeLeagueLabel(entry.league)}
                </span>
                <span className="btff-history-pill">{entry.type}</span>
                {entry.isLive ? <span className="btff-history-pill btff-history-pill--live">live</span> : null}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

interface PinnedItemsViewProps {
  isPinnedItemOnCurrentPage: (itemId: string) => boolean;
  isSchemaLoading: boolean;
  items: PinnedItemRecord[];
  onActivateItem: (itemId: string) => void;
  onReorderItems: (fromIndex: number, toIndex: number) => void;
  onUnpinItem: (itemId: string) => void;
}

function PinnedItemsView({
  isPinnedItemOnCurrentPage,
  isSchemaLoading,
  items,
  onActivateItem,
  onReorderItems,
  onUnpinItem,
}: PinnedItemsViewProps) {
  const hasItems = items.length > 0;
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const pinnedItemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const pinnedListRef = useRef<HTMLUListElement | null>(null);
  const pinnedReorderDragRef = useRef<FolderReorderDragState | null>(null);
  const [pinnedReorderDrag, setPinnedReorderDrag] =
    useState<FolderReorderDragState | null>(null);
  const [pinnedReorderAnnouncement, setPinnedReorderAnnouncement] = useState('');

  useEffect(() => {
    if (!hasItems) {
      return undefined;
    }

    setCurrentTime(Date.now());
    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(timerId);
  }, [hasItems]);

  useLayoutEffect(() => {
    const scrollArea = pinnedListRef.current?.closest<HTMLElement>(
      '.btff-panel__scroll-area',
    );
    if (!scrollArea) return;

    const handleScroll = () => {
      const activeDrag = pinnedReorderDragRef.current;
      if (!activeDrag || activeDrag.isCommitting) return;

      updatePinnedReorderDrag(
        resolveScrolledReorderDrag(activeDrag, scrollArea.scrollTop),
      );
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [hasItems, isSchemaLoading]);

  function updatePinnedReorderDrag(nextState: FolderReorderDragState | null) {
    pinnedReorderDragRef.current = nextState;
    setPinnedReorderDrag(nextState);
  }

  function handlePinnedPointerDown(
    event: ReactPointerEvent<HTMLLIElement>,
    fromIndex: number,
  ) {
    if (event.button !== 0 || isPinnedReorderAction(event.target)) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const bounds = pinnedItemRefs.current
      .slice(0, items.length)
      .flatMap((item) => {
        if (!item) return [];
        const rect = item.getBoundingClientRect();
        return [{ bottom: rect.bottom, height: rect.height, top: rect.top }];
      });
    const sourceBounds = bounds[fromIndex];
    if (!sourceBounds || bounds.length !== items.length) return;

    const initialTarget = resolveFolderReorderTarget(
      bounds,
      event.clientY,
      fromIndex,
    ) ?? {
      edge: 'before' as const,
      overIndex: fromIndex,
      toIndex: fromIndex,
    };

    updatePinnedReorderDrag({
      ...initialTarget,
      bounds,
      currentY: event.clientY,
      fromIndex,
      isCommitting: false,
      pointerId: event.pointerId,
      scrollOffset: 0,
      shiftDistance: resolveFolderShiftDistance(bounds, fromIndex),
      sourceHeight: sourceBounds.height,
      startScrollTop:
        event.currentTarget.closest<HTMLElement>('.btff-panel__scroll-area')
          ?.scrollTop ?? 0,
      startY: event.clientY,
    });
  }

  function handlePinnedPointerMove(event: ReactPointerEvent<HTMLLIElement>) {
    const activeDrag = pinnedReorderDragRef.current;
    if (
      !activeDrag ||
      activeDrag.isCommitting ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    const nextTarget = resolveFolderReorderTarget(
      resolveReorderViewportBounds(activeDrag),
      event.clientY,
      activeDrag.fromIndex,
    );
    if (!nextTarget) return;

    updatePinnedReorderDrag({
      ...activeDrag,
      ...nextTarget,
      currentY: event.clientY,
    });
  }

  function handlePinnedPointerEnd(
    event: ReactPointerEvent<HTMLLIElement>,
    shouldCommit: boolean,
  ) {
    const activeDrag = pinnedReorderDragRef.current;
    if (
      !activeDrag ||
      activeDrag.isCommitting ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    const shouldMove =
      shouldCommit && activeDrag.toIndex !== activeDrag.fromIndex;
    if (!shouldMove) {
      updatePinnedReorderDrag(null);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    updatePinnedReorderDrag({ ...activeDrag, isCommitting: true });
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const itemTitle = getPinnedItemDisplayTitle(
      items[activeDrag.fromIndex]?.title ?? 'Pinned item',
    );
    onReorderItems(activeDrag.fromIndex, activeDrag.toIndex);
    updatePinnedReorderDrag(null);
    setPinnedReorderAnnouncement(
      `${itemTitle} moved to position ${activeDrag.toIndex + 1}.`,
    );
  }

  if (isSchemaLoading) {
    return <p className="btff-panel__empty">Loading the current panel state...</p>;
  }

  if (items.length === 0) {
    return (
      <p className="btff-panel__empty">
        Pin an item on the Trade page and it will appear here.
      </p>
    );
  }

  return (
    <ul className="btff-panel__pinned-list" ref={pinnedListRef}>
      <li aria-live="polite" className="btff-panel__visually-hidden">
        {pinnedReorderAnnouncement}
      </li>
      {pinnedReorderDrag &&
      pinnedReorderDrag.toIndex !== pinnedReorderDrag.fromIndex ? (
        <li
          aria-hidden="true"
          className="btff-panel__reorder-slot btff-panel__pinned-reorder-slot"
          data-slot-index={pinnedReorderDrag.toIndex}
          style={resolveFolderSlotStyle(pinnedReorderDrag)}
        />
      ) : null}
      {items.map((item, index) => {
        const { itemLevel, secondaryText } = splitPinnedSubtitle(item.subtitle);
        const displayTitle = getPinnedItemDisplayTitle(item.title);
        const isOnCurrentPage = isPinnedItemOnCurrentPage(item.id);
        const reorderShift = resolveFolderReorderShift(
          index,
          pinnedReorderDrag,
        );

        return (
          <li
            key={item.id}
            className="btff-panel__pinned-item"
            data-reorder-source={
              pinnedReorderDrag?.fromIndex === index ? 'true' : undefined
            }
            data-reorder-shift={reorderShift.direction}
            onLostPointerCapture={(event) =>
              handlePinnedPointerEnd(event, false)
            }
            onPointerCancel={(event) => handlePinnedPointerEnd(event, false)}
            onPointerDown={(event) => handlePinnedPointerDown(event, index)}
            onPointerMove={handlePinnedPointerMove}
            onPointerUp={(event) => handlePinnedPointerEnd(event, true)}
            ref={(element) => {
              pinnedItemRefs.current[index] = element;
            }}
            style={reorderShift.style}>
            <div className="btff-panel__pinned-header">
              {item.imageUrl ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="btff-panel__pinned-thumb"
                  draggable={false}
                  src={item.imageUrl}
                />
              ) : null}
              <div className="btff-panel__pinned-info">
                <strong title={displayTitle}>{displayTitle}</strong>
                {item.price || itemLevel ? (
                  <div className="btff-panel__pinned-meta">
                    {item.price ? (
                      <PinnedPrice
                        chaosEquivalent={item.chaosEquivalent}
                        currencyIconUrl={item.currencyIconUrl}
                        price={item.price}
                      />
                    ) : null}
                    {itemLevel ? (
                      <small className="btff-panel__pinned-item-level">
                        {itemLevel}
                      </small>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="btff-panel__pinned-footer">
              <div className="btff-panel__pinned-context">
                {secondaryText ? (
                  <small
                    className="btff-panel__pinned-subtitle"
                    title={secondaryText}>
                    {secondaryText}
                  </small>
                ) : null}
                <small className="btff-panel__pinned-time">
                  {formatRelativeTimestamp(item.pinnedAt, currentTime)}
                </small>
              </div>
              <div className="btff-panel__pinned-actions">
                <button
                  aria-label={
                    isOnCurrentPage
                      ? `Jump to ${displayTitle}`
                      : `Open saved search for ${displayTitle}`
                  }
                  className="btff-panel__mini-button"
                  onClick={() => onActivateItem(item.id)}
                  title={isOnCurrentPage ? 'Jump to item' : 'Open saved search'}
                  type="button">
                  {isOnCurrentPage ? 'Jump' : 'Open'}
                </button>
                <button
                  aria-label={`Unpin ${displayTitle}`}
                  className="btff-panel__mini-button btff-panel__mini-button--ghost"
                  onClick={() => onUnpinItem(item.id)}
                  type="button">
                  Unpin
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function isPinnedReorderAction(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('button, a, input, select, textarea'))
  );
}

const CURRENCY_ICONS: Record<string, string> = {
  'ancient orb': ancientOrbIconUrl,
  'orb of alchemy': alchemyIconUrl,
  'divine orb': divineIconUrl,
  'chaos orb': chaosIconUrl,
  'exalted orb': exaltedOrbIconUrl,
  "glassblower's bauble": glassblowersBaubleIconUrl,
  "jeweller's orb": jewellersOrbIconUrl,
  'mirror of kalandra': mirrorOfKalandraIconUrl,
  'orb of alteration': orbOfAlterationIconUrl,
  'orb of annulment': orbOfAnnulmentIconUrl,
  'orb of augmentation': orbOfAugmentationIconUrl,
  'orb of binding': orbOfBindingIconUrl,
  'orb of chance': orbOfChanceIconUrl,
  'orb of fusing': orbOfFusingIconUrl,
  'orb of scouring': orbOfScouringIconUrl,
  'orb of unmaking': orbOfUnmakingIconUrl,
  'regal orb': regalOrbIconUrl,
  'vaal orb': vaalOrbIconUrl,
};

function PinnedPrice({
  price,
  chaosEquivalent,
  className = 'btff-panel__pinned-price',
  currencyIconUrl,
}: {
  price: string;
  chaosEquivalent?: number | null;
  className?: string;
  currencyIconUrl?: string | null;
}) {
  // Parse the internal "NNN×Currency Name" form and omit its delimiter in the UI.
  const match = price.match(/^([\d.]+)×(.+)$/);
  const currencyLower = match?.[2].toLowerCase().trim() ?? '';
  const currencyIcon = currencyIconUrl ?? CURRENCY_ICONS[currencyLower] ?? null;

  return (
    <span className={className}>
      {match ? (
        <>
          {match[1]}{' '}
          {currencyIcon ? (
            <img alt={match[2]} className="btff-price-icon" src={currencyIcon} />
          ) : (
            match[2]
          )}
        </>
      ) : (
        price
      )}
      {chaosEquivalent ? (
        <span className="btff-panel__pinned-price-chaos">
          ≈{chaosEquivalent}
          <img alt="Chaos Orb" className="btff-price-icon" src={chaosIconUrl} />
        </span>
      ) : null}
    </span>
  );
}

function resolveDockLeagueSummary(
  tradeLocation: ParsedTradeLocation | null,
  pinnedItems: PinnedItemRecord[],
) {
  const leagueLabels = new Set<string>();

  if (tradeLocation?.league) {
    leagueLabels.add(formatTradeLeagueLabel(tradeLocation.league));
  }

  for (const item of pinnedItems) {
    try {
      const pathname = new URL(
        item.sourcePath,
        'https://www.pathofexile.com',
      ).pathname;
      const pinnedLocation = parseTradeLocationFromPathname(pathname);
      if (pinnedLocation?.league) {
        leagueLabels.add(formatTradeLeagueLabel(pinnedLocation.league));
      }
    } catch {
      // Ignore malformed legacy source paths; the current league can still render.
    }
  }

  return Array.from(leagueLabels).join(' & ');
}

function shortenSlug(slug: string, maxLength = 24) {
  return slug.length > maxLength ? `${slug.slice(0, maxLength)}...` : slug;
}

function splitPinnedSubtitle(subtitle: string) {
  if (subtitle.trim() === 'Pinned from the current trade results.') {
    return {
      itemLevel: null,
      secondaryText: null,
    };
  }

  const parts = subtitle
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      itemLevel: null,
      secondaryText: null,
    };
  }

  const itemLevelIndex = parts.findIndex((part) => /^Item Level:/i.test(part));
  const itemLevel = itemLevelIndex >= 0 ? parts[itemLevelIndex] : null;
  const secondaryParts = parts.filter((_, index) => index !== itemLevelIndex);
  const secondaryText =
    itemLevel && secondaryParts.length > 1
      ? secondaryParts.at(-1) ?? ''
      : secondaryParts.join(' | ');

  return {
    itemLevel,
    secondaryText: secondaryText || null,
  };
}

function resolveBookmarkTradeLeague(
  trade: BookmarkTrade,
  tradeLocation: ParsedTradeLocation | null,
  historyEntries: StorageSchemaV1['history']['entries'],
  lastSeenLeagues: StorageSchemaV1['preferences']['lastSeenLeagues'],
) {
  if (trade.location.league) {
    return trade.location.league;
  }

  if (
    tradeLocation?.version === trade.location.version &&
    tradeLocation.type === trade.location.type &&
    tradeLocation.slug === trade.location.slug
  ) {
    return tradeLocation.league;
  }

  const matchingHistory = historyEntries.find(
    (entry) =>
      entry.version === trade.location.version &&
      entry.type === trade.location.type &&
      entry.slug === trade.location.slug,
  );

  return matchingHistory?.league ?? lastSeenLeagues[trade.location.version];
}

function resolveBookmarkFolderLeagueSummary(
  trades: BookmarkTrade[],
  tradeLocation: ParsedTradeLocation | null,
  historyEntries: StorageSchemaV1['history']['entries'],
  lastSeenLeagues: StorageSchemaV1['preferences']['lastSeenLeagues'],
) {
  const leagueLabels = new Set<string>();

  for (const trade of trades) {
    const league = resolveBookmarkTradeLeague(
      trade,
      tradeLocation,
      historyEntries,
      lastSeenLeagues,
    );
    if (!league) continue;

    const label = formatTradeLeagueLabel(league);
    leagueLabels.add(
      trade.location.version === '2' && label.startsWith('PoE2 - ')
        ? label.slice('PoE2 - '.length)
        : label,
    );
  }

  return [...leagueLabels].join(' & ');
}
