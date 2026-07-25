import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { BookmarkFolder, BookmarkTrade } from '@/src/features/bookmarks/types';
import { FolderIcon, FolderIconPicker } from '@/src/components/FolderIcon';
import { previewLegacyImport } from '@/src/lib/legacy/importPreview';
import type { HistoryEntry, StorageSchemaV1 } from '@/src/lib/storage/schema';
import {
  clearStoredHistory,
  completeStoredOnboarding,
  deleteStoredBookmarkFolder,
  deleteStoredBookmarkTrade,
  exportStoredBookmarkFolder,
  generateStoredBookmarksBackup,
  importLegacyBookmarksInput,
  loadStoredSchema,
  startFreshSchema,
  STORAGE_SCHEMA_KEY,
  toggleStoredBookmarkFolderArchive,
  updateStoredBookmarkFolderIcon,
  updateStoredPreferences,
} from '@/src/lib/storage/runtime';
import { getFolderIconLabel } from '@/src/lib/bookmarks/folderIcons';
import { getBookmarkColorHex } from '@/src/lib/bookmarks/nameColors';
import { formatTradeLeagueLabel } from '@/src/lib/trade/location';
import { readImportFile } from '@/src/popup/importFiles';
import { ConfirmationDialog } from '@/src/popup/ConfirmationDialog';
import { SettingsView } from '@/src/popup/SettingsView';
import { buildTradeUrl } from '@/src/popup/tradeUrls';

import './App.css';

type PopupPage = 'bookmarks' | 'history' | 'import' | 'settings';
type FeedbackTone = 'neutral' | 'success' | 'error';


interface FeedbackState {
  tone: FeedbackTone;
  title: string;
  message: string;
}

const PAGE_LABELS: Record<PopupPage, string> = {
  bookmarks: 'Bookmarks',
  history: 'History',
  import: 'Import',
  settings: 'Settings',
};

