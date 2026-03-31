import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { BookmarkFolder, BookmarkTrade } from '@/src/features/bookmarks/types';
import { previewLegacyImport } from '@/src/lib/legacy/importPreview';
import type { HistoryEntry, StorageSchemaV1 } from '@/src/lib/storage/schema';
import {
  clearStoredHistory,
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
import {
  FOLDER_ICON_OPTIONS,
  getFolderIconLabel,
} from '@/src/lib/bookmarks/folderIcons';
import { readImportFile } from '@/src/popup/importFiles';
import { SettingsView } from '@/src/popup/SettingsView';

import './App.css';

type PopupPage = 'bookmarks' | 'history' | 'import' | 'settings';
type FeedbackTone = 'neutral' | 'success' | 'error';

interface FeedbackState {
  tone: FeedbackTone;
  title: string;
  message: string;
}

const DEFAULT_FEEDBACK: FeedbackState = {
  tone: 'neutral',
  title: 'Welcome to Better Trading for Firefox',
  message:
    'Import a legacy backup or start fresh to begin. Use the Import tab to bring over folders from the old add-on.',
};

const PAGE_LABELS: Record<PopupPage, string> = {
  bookmarks: 'Bookmarks',
  history: 'History',
  import: 'Import',
  settings: 'Settings',
};

function App() {
  const [schema, setSchema] = useState<StorageSchemaV1 | null>(null);
  const [activePage, setActivePage] = useState<PopupPage>('import');
  const [isSchemaLoading, setIsSchemaLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadingImportFile, setIsReadingImportFile] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(DEFAULT_FEEDBACK);

  const deferredImportInput = useDeferredValue(importInput);
  const importPreview = useMemo(
    () => previewLegacyImport(deferredImportInput),
    [deferredImportInput],
  );

  const folders = schema?.bookmarks.folders ?? [];
  const historyEntries = schema?.history.entries ?? [];
  const bookmarkTradeCount = folders.reduce(
    (count, folder) =>
      count + (schema?.bookmarks.tradesByFolderId[folder.id]?.length ?? 0),
    0,
  );
  const needsOnboarding = !schema?.preferences.hasCompletedOnboarding;

  useEffect(() => {
    let isActive = true;

    const syncSchema = async () => {
      try {
        const nextSchema = await loadStoredSchema();

        if (!isActive) return;

        applyLoadedSchema(nextSchema);

        if (!nextSchema.preferences.hasCompletedOnboarding) {
          setFeedback(DEFAULT_FEEDBACK);
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

  function applyLoadedSchema(nextSchema: StorageSchemaV1) {
    startTransition(() => {
      setSchema(nextSchema);
      setActivePage((currentPage) => {
        if (!nextSchema.preferences.hasCompletedOnboarding) return 'import';
        if (currentPage === 'settings') return 'settings';
        if (currentPage === 'import') {
          return normalizeStoredPage(nextSchema.preferences.currentPage);
        }
        return currentPage;
      });
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

  async function handleSelectPage(nextPage: PopupPage) {
    if (nextPage === 'import' || nextPage === 'settings') {
      setActivePage(nextPage);
      return;
    }

    setActivePage(nextPage);

    try {
      await updateStoredPreferences({
        currentPage: nextPage,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not save the selected view',
        message: error instanceof Error ? error.message : String(error),
      });
    }
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

  async function handleStartFresh() {
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
        title: 'Started fresh',
        message: 'Storage is cleared and ready. Use the in-page panel to save your first trade search.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not initialize fresh storage',
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
    <main className="popup-shell">
      <section className="popup-hero">
        <p className="popup-eyebrow">Better Trading for Firefox</p>
        <h1>Manage Bookmarks</h1>
        <p className="popup-copy">
          Save trade searches, browse history, and manage bookmarks from here.
          Use the in-page panel on trade pages for live enhancers and quick saves.
        </p>
      </section>

      <section className="popup-summary-grid" aria-label="Schema summary">
        <article className="popup-summary-card">
          <span className="popup-summary-label">Folders</span>
          <strong>{folders.length}</strong>
        </article>
        <article className="popup-summary-card">
          <span className="popup-summary-label">Trades</span>
          <strong>{bookmarkTradeCount}</strong>
        </article>
        <article className="popup-summary-card">
          <span className="popup-summary-label">History</span>
          <strong>{historyEntries.length}</strong>
        </article>
        <article className="popup-summary-card">
          <span className="popup-summary-label">Schema</span>
          <strong>v{schema?.schemaVersion ?? 1}</strong>
        </article>
      </section>

      <section className="popup-status" data-tone={feedback.tone}>
        <p className="popup-status-title">{feedback.title}</p>
        <p className="popup-status-message">{feedback.message}</p>
      </section>

      <nav className="popup-tabs" aria-label="Popup sections">
        {(Object.keys(PAGE_LABELS) as PopupPage[]).map((page) => (
          <button
            key={page}
            className="popup-tab"
            data-active={activePage === page}
            disabled={needsOnboarding && page !== 'import' && page !== 'settings'}
            onClick={() => {
              void handleSelectPage(page);
            }}
            type="button">
            {PAGE_LABELS[page]}
          </button>
        ))}
      </nav>

      <section className="popup-panel">
        <div className="popup-panel-header">
          <div>
            <p className="popup-panel-eyebrow">
              {activePage === 'import'
                ? 'Import'
                : activePage === 'bookmarks'
                  ? 'Manage'
                  : activePage === 'history'
                    ? 'History'
                    : 'Settings'}
            </p>
            <h2>{PAGE_LABELS[activePage]}</h2>
          </div>
        </div>

        {activePage === 'import' ? (
          <MigrationPanel
            importInput={importInput}
            importPreview={importPreview}
            isReadingImportFile={isReadingImportFile}
            isSchemaLoading={isSchemaLoading}
            isSubmitting={isSubmitting}
            needsOnboarding={needsOnboarding}
            onImportFileChange={handleImportFileChange}
            onImportInputChange={setImportInput}
            onImportSubmit={handleImportSubmit}
            onStartFresh={handleStartFresh}
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
            onSetSidePanelCollapsed={handleSetSidePanelCollapsed}
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
  needsOnboarding: boolean;
  onImportFileChange: (file: File | null) => void | Promise<void>;
  onImportInputChange: (value: string) => void;
  onImportSubmit: () => void;
  onStartFresh: () => void;
}

function MigrationPanel({
  importInput,
  importPreview,
  isReadingImportFile,
  isSchemaLoading,
  isSubmitting,
  needsOnboarding,
  onImportFileChange,
  onImportInputChange,
  onImportSubmit,
  onStartFresh,
}: MigrationPanelProps) {
  return (
    <>
      <p className="popup-copy popup-copy--panel">
        Paste one folder export string or the full backup text from the old
        Better Trading add-on, or load a backup text file directly. This
        supports v1, v2, and v3 bookmark formats.
      </p>

      <label className="popup-file-picker">
        <span>Backup file</span>
        <input
          accept=".txt,text/plain"
          disabled={isReadingImportFile || isSubmitting}
          onChange={(event) => {
            void onImportFileChange(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
          type="file"
        />
        <small>
          {isReadingImportFile
            ? 'Reading file...'
            : 'Loads the file into the import box below for preview and restore.'}
        </small>
      </label>

      <label className="popup-field" htmlFor="legacy-import-input">
        <span>Legacy export or backup text</span>
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
          className="popup-button popup-button--secondary"
          disabled={isSubmitting || isReadingImportFile || isSchemaLoading}
          onClick={onStartFresh}
          type="button">
          {needsOnboarding ? 'Start fresh' : 'Reset to fresh'}
        </button>
      </div>
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

function BookmarksPanel({
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
            className="popup-button popup-button--secondary popup-button--small"
            disabled={folders.length === 0 || busyAction !== null}
            onClick={() => {
              void runAction('copy-backup', onCopyBackup);
            }}
            type="button">
            Copy full backup
          </button>
          <button
            className="popup-button popup-button--secondary popup-button--small"
            disabled={folders.length === 0 || busyAction !== null}
            onClick={() => {
              void runAction('download-backup', onDownloadBackup);
            }}
            type="button">
            Download backup
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
                  <div>
                    <h3>{folder.title}</h3>
                    <p>
                      PoE {folder.version}
                      {folder.icon ? ` • ${getFolderIconLabel(folder.icon)}` : ''}
                    </p>
                  </div>
                  <div className="popup-record-badges">
                    <span>{trades.length} trades</span>
                    {folder.archivedAt ? <span>Archived</span> : <span>Active</span>}
                  </div>
                </div>

                <label className="popup-field">
                  <span>Icon</span>
                  <select
                    disabled={busyAction !== null}
                    onChange={(event) => {
                      void runAction(`icon-folder:${folder.id}`, () =>
                        onChangeFolderIcon(folder, event.target.value || null),
                      );
                    }}
                    value={folder.icon ?? ''}>
                    <option value="">None</option>
                    {FOLDER_ICON_OPTIONS.map((opt) => (
                      <option key={opt.slug} value={opt.slug}>
                        {opt.group} — {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="popup-record-actions">
                  <button
                    className="popup-button popup-button--secondary popup-button--small"
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
                              <strong>{trade.title}</strong>
                              <span>
                                PoE {trade.location.version} • {trade.location.type} •{' '}
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
                                className="popup-button popup-button--secondary popup-button--small"
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

interface HistoryPanelProps {
  historyEntries: HistoryEntry[];
  isSchemaLoading: boolean;
  onClearHistory: () => Promise<void>;
}

function HistoryPanel({ historyEntries, isSchemaLoading, onClearHistory }: HistoryPanelProps) {
  const [isClearing, setIsClearing] = useState(false);

  if (isSchemaLoading) {
    return <p className="popup-empty">Loading saved history...</p>;
  }

  if (historyEntries.length === 0) {
    return (
      <p className="popup-empty">
        Visit trade searches and the in-page panel will keep filling this
        history feed from the pages you open.
      </p>
    );
  }

  return (
    <>
      <div className="popup-toolbar">
        <button
          className="popup-button popup-button--secondary popup-button--small"
          disabled={isClearing}
          onClick={() => {
            setIsClearing(true);
            void onClearHistory().finally(() => setIsClearing(false));
          }}
          type="button">
          Clear all history
        </button>
      </div>
      <ul className="popup-history-list">
        {historyEntries.map((entry) => (
          <li key={entry.id} className="popup-history-item">
            <div className="popup-record-header">
              <div>
                <h3>{entry.title}</h3>
                <p>
                  PoE {entry.version} • {entry.league} • {entry.type}
                  {entry.isLive ? ' • live' : ''}
                </p>
              </div>
              <span className="popup-history-date">{formatTimestamp(entry.createdAt)}</span>
            </div>
            <code>{shortenSlug(entry.slug)}</code>
          </li>
        ))}
      </ul>
    </>
  );
}

function normalizeStoredPage(value: string | null | undefined): PopupPage {
  if (value === 'history') return 'history';
  if (value === 'settings') return 'settings';
  return 'bookmarks';
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
