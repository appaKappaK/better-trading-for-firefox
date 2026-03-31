import { useEffect, useMemo, useState } from 'react';
import betterTradingIcon from '/public/icon/better_tradingICO.png?url';

import type {
  BookmarkFolder,
  BookmarkTrade,
} from '@/src/features/bookmarks/types';
import {
  FOLDER_ICON_OPTIONS,
  getFolderIconImageUrl,
  getFolderIconLabel,
  getFolderIconSymbol,
} from '@/src/lib/bookmarks/folderIcons';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';
import {
  formatRelativeTimestamp,
  getTradeUrl,
  type ParsedTradeLocation,
} from '@/src/lib/trade/location';

import type { PinnedItemRecord } from './pinnedItems';
import type { TradePageSnapshot } from './tradePage';

type PanelPage = 'bookmarks' | 'history' | 'pinned';

interface SaveTradeDraft {
  folderId: string | null;
  folderTitle: string | null;
  folderIcon: string | null;
  title: string;
}

interface Props {
  currentPage: PanelPage;
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
  onScrollToPinnedItem: (itemId: string) => void;
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
  isCollapsed,
  isSchemaLoading,
  onClearHistory,
  onClearPinnedItems,
  onRenameTrade,
  onReorderFolders,
  onCopyFolderExport,
  onSaveTrade,
  onSelectPage,
  onSetCollapsed,
  onScrollToPinnedItem,
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
  const folders = schema?.bookmarks.folders ?? [];
  const historyEntries = schema?.history.entries ?? [];
  const bookmarkTradeCount = folders.reduce(
    (count, folder) =>
      count + (schema?.bookmarks.tradesByFolderId[folder.id]?.length ?? 0),
    0,
  );
  const needsOnboarding = !schema?.preferences.hasCompletedOnboarding;