function App() {
  const popupShellRef = useRef<HTMLElement | null>(null);
  const hasLoadedInitialSchemaRef = useRef(false);
  const [schema, setSchema] = useState<StorageSchemaV1 | null>(null);
  const [activePage, setActivePage] = useState<PopupPage>('import');
  const [isSchemaLoading, setIsSchemaLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingImportFile, setIsReadingImportFile] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const deferredImportInput = useDeferredValue(importInput);
  const importPreview = useMemo(
    () => previewLegacyImport(deferredImportInput),
    [deferredImportInput],
  );

  const folders = schema?.bookmarks.folders ?? [];
  const historyEntries = schema?.history.entries ?? [];

  useEffect(() => {
    let isActive = true;

    const syncSchema = async () => {
      try {
        const nextSchema = await loadStoredSchema();

        if (!isActive) return;

        const isInitialSchemaLoad = !hasLoadedInitialSchemaRef.current;
        applyLoadedSchema(nextSchema);
        setFeedback(null);

        if (
          isInitialSchemaLoad &&
          !nextSchema.preferences.hasCompletedOnboarding
        ) {
          void completeStoredOnboarding()
            .then((completedSchema) => {
              if (isActive) applyLoadedSchema(completedSchema);
            })
            .catch((error) => {
              console.error('Failed to record the first popup open.', error);
            });
        }
      } catch (error) {
        if (!isActive) return;

        setFeedback({
          tone: 'error',
          title: 'Unable to load saved schema',
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (isActive) setIsSchemaLoading(false);
      }
    };

    void syncSchema();

    const handleStorageChange = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[STORAGE_SCHEMA_KEY]) return;
      void syncSchema();
    };

    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      isActive = false;
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const popupShell = popupShellRef.current;
    if (!popupShell) return;

    return attachTransientScrollbar(popupShell);
  }, []);

  function applyLoadedSchema(nextSchema: StorageSchemaV1) {
    const isInitialSchemaLoad = !hasLoadedInitialSchemaRef.current;
    hasLoadedInitialSchemaRef.current = true;

    startTransition(() => {
      setSchema(nextSchema);
      if (isInitialSchemaLoad) {
        setActivePage(
          nextSchema.preferences.hasCompletedOnboarding
            ? 'bookmarks'
            : 'import',
        );
      }
    });
  }

  async function handleClearHistory() {
    try {
      const nextSchema = await clearStoredHistory();
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'History cleared',
        message: 'All search history entries have been removed.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not clear history',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleSelectPage(nextPage: PopupPage) {
    setActivePage(nextPage);
  }

  async function handleImportSubmit() {
    setIsSubmitting(true);

    try {
      const { preview, schema: nextSchema } =
        await importLegacyBookmarksInput(importInput);

      if (preview.state !== 'ready' || !nextSchema) {
        setFeedback({
          tone: 'error',
          title: 'Import could not start',
          message:
            preview.state === 'empty'
              ? 'Paste a legacy folder export or backup text first.'
              : 'That text did not match a supported Better Trading export or backup format.',
        });
        return;
      }

      startTransition(() => {
        setSchema(nextSchema);
        setImportInput('');
        setActivePage('bookmarks');
      });

      setFeedback({
        tone: 'success',
        title: 'Import complete',
        message: `Added ${preview.folderCount} folder${preview.folderCount === 1 ? '' : 's'} and ${preview.tradeCount} trade${preview.tradeCount === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Import failed',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleImportFileChange(file: File | null) {
    if (!file) return;

    setIsReadingImportFile(true);

    try {
      const nextImportInput = await readImportFile(file);
      setImportInput(nextImportInput);
      setFeedback({
        tone: 'success',
        title: 'Backup file loaded',
        message:
          'The file contents are now in the import box and ready for preview or restore.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not load backup file',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsReadingImportFile(false);
    }
  }

  async function handleClearSavedData() {
    setIsSubmitting(true);

    try {
      const nextSchema = await startFreshSchema();

      startTransition(() => {
        setSchema(nextSchema);
        setImportInput('');
        setActivePage('bookmarks');
      });

      setFeedback({
        tone: 'success',
        title: 'Saved data cleared',
        message:
          'Bookmarks, history, and cached pricing data were cleared. Your settings were kept.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not clear saved data',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleFolderArchive(folder: BookmarkFolder) {
    try {
      const nextSchema = await toggleStoredBookmarkFolderArchive({
        folderId: folder.id,
      });
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: folder.archivedAt ? 'Folder restored' : 'Folder archived',
        message: folder.archivedAt
          ? `"${folder.title}" is active again.`
          : `"${folder.title}" moved into the archived set.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not update folder state',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDeleteFolder(folder: BookmarkFolder) {
    try {
      const nextSchema = await deleteStoredBookmarkFolder(folder.id);
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Folder deleted',
        message: `"${folder.title}" and its saved trades were removed from the new schema.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not delete folder',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDeleteTrade(folder: BookmarkFolder, trade: BookmarkTrade) {
    try {
      const nextSchema = await deleteStoredBookmarkTrade({
        folderId: folder.id,
        tradeId: trade.id,
      });
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Trade deleted',
        message: `"${trade.title}" was removed from "${folder.title}".`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not delete trade',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleChangeFolderIcon(folder: BookmarkFolder, icon: string | null) {
    try {
      const nextSchema = await updateStoredBookmarkFolderIcon(folder.id, icon);
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Icon updated',
        message: icon
          ? `"${folder.title}" is now using the ${getFolderIconLabel(icon)} icon.`
          : `Removed the icon from "${folder.title}".`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not update icon',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleCopyFolderExport(folder: BookmarkFolder) {
    try {
      const exportText = await exportStoredBookmarkFolder(folder.id);
      await copyTextToClipboard(exportText);
      setFeedback({
        tone: 'success',
        title: 'Folder export copied',
        message: `"${folder.title}" is now on your clipboard as a legacy-compatible export string.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not copy folder export',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleCopyBackup() {
    try {
      const backupText = await generateStoredBookmarksBackup();
      await copyTextToClipboard(backupText);
      setFeedback({
        tone: 'success',
        title: 'Backup copied',
        message: 'The full bookmark backup is now on your clipboard.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not copy backup',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDownloadBackup() {
    try {
      const backupText = await generateStoredBookmarksBackup();
      downloadTextFile('poe-better-trading-backup.txt', backupText);
      setFeedback({
        tone: 'success',
        title: 'Backup downloaded',
        message: 'Saved the current bookmark schema as a legacy-compatible backup text file.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not download backup',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSetSidePanelCollapsed(collapsed: boolean) {
    try {
      const nextSchema = await updateStoredPreferences({
        sidePanelCollapsed: collapsed,
      });
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Panel preference saved',
        message: collapsed
          ? 'The in-page panel will open docked by default.'
          : 'The in-page panel will open expanded by default.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not save panel preference',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSetSidePanelDraggable(draggable: boolean) {
    try {
      const nextSchema = await updateStoredPreferences({
        sidePanelDraggable: draggable,
      });
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Panel preference saved',
        message: draggable
          ? 'The overlay panel can now be dragged by its header.'
          : 'The overlay panel is fixed in place.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not save panel preference',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSetSidePanelSidebar(sidebar: boolean) {
    try {
      const nextSchema = await updateStoredPreferences({
        sidePanelSidebar: sidebar,
      });
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Panel preference saved',
        message: sidebar
          ? 'The in-page panel will push page content over.'
          : 'The in-page panel will overlay the page.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not save panel preference',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleSetPinnedItemsSessionPersistence(enabled: boolean) {
    try {
      const nextSchema = await updateStoredPreferences({
        persistPinnedItemsInSession: enabled,
      });
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Pinned-items preference saved',
        message: enabled
          ? 'Open trade tabs can now keep pinned items across multiple searches and filter changes for this Firefox session.'
          : 'New trade tabs will go back to clearing pins when searches change. Tabs already using session pins keep their current pins until they close or Firefox quits.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not save pinned-items preference',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDismissUpdateNotice() {
    try {
      const nextSchema = await updateStoredPreferences({ pendingUpdateNotice: null });
      applyLoadedSchema(nextSchema);
    } catch {
      // Non-critical — ignore
    }
  }

  async function handleToggleEnhancer(slug: string, nextEnabled: boolean) {
    if (!schema) return;

    const nextDisabledEnhancers = nextEnabled
      ? schema.preferences.disabledEnhancers.filter(
          (disabledSlug) => disabledSlug !== slug,
        )
      : [...schema.preferences.disabledEnhancers, slug];

    try {
      const nextSchema = await updateStoredPreferences({
        disabledEnhancers: nextDisabledEnhancers,
      });
      applyLoadedSchema(nextSchema);
      setFeedback({
        tone: 'success',
        title: 'Enhancer preference saved',
        message: nextEnabled
          ? `${slug} is enabled again.`
          : `${slug} is now disabled.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not save enhancer preference',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <main className="popup-shell" ref={popupShellRef}>
      <section className="popup-hero">
        <h2 className="popup-eyebrow">Better Trading for Firefox</h2>
        <p className="popup-copy">
          Use the in-page panel on the trade page for pinning searches, browsing history, and managing bookmarks.
        </p>
      </section>

      {schema?.preferences.pendingUpdateNotice ? (
        <section className="popup-update-notice">
          <div>
            <strong>Updated to v{schema.preferences.pendingUpdateNotice}</strong>
            <p>Better Trading for Firefox was just updated. Check the changelog for what's new.</p>
          </div>
          <button
            className="popup-button popup-button--secondary popup-button--small"
            onClick={() => void handleDismissUpdateNotice()}
            type="button">
            Dismiss
          </button>
        </section>
      ) : null}

      {isSchemaLoading ? (
        <section className="popup-status" data-tone="neutral">
          <p className="popup-status-title">Loading</p>
          <p className="popup-status-message">Reading your saved Better Trading data…</p>
        </section>
      ) : feedback ? (
        <section className="popup-status" data-tone={feedback.tone}>
          <div>
            <p className="popup-status-title">{feedback.title}</p>
            <p className="popup-status-message">{feedback.message}</p>
          </div>
        </section>
      ) : null}

      <nav className="popup-tabs" aria-label="Popup sections">
        {(Object.keys(PAGE_LABELS) as PopupPage[]).map((page) => (
          <button
            key={page}
            className="popup-tab"
            data-active={activePage === page}
            onClick={() => {
              void handleSelectPage(page);
            }}
            type="button">
            {PAGE_LABELS[page]}
          </button>
        ))}
      </nav>

      <section className="popup-panel">
        {activePage !== 'history' ? (
          <div className="popup-panel-header">
            <div>
              <p className="popup-panel-eyebrow">
                {activePage === 'import'
                  ? 'Migration'
                  : activePage === 'bookmarks'
                    ? 'Manage'
                    : 'Configure'}
              </p>
              <h2>{PAGE_LABELS[activePage]}</h2>
            </div>
          </div>
        ) : null}

        {activePage === 'import' ? (
          <MigrationPanel
            importInput={importInput}
            importPreview={importPreview}
            isReadingImportFile={isReadingImportFile}
            isSchemaLoading={isSchemaLoading}
            isSubmitting={isSubmitting}
            onImportFileChange={handleImportFileChange}
            onImportInputChange={setImportInput}
            onImportSubmit={handleImportSubmit}
            onClearSavedData={handleClearSavedData}
          />
        ) : null}

        {activePage === 'bookmarks' ? (
          <BookmarksPanel
            folders={folders}
            isSchemaLoading={isSchemaLoading}
            onChangeFolderIcon={handleChangeFolderIcon}
            onCopyBackup={handleCopyBackup}
            onCopyFolderExport={handleCopyFolderExport}
            onDeleteFolder={handleDeleteFolder}
            onDeleteTrade={handleDeleteTrade}
            onDownloadBackup={handleDownloadBackup}
            onToggleFolderArchive={handleToggleFolderArchive}
            tradesByFolderId={schema?.bookmarks.tradesByFolderId ?? {}}
          />
        ) : null}

        {activePage === 'history' ? (
          <HistoryPanel
            historyEntries={historyEntries}
            isSchemaLoading={isSchemaLoading}
            onClearHistory={handleClearHistory}
          />
        ) : null}

        {activePage === 'settings' ? (
          <SettingsView
            isSchemaLoading={isSchemaLoading}
            onSetPinnedItemsSessionPersistence={handleSetPinnedItemsSessionPersistence}
            onSetSidePanelCollapsed={handleSetSidePanelCollapsed}
            onSetSidePanelDraggable={handleSetSidePanelDraggable}
            onSetSidePanelSidebar={handleSetSidePanelSidebar}
            onToggleEnhancer={handleToggleEnhancer}
            schema={schema}
          />
        ) : null}
      </section>

    </main>
  );
}

interface MigrationPanelProps {
  importInput: string;
  importPreview: ReturnType<typeof previewLegacyImport>;
  isReadingImportFile: boolean;
  isSchemaLoading: boolean;
  isSubmitting: boolean;
  onClearSavedData: () => void;
  onImportFileChange: (file: File | null) => void | Promise<void>;
  onImportInputChange: (value: string) => void;
  onImportSubmit: () => void;
}

export function MigrationPanel({
  importInput,
  importPreview,
  isReadingImportFile,
  isSchemaLoading,
  isSubmitting,
  onClearSavedData,
  onImportFileChange,
  onImportInputChange,
  onImportSubmit,
}: MigrationPanelProps) {
  const [dragCounter, setDragCounter] = useState(0);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const isDragOver = dragCounter > 0;
  const isDisabled = isReadingImportFile || isSubmitting;

  return (
    <>
      <p className="popup-copy popup-copy--panel">
        Paste one folder export string or the full backup text from the old
        Better Trading add-on, or load a backup text file directly. This
        supports v1, v2, and v3 bookmark formats.
      </p>

      <div className="popup-file-picker">
        <label
          className="popup-file-picker__zone"
          data-disabled={String(isDisabled)}
          data-drag-over={String(isDragOver)}
          onDragEnter={(e) => { e.preventDefault(); setDragCounter((c) => c + 1); }}
          onDragLeave={() => setDragCounter((c) => c - 1)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragCounter(0);
            const file = e.dataTransfer.files[0] ?? null;
            if (file && !isDisabled) void onImportFileChange(file);
          }}>
          <input
            accept=".txt,text/plain"
            className="popup-file-picker__input"
            disabled={isDisabled}
            onChange={(event) => {
              void onImportFileChange(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
            type="file"
          />
          <span className="popup-file-picker__cta">
            {isReadingImportFile ? 'Reading file...' : 'Click or drag a backup file here'}
          </span>
          <small className="popup-file-picker__hint">
            Loads the file into the import box below for preview and restore.
          </small>
        </label>
      </div>

      <label className="popup-field" htmlFor="legacy-import-input">
        <textarea
          id="legacy-import-input"
          onChange={(event) => onImportInputChange(event.target.value)}
          placeholder="3:eyJpY24iOiJhc2NlbmRhbnQiLCJ0aXQiOiJ..."
          rows={8}
          value={importInput}
        />
      </label>

      <section className="popup-preview" data-state={importPreview.state}>
        <p className="popup-preview-label">Preview</p>
        {importPreview.state === 'empty' ? (
          <p>Paste data to see folder and trade counts before import.</p>
        ) : null}
        {importPreview.state === 'invalid' ? (
          <p>This does not match the old bookmark export or backup format yet.</p>
        ) : null}
        {importPreview.state === 'ready' ? (
          <>
            <p>
              {importPreview.source === 'backup'
                ? 'Detected a backup payload.'
                : 'Detected a single-folder export.'}
            </p>
            <div className="popup-preview-metrics">
              <span>{importPreview.folderCount} folders</span>
              <span>{importPreview.tradeCount} trades</span>
              <span>{importPreview.archivedFolderCount} archived</span>
            </div>
            <ul className="popup-folder-list">
              {importPreview.folders.slice(0, 3).map((folder) => (
                <li key={`${folder.title}-${folder.archivedAt ?? 'live'}`}>
                  <strong>{folder.title}</strong>
                  <span>
                    {folder.trades.length} trade
                    {folder.trades.length === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
            {importPreview.folders.length > 3 ? (
              <p className="popup-preview-footnote">
                Plus {importPreview.folders.length - 3} more imported folders
                in this payload.
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <div className="popup-actions">
        <button
          className="popup-button"
          disabled={isSubmitting || isReadingImportFile || importPreview.state !== 'ready'}
          onClick={onImportSubmit}
          type="button">
          {isSubmitting ? 'Working...' : 'Import legacy data'}
        </button>
        <button
          className="popup-button popup-button--secondary popup-button--danger"
          disabled={isSubmitting || isReadingImportFile || isSchemaLoading}
          onClick={() => setIsConfirmingReset(true)}
          type="button">
          Clear saved data
        </button>
      </div>
      {isConfirmingReset ? (
        <ConfirmationDialog
          confirmation="reset-data"
          confirmLabel="Clear saved data"
          description="This permanently removes your bookmarks and history and clears cached pricing data. Your settings will stay the same."
          disabled={isSubmitting || isReadingImportFile}
          onCancel={() => setIsConfirmingReset(false)}
          onConfirm={() => {
            setIsConfirmingReset(false);
            onClearSavedData();
          }}
          title="Clear Better Trading data?"
        />
      ) : null}
    </>
  );
}

interface BookmarksPanelProps {
  folders: BookmarkFolder[];
  isSchemaLoading: boolean;
  onChangeFolderIcon: (folder: BookmarkFolder, icon: string | null) => Promise<void>;
  onCopyBackup: () => Promise<void>;
  onCopyFolderExport: (folder: BookmarkFolder) => Promise<void>;
  onDeleteFolder: (folder: BookmarkFolder) => Promise<void>;
  onDeleteTrade: (folder: BookmarkFolder, trade: BookmarkTrade) => Promise<void>;
  onDownloadBackup: () => Promise<void>;
  onToggleFolderArchive: (folder: BookmarkFolder) => Promise<void>;
  tradesByFolderId: Record<string, BookmarkTrade[]>;
}

export function BookmarksPanel({
  folders,
  isSchemaLoading,
  onChangeFolderIcon,
  onCopyBackup,
  onCopyFolderExport,
  onDeleteFolder,
  onDeleteTrade,
  onDownloadBackup,
  onToggleFolderArchive,
  tradesByFolderId,
}: BookmarksPanelProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmingFolderId, setConfirmingFolderId] = useState<string | null>(null);
  const [confirmingTradeKey, setConfirmingTradeKey] = useState<string | null>(null);

  const activeFolders = folders.filter((folder) => folder.archivedAt === null);
  const archivedFolders = folders.filter((folder) => folder.archivedAt !== null);
  const displayedFolders = showArchived ? archivedFolders : activeFolders;

  useEffect(() => {
    if (showArchived && archivedFolders.length === 0) {
      setShowArchived(false);
    }
  }, [archivedFolders.length, showArchived]);

  if (isSchemaLoading) {
    return <p className="popup-empty">Loading saved bookmark folders...</p>;
  }

  async function runAction(actionId: string, action: () => Promise<void>) {
    setBusyAction(actionId);

    try {
      await action();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <p className="popup-copy popup-copy--panel">
        Export individual folders or generate a full backup compatible with the
        original Better Trading add-on format.
      </p>

      <div className="popup-toolbar">
        <div className="popup-toolbar-group">
          <button
            aria-busy={busyAction === 'copy-backup'}
            className="popup-button popup-button--utility popup-button--small"
            disabled={folders.length === 0 || busyAction !== null}
            onClick={() => {
              void runAction('copy-backup', onCopyBackup);
            }}
            type="button">
            {busyAction === 'copy-backup' ? 'Copying...' : 'Copy full backup'}
          </button>
          <button
            aria-busy={busyAction === 'download-backup'}
            className="popup-button popup-button--utility popup-button--small"
            disabled={folders.length === 0 || busyAction !== null}
            onClick={() => {
              void runAction('download-backup', onDownloadBackup);
            }}
            type="button">
            {busyAction === 'download-backup'
              ? 'Preparing...'
              : 'Download backup'}
          </button>
        </div>

        {archivedFolders.length > 0 ? (
          <button
            className="popup-button popup-button--secondary popup-button--small"
            disabled={busyAction !== null}
            onClick={() => {
              setShowArchived((value) => !value);
              setConfirmingFolderId(null);
              setConfirmingTradeKey(null);
            }}
            type="button">
            {showArchived ? 'Show active' : 'Show archived'}
          </button>
        ) : null}
      </div>

      {displayedFolders.length === 0 ? (
        <p className="popup-empty">
          {showArchived
            ? 'No archived folders yet. Archive a folder first if you want to restore or permanently delete it.'
            : 'No bookmark folders yet. Import legacy data or save searches from the in-page panel.'}
        </p>
      ) : (
        <div className="popup-records">
          {displayedFolders.map((folder) => {
            const trades = tradesByFolderId[folder.id] ?? [];

            return (
              <article key={folder.id} className="popup-record-card">
                <div className="popup-record-header">
                  {folder.icon ? (
                    <FolderIcon
                      fallbackClassName="popup-folder-icon-fallback"
                      imageClassName="popup-folder-icon"
                      label={getFolderIconLabel(folder.icon) ?? folder.icon}
                      slug={folder.icon}
                    />
                  ) : null}
                  <div className="popup-record-copy">
                    <h3
                      data-name-color={folder.color ?? undefined}
                      style={
                        folder.color
                          ? { color: getBookmarkColorHex(folder.color) }
                          : undefined
                      }>
                      {folder.title}
                    </h3>
                    <p>
                      PoE {folder.version}
                      {folder.icon ? ` · ${getFolderIconLabel(folder.icon)}` : ''}
                    </p>
                  </div>
                  <div className="popup-record-badges">
                    <span>{trades.length} trades</span>
                    {folder.archivedAt ? <span>Archived</span> : <span>Active</span>}
                  </div>
                </div>

                <div className="popup-field">
                  <span>Icon</span>
                  <FolderIconPicker
                    disabled={busyAction !== null}
                    onChange={(icon) => {
                      void runAction(`icon-folder:${folder.id}`, () =>
                        onChangeFolderIcon(folder, icon),
                      );
                    }}
                    value={folder.icon}
                  />
                </div>

                <div className="popup-record-actions">
                  <button
                    className="popup-button popup-button--utility popup-button--small"
                    disabled={busyAction !== null}
                    onClick={() => {
                      void runAction(`export-folder:${folder.id}`, () =>
                        onCopyFolderExport(folder),
                      );
                    }}
                    type="button">
                    Copy export
                  </button>
                  <button
                    className="popup-button popup-button--secondary popup-button--small"
                    disabled={busyAction !== null}
                    onClick={() => {
                      setConfirmingFolderId(null);
                      void runAction(`archive-folder:${folder.id}`, () =>
                        onToggleFolderArchive(folder),
                      );
                    }}
                    type="button">
                    {folder.archivedAt ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    className="popup-button popup-button--danger popup-button--small"
                    disabled={busyAction !== null || folder.archivedAt === null}
                    onClick={() => {
                      setConfirmingFolderId(folder.id);
                      setConfirmingTradeKey(null);
                    }}
                    type="button">
                    Delete
                  </button>
                </div>

                {folder.archivedAt === null ? (
                  <p className="popup-inline-note">
                    Archive this folder before deleting it permanently.
                  </p>
                ) : null}

                {confirmingFolderId === folder.id ? (
                  <div className="popup-confirmation">
                    <p>Delete this archived folder and all of its trades permanently?</p>
                    <div className="popup-confirmation-actions">
                      <button
                        className="popup-button popup-button--danger popup-button--small"
                        disabled={busyAction !== null}
                        onClick={() => {
                          void runAction(`delete-folder:${folder.id}`, async () => {
                            await onDeleteFolder(folder);
                            setConfirmingFolderId(null);
                          });
                        }}
                        type="button">
                        Delete permanently
                      </button>
                      <button
                        className="popup-button popup-button--secondary popup-button--small"
                        disabled={busyAction !== null}
                        onClick={() => setConfirmingFolderId(null)}
                        type="button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {trades.length === 0 ? (
                  <p className="popup-inline-empty">This folder does not have any trades yet.</p>
                ) : (
                  <ul className="popup-trade-list">
                    {trades.map((trade) => {
                      const tradeKey = `${folder.id}:${trade.id}`;

                      return (
                        <li key={trade.id}>
                          <div className="popup-trade-row">
                            <div>
                              <strong
                                data-name-color={trade.color ?? undefined}
                                style={
                                  trade.color
                                    ? { color: getBookmarkColorHex(trade.color) }
                                    : undefined
                                }>
                                {trade.title}
                              </strong>
                              <span>
                                PoE {trade.location.version} | {trade.location.type} |{' '}
                                {shortenSlug(trade.location.slug)}
                              </span>
                            </div>
                            <div className="popup-trade-actions">
                              {trade.completedAt ? (
                                <span className="popup-badge">Completed</span>
                              ) : (
                                <span className="popup-badge popup-badge--muted">
                                  Open
                                </span>
                              )}
                              <button
                                className="popup-button popup-button--danger popup-button--small"
                                disabled={busyAction !== null}
                                onClick={() => {
                                  setConfirmingFolderId(null);
                                  setConfirmingTradeKey(tradeKey);
                                }}
                                type="button">
                                Delete
                              </button>
                            </div>
                          </div>

                          {confirmingTradeKey === tradeKey ? (
                            <div className="popup-confirmation popup-confirmation--nested">
                              <p>Delete this trade from the folder?</p>
                              <div className="popup-confirmation-actions">
                                <button
                                  className="popup-button popup-button--danger popup-button--small"
                                  disabled={busyAction !== null}
                                  onClick={() => {
                                    void runAction(`delete-trade:${tradeKey}`, async () => {
                                      await onDeleteTrade(folder, trade);
                                      setConfirmingTradeKey(null);
                                    });
                                  }}
                                  type="button">
                                  Delete trade
                                </button>
                                <button
                                  className="popup-button popup-button--secondary popup-button--small"
                                  disabled={busyAction !== null}
                                  onClick={() => setConfirmingTradeKey(null)}
                                  type="button">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export interface HistoryPanelProps {
  historyEntries: HistoryEntry[];
  isSchemaLoading: boolean;
  onClearHistory: () => Promise<void>;
}

export function HistoryPanel({
  historyEntries,
  isSchemaLoading,
  onClearHistory,
}: HistoryPanelProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  return (
    <>
      <div className="popup-panel-header popup-panel-header--history">
        <div>
          <p className="popup-panel-eyebrow">Browse</p>
          <h2>History</h2>
        </div>
        {!isSchemaLoading && historyEntries.length > 0 ? (
          <button
            className="popup-button popup-button--danger popup-button--small"
            disabled={isClearing}
            onClick={() => setIsConfirmingClear(true)}
            type="button">
            Clear all history
          </button>
        ) : null}
      </div>
      {isConfirmingClear ? (
        <ConfirmationDialog
          confirmation="clear-history"
          confirmLabel="Clear history"
          description="This removes every saved search from History. Your bookmarks are not affected."
          disabled={isClearing}
          onCancel={() => setIsConfirmingClear(false)}
          onConfirm={() => {
            setIsClearing(true);
            void onClearHistory().finally(() => {
              setIsClearing(false);
              setIsConfirmingClear(false);
            });
          }}
          title="Clear all saved history?"
        />
      ) : null}
      {isSchemaLoading ? (
        <p className="popup-empty">Loading saved history...</p>
      ) : historyEntries.length === 0 ? (
        <p className="popup-empty">Recent trade searches will appear here.</p>
      ) : (
        <ul className="popup-history-list">
          {historyEntries.map((entry) => (
            <li key={entry.id} className="popup-history-item">
              <a
                className="popup-history-link"
                href={buildTradeUrl(entry)}
                rel="noreferrer"
                target="_blank">
                <div className="popup-history-entry-header">
                  <h3 className="popup-history-title">{entry.title}</h3>
                  <span className="popup-history-date">
                    {formatTimestamp(entry.createdAt)}
                  </span>
                </div>
                <div className="popup-history-pills">
                  <span className="popup-history-pill" data-version={entry.version}>
                    PoE {entry.version}
                  </span>
                  <span className="popup-history-pill">
                    {formatTradeLeagueLabel(entry.league)}
                  </span>
                  <span className="popup-history-pill">{entry.type}</span>
                  {entry.isLive ? (
                    <span className="popup-history-pill popup-history-pill--live">
                      live
                    </span>
                  ) : null}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function attachTransientScrollbar(
  element: HTMLElement,
  hideDelayMs = 700,
) {
  let hideTimer: number | null = null;

  const showScrollbar = () => {
    element.dataset.scrolling = 'true';

    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
    }

    hideTimer = window.setTimeout(() => {
      delete element.dataset.scrolling;
      hideTimer = null;
    }, hideDelayMs);
  };

  element.addEventListener('wheel', showScrollbar, { passive: true });

  return () => {
    element.removeEventListener('wheel', showScrollbar);

    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
    }

    delete element.dataset.scrolling;
  };
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

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);

  link.download = filename;
  link.href = objectUrl;
  link.click();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function shortenSlug(slug: string) {
  return slug.length > 28 ? `${slug.slice(0, 28)}...` : slug;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default App;
