import { useEffect, useMemo, useState } from 'react';
import betterTradingIcon from '/public/icon/better_tradingICO.png?url';
import alchemyIconUrl from '/public/assets/images/bookmark-folder/alchemy.png?url';
import chaosIconUrl from '/public/assets/images/bookmark-folder/chaos.png?url';
import divineIconUrl from '/public/assets/images/bookmark-folder/divine.png?url';

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
  type ParsedTradeLocation,
} from '@/src/lib/trade/location';

import {
  getPinnedItemDisplayTitle,
  type PinnedItemRecord,
} from './pinnedItems';
import type { TradePageSnapshot } from './tradePage';

type PanelPage = 'bookmarks' | 'history' | 'pinned';

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
  onRenameTrade: (
    folderId: string,
    tradeId: string,
    title: string,
  ) => Promise<void> | void;
  onCopyFolderExport: (folderId: string) => Promise<void> | void;
  onSaveTrade: (draft: SaveTradeDraft) => Promise<void> | void;
  onSelectPage: (page: PanelPage) => void;
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
  onCopyFolderExport,
  onSaveTrade,
  onSelectPage,
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
          <span>
            {pinnedItems.length} pinned | {snapshot.resultsFound} results
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
                    <span
                      className="btff-panel-dock__pinned-title"
                      title={displayTitle}>
                      {displayTitle}
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
    <section className="btff-panel">
      <div className="btff-panel__header">
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

      <nav className="btff-panel__tabs" aria-label="Saved data views">
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

      <div className="btff-panel__scroll-area">
        {currentPage === 'bookmarks' ? (
          <BookmarksView
            expandedFolderIds={schema?.preferences.expandedFolderIds ?? []}
            folders={folders}
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
            onUnpinItem={onUnpinItem}
          />
        ) : null}
      </div>

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
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  return (
    <>
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

      {folders.length === 0 ? (
        <p className="btff-panel__empty">
          No bookmark folders yet. 
        </p>
      ) : (
        <div className="btff-panel__records">
          {folders.map((folder, index) => {
            const trades = tradesByFolderId[folder.id] ?? [];
            const isExpanded = expandedFolderIds.includes(folder.id);
            const isRenamingTradeInFolder = editingTrade?.folderId === folder.id;

            return (
              <article
                key={folder.id}
                className="btff-panel__record"
                data-drag-over={dragOverIndex === index}
                draggable={!isRenamingTradeInFolder}
                onDragEnd={() => {
                  setDragFromIndex(null);
                  setDragOverIndex(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDragStart={() => setDragFromIndex(index)}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragFromIndex !== null && dragFromIndex !== index) {
                    void onReorderFolders(dragFromIndex, index);
                  }
                  setDragFromIndex(null);
                  setDragOverIndex(null);
                }}>
                <button
                  aria-expanded={isExpanded}
                  className="btff-panel__record-toggle"
                  onClick={() => onToggleFolder(folder.id)}
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
                    <strong
                      data-name-color={folder.color ?? undefined}
                      style={
                        folder.color
                          ? { color: getBookmarkColorHex(folder.color) }
                          : undefined
                      }>
                      {folder.title}
                    </strong>
                    <small>
                      PoE {folder.version}
                      {folder.icon ? ` · ${getFolderIconLabel(folder.icon)}` : ''}
                    </small>
                  </div>
                  <span>
                    {trades.length} trade{trades.length === 1 ? '' : 's'}
                  </span>
                </button>

                {isExpanded ? (
                  trades.length > 0 ? (
                    <ul className="btff-panel__trade-list">
                      {trades.map((trade) => {
                        const league = resolveBookmarkTradeLeague(
                          trade.location.version,
                          currentTradeLocation,
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
                      This folder does not have any saved trades yet.
                    </p>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
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
        <>
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
              <option value="">No matching folder for this trade version yet</option>
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
        </>
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
  onUnpinItem: (itemId: string) => void;
}

function PinnedItemsView({
  isPinnedItemOnCurrentPage,
  isSchemaLoading,
  items,
  onActivateItem,
  onUnpinItem,
}: PinnedItemsViewProps) {
  const hasItems = items.length > 0;
  const [currentTime, setCurrentTime] = useState(() => Date.now());

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
    <ul className="btff-panel__pinned-list">
      {items.map((item) => {
        const { itemLevel, secondaryText } = splitPinnedSubtitle(item.subtitle);
        const displayTitle = getPinnedItemDisplayTitle(item.title);
        const isOnCurrentPage = isPinnedItemOnCurrentPage(item.id);

        return (
          <li key={item.id} className="btff-panel__pinned-item">
            <div className="btff-panel__pinned-header">
              {item.imageUrl ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="btff-panel__pinned-thumb"
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

const CURRENCY_ICONS: Record<string, string> = {
  'orb of alchemy': alchemyIconUrl,
  'divine orb': divineIconUrl,
  'chaos orb': chaosIconUrl,
};

function PinnedPrice({
  price,
  chaosEquivalent,
}: {
  price: string;
  chaosEquivalent?: number | null;
}) {
  const className = 'btff-panel__pinned-price';

  // Parse the internal "NNN×Currency Name" form and omit its delimiter in the UI.
  const match = price.match(/^([\d.]+)×(.+)$/);
  const currencyLower = match?.[2].toLowerCase().trim() ?? '';
  const currencyIcon = CURRENCY_ICONS[currencyLower] ?? null;

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
  version: BookmarkTrade['location']['version'],
  tradeLocation: ParsedTradeLocation | null,
  lastSeenLeagues: StorageSchemaV1['preferences']['lastSeenLeagues'],
) {
  if (tradeLocation?.version === version) {
    return tradeLocation.league;
  }

  return lastSeenLeagues[version];
}