  if (isCollapsed) {
    return (
      <section className="btff-panel-dock">
        <button
          aria-label="Expand Better Trading for Firefox"
          className="btff-panel-dock__button"
          onClick={() => onSetCollapsed(false)}
          type="button">
          <strong>Better Trading</strong>
          <span>
            {pinnedItems.length} pinned | {snapshot.resultsFound} results
          </span>
        </button>
        {pinnedItems.length > 0 ? (
          <ul className="btff-panel-dock__pinned-list">
            {pinnedItems.slice(0, 5).map((item) => (
              <li key={item.id} className="btff-panel-dock__pinned-item">
                <span className="btff-panel-dock__pinned-title">{item.title}</span>
                <button
                  className="btff-panel-dock__pinned-jump"
                  onClick={() => onScrollToPinnedItem(item.id)}
                  title={`Scroll to ${item.title}`}
                  type="button">
                  ↓
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <section className="btff-panel">
      <div className="btff-panel__header">
        <div className="btff-panel__header-copy">
          <p className="btff-panel__eyebrow">Better Trading for FF</p>
          <h1 className="btff-panel__title">Trade Panel</h1>
        </div>
        <img
          alt=""
          aria-hidden="true"
          className="btff-panel__logo-image"
          src={betterTradingIcon}
        />
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

      {needsOnboarding ? (
        <section className="btff-panel__callout">
          Use the popup to import a legacy backup or start fresh, then the saved
          folders and history will appear here automatically.
        </section>
      ) : null}

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
          onClearHistory={onClearHistory}
        />
      ) : null}

      {currentPage === 'pinned' ? (
        <PinnedItemsView
          isSchemaLoading={isSchemaLoading}
          items={pinnedItems}
          onClear={onClearPinnedItems}
          onScrollToItem={onScrollToPinnedItem}
          onUnpinItem={onUnpinItem}
        />
      ) : null}

      <section className="btff-panel__footer">
        <span>{bookmarkTradeCount} saved trades</span>
        {!schema?.preferences.sidePanelSidebar ? (
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
  const suggestedTradeTitle = useMemo(
    () => buildSuggestedTradeTitle(currentTradeLocation),
    [currentTradeLocation],
  );
  const [saveMode, setSaveMode] = useState<'existing' | 'new'>(
    eligibleFolders.length > 0 ? 'existing' : 'new',
  );
  const [selectedFolderId, setSelectedFolderId] = useState(
    eligibleFolders[0]?.id ?? '',
  );
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
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
      setNewFolderTitle('');
      setNewFolderIcon(null);
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
        newFolderIcon={newFolderIcon}
        newFolderTitle={newFolderTitle}
        onNewFolderIconChange={setNewFolderIcon}
        onNewFolderTitleChange={setNewFolderTitle}
        onSave={handleSaveTrade}
        onSaveModeChange={setSaveMode}
        onSelectedFolderIdChange={setSelectedFolderId}
        saveMode={saveMode}
        suggestedTitle={suggestedTradeTitle}
        selectedFolderId={selectedFolderId}
        title={draftTitle}
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
            const isExpanded =
              expandedFolderIds.includes(folder.id) ||
              (expandedFolderIds.length === 0 && index === 0);

            return (
              <article
                key={folder.id}
                className="btff-panel__record"
                data-drag-over={dragOverIndex === index}
                draggable
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
                  className="btff-panel__record-toggle"
                  onClick={() => onToggleFolder(folder.id)}
                  type="button">
                  {folder.icon ? (
                    <PanelFolderIcon
                      label={getFolderIconLabel(folder.icon) ?? folder.icon}
                      slug={folder.icon}
                    />
                  ) : null}
                  <div className="btff-panel__record-toggle-body">
                    <strong>{folder.title}</strong>
                    <small>PoE {folder.version}</small>
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
  currentTradeLocation: ParsedTradeLocation | null;
  eligibleFolders: BookmarkFolder[];
  feedback: {
    kind: 'error' | 'success';
    message: string;
  } | null;
  isSaving: boolean;
  newFolderIcon: string | null;
  newFolderTitle: string;
  onNewFolderIconChange: (value: string | null) => void;
  onNewFolderTitleChange: (value: string) => void;
  onSave: () => void;
  onSaveModeChange: (mode: 'existing' | 'new') => void;
  onSelectedFolderIdChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  saveMode: 'existing' | 'new';
  suggestedTitle: string;
  selectedFolderId: string;
  title: string;
}

function QuickSavePanel({
  currentTradeLocation,
  eligibleFolders,
  feedback,
  isSaving,
  newFolderIcon,
  newFolderTitle,
  onNewFolderIconChange,
  onNewFolderTitleChange,
  onSave,
  onSaveModeChange,
  onSelectedFolderIdChange,
  onTitleChange,
  saveMode,
  suggestedTitle,
  selectedFolderId,
  title,
}: QuickSavePanelProps) {
  const canSaveCurrentTrade = currentTradeLocation !== null;
  const currentTradeLabel = currentTradeLocation
    ? `${currentTradeLocation.type} | ${currentTradeLocation.league} | ${shortenSlug(
        currentTradeLocation.slug,
      )}`
    : 'Open a trade search to save the current page.';

  return (
    <section className="btff-panel__composer">
      <p className="btff-panel__composer-label">Quick Save</p>
      <p className="btff-panel__composer-copy">{currentTradeLabel}</p>

      <div className="btff-panel__inline-actions">
        <button
          className={`btff-panel__mini-button${
            saveMode === 'existing' ? '' : ' btff-panel__mini-button--ghost'
          }`}
          disabled={eligibleFolders.length === 0}
          onClick={() => onSaveModeChange('existing')}
          type="button">
          Existing folder
        </button>
        <button
          className={`btff-panel__mini-button${
            saveMode === 'new' ? '' : ' btff-panel__mini-button--ghost'
          }`}
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
            <span>New Folder</span>
            <input
              onChange={(event) => onNewFolderTitleChange(event.target.value)}
              placeholder="Starter Bow Searches"
              value={newFolderTitle}
            />
          </label>
          {newFolderTitle.trim().length > 0 ? (
            <label className="btff-panel__field">
              <span>Folder Icon</span>
              <select
                onChange={(event) =>
                  onNewFolderIconChange(event.target.value || null)
                }
                value={newFolderIcon ?? ''}>
                <option value="">None</option>
                {FOLDER_ICON_OPTIONS.map((opt) => (
                  <option key={opt.slug} value={opt.slug}>
                    {opt.group} — {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      )}

      <label className="btff-panel__field">
        <span>Trade Title</span>
        <input
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={suggestedTitle || 'Starter Bow Search'}
          value={title}
        />
      </label>

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
          <strong>{trade.title}</strong>
          <span>
            {trade.location.type} | {league} | {shortenSlug(trade.location.slug)}
          </span>
        </a>
      ) : (
        <div className="btff-panel__trade-link btff-panel__trade-link--static">
          <strong>{trade.title}</strong>
          <span>
            {trade.location.type} | need a recent PoE {trade.location.version} league
            before this bookmark can open directly
          </span>
        </div>
      )}

      <div className="btff-panel__trade-actions">
        <button
          className="btff-panel__mini-button"
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
  onClearHistory: () => Promise<void> | void;
}

function HistoryView({ historyEntries, isSchemaLoading, onClearHistory }: HistoryViewProps) {
  const [isClearing, setIsClearing] = useState(false);

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
      <div className="btff-panel__section-actions">
        <button
          className="btff-panel__mini-button btff-panel__mini-button--ghost"
          disabled={isClearing}
          onClick={() => {
            setIsClearing(true);
            void Promise.resolve(onClearHistory()).finally(() =>
              setIsClearing(false),
            );
          }}
          type="button">
          Clear all
        </button>
      </div>
      <ul className="btff-panel__history-list">
        {historyEntries.map((entry) => (
          <li key={entry.id} className="btff-panel__history-item">
            <a
              className="btff-panel__trade-link"
              href={getTradeUrl(entry, entry.isLive ? '/live' : '')}
              rel="noreferrer"
              target="_blank">
              <strong>{entry.title}</strong>
              <span>
                PoE {entry.version} | {entry.league} | {entry.type}
                {entry.isLive ? ' | live' : ''}
              </span>
              <small>{formatRelativeTimestamp(entry.createdAt)}</small>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

interface PinnedItemsViewProps {
  isSchemaLoading: boolean;
  items: PinnedItemRecord[];
  onClear: () => void;
  onScrollToItem: (itemId: string) => void;
  onUnpinItem: (itemId: string) => void;
}

function PinnedItemsView({
  isSchemaLoading,
  items,
  onClear,
  onScrollToItem,
  onUnpinItem,
}: PinnedItemsViewProps) {
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
    <>
      <div className="btff-panel__section-actions">
        <button
          className="btff-panel__mini-button btff-panel__mini-button--ghost"
          onClick={onClear}
          type="button">
          Clear all
        </button>
      </div>

      <ul className="btff-panel__history-list">
        {items.map((item) => (
          <li key={item.id} className="btff-panel__history-item">
            <div className="btff-panel__pinned-header">
              {item.imageUrl ? (
                <img alt="" className="btff-panel__pinned-thumb" src={item.imageUrl} />
              ) : null}
              <div className="btff-panel__pinned-info">
                <strong>{item.title}</strong>
                {item.price ? (
                  <span className="btff-panel__pinned-price">{item.price}</span>
                ) : null}
                <small>{item.subtitle}</small>
              </div>
            </div>
            <small className="btff-panel__pinned-time">
              {formatRelativeTimestamp(item.pinnedAt)}
            </small>
            <div className="btff-panel__trade-actions">
              <button
                className="btff-panel__mini-button"
                onClick={() => onScrollToItem(item.id)}
                type="button">
                Scroll to item
              </button>
              <button
                className="btff-panel__mini-button btff-panel__mini-button--ghost"
                onClick={() => onUnpinItem(item.id)}
                type="button">
                Unpin
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function PanelFolderIcon({ slug, label }: { slug: string; label: string }) {
  const imageUrl = getFolderIconImageUrl(slug);
  if (imageUrl) {
    return <img alt={label} className="btff-panel__folder-icon" src={imageUrl} />;
  }
  return (
    <span aria-label={label} className="btff-panel__folder-icon-fallback" title={label}>
      {getFolderIconSymbol(slug) ?? '📁'}
    </span>
  );
}

function buildSuggestedTradeTitle(tradeLocation: ParsedTradeLocation | null) {
  if (!tradeLocation) {
    return '';
  }

  const typeLabel = tradeLocation.type.replaceAll('-', ' ');
  return `${capitalize(typeLabel)} ${shortenSlug(tradeLocation.slug, 20)}`.trim();
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function shortenSlug(slug: string, maxLength = 24) {
  return slug.length > maxLength ? `${slug.slice(0, maxLength)}...` : slug;
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
