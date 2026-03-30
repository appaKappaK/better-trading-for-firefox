import { useEffect, useState } from 'react';

import type { BookmarkFolder, BookmarkTrade } from '@/src/features/bookmarks/types';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';

export interface PortableDataState {
  filename: string;
  label: string;
  value: string;
}

interface Props {
  isSchemaLoading: boolean;
  onClearPortableData: () => void;
  onCopyPortableData: () => Promise<void> | void;
  onDeleteFolder: (folderId: string, folderTitle: string) => Promise<void> | void;
  onDeleteTrade: (
    folderId: string,
    tradeId: string,
    tradeTitle: string,
  ) => Promise<void> | void;
  onDownloadPortableData: () => void;
  onExportFolder: (folderId: string, folderTitle: string) => Promise<void> | void;
  onGenerateBackup: () => Promise<void> | void;
  onToggleFolder: (folderId: string) => void;
  onToggleFolderArchive: (
    folderId: string,
    archivedAt: string | null,
    folderTitle: string,
  ) => Promise<void> | void;
  onToggleTradeCompletion: (
    folderId: string,
    tradeId: string,
    tradeTitle: string,
    completedAt: string | null,
  ) => Promise<void> | void;
  portableData: PortableDataState | null;
  schema: StorageSchemaV1 | null;
}

export function BookmarksManager({
  isSchemaLoading,
  onClearPortableData,
  onCopyPortableData,
  onDeleteFolder,
  onDeleteTrade,
  onDownloadPortableData,
  onExportFolder,
  onGenerateBackup,
  onToggleFolder,
  onToggleFolderArchive,
  onToggleTradeCompletion,
  portableData,
  schema,
}: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const [armedFolderDeleteId, setArmedFolderDeleteId] = useState<string | null>(null);
  const [armedTradeDelete, setArmedTradeDelete] = useState<{
    folderId: string;
    tradeId: string;
  } | null>(null);

  const folders = schema?.bookmarks.folders ?? [];
  const tradesByFolderId = schema?.bookmarks.tradesByFolderId ?? {};
  const expandedFolderIds = schema?.preferences.expandedFolderIds ?? [];

  const activeFolders = folders.filter((folder) => folder.archivedAt === null);
  const archivedFolders = folders.filter((folder) => folder.archivedAt !== null);
  const displayedFolders = showArchived ? archivedFolders : activeFolders;

  useEffect(() => {
    if (showArchived && archivedFolders.length === 0) {
      setShowArchived(false);
    }
  }, [archivedFolders.length, showArchived]);

  return (
    <>
      <PortableDataPanel
        onClear={onClearPortableData}
        onCopy={onCopyPortableData}
        onDownload={onDownloadPortableData}
        onGenerateBackup={onGenerateBackup}
        portableData={portableData}
      />

      <div className="popup-panel-header">
        <div>
          <p className="popup-panel-eyebrow">Bookmarks</p>
          <h2>Manage folders</h2>
        </div>

        {archivedFolders.length > 0 ? (
          <button
            className="popup-button popup-button--secondary"
            onClick={() => setShowArchived((value) => !value)}
            type="button">
            {showArchived ? 'Show active' : 'Show archived'}
          </button>
        ) : null}
      </div>

      {isSchemaLoading ? (
        <p className="popup-empty">Loading saved bookmark folders...</p>
      ) : null}

      {!isSchemaLoading && displayedFolders.length === 0 ? (
        <p className="popup-empty">
          {showArchived
            ? 'No archived folders yet. Archive a folder to park it here without deleting it.'
            : 'No bookmark folders yet. Import legacy data or save searches from the in-page panel.'}
        </p>
      ) : null}

      {!isSchemaLoading && displayedFolders.length > 0 ? (
        <div className="popup-records">
          {displayedFolders.map((folder) => {
            const trades = tradesByFolderId[folder.id] ?? [];
            const isExpanded =
              folder.archivedAt === null && expandedFolderIds.includes(folder.id);
            const folderDeleteArmed = armedFolderDeleteId === folder.id;

            return (
              <article key={folder.id} className="popup-record-card">
                <button
                  className="popup-folder-header"
                  onClick={() => {
                    if (folder.archivedAt) return;
                    onToggleFolder(folder.id);
                  }}
                  type="button">
                  <div>
                    <h3>{folder.title}</h3>
                    <p>
                      PoE {folder.version}
                      {folder.icon ? ` • ${folder.icon}` : ''}
                    </p>
                  </div>

                  <div className="popup-record-badges">
                    <span>{trades.length} trades</span>
                    {folder.archivedAt ? <span>Archived</span> : <span>Active</span>}
                    {folder.archivedAt ? null : <span>{isExpanded ? 'Hide' : 'Show'}</span>}
                  </div>
                </button>

                <div className="popup-inline-actions">
                  <button
                    className="popup-button popup-button--secondary"
                    onClick={() => {
                      void onExportFolder(folder.id, folder.title);
                    }}
                    type="button">
                    Export folder
                  </button>
                  <button
                    className="popup-button popup-button--secondary"
                    onClick={() => {
                      void onToggleFolderArchive(
                        folder.id,
                        folder.archivedAt,
                        folder.title,
                      );
                    }}
                    type="button">
                    {folder.archivedAt ? 'Restore folder' : 'Archive folder'}
                  </button>
                  {folder.archivedAt ? (
                    <>
                      <button
                        className={`popup-button popup-button--secondary${
                          folderDeleteArmed ? ' popup-button--danger' : ''
                        }`}
                        onClick={() => {
                          if (folderDeleteArmed) {
                            void onDeleteFolder(folder.id, folder.title);
                            setArmedFolderDeleteId(null);
                            return;
                          }

                          setArmedFolderDeleteId(folder.id);
                        }}
                        type="button">
                        {folderDeleteArmed ? 'Confirm delete' : 'Delete folder'}
                      </button>
                      {folderDeleteArmed ? (
                        <button
                          className="popup-button popup-button--secondary"
                          onClick={() => setArmedFolderDeleteId(null)}
                          type="button">
                          Cancel
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {isExpanded ? (
                  trades.length > 0 ? (
                    <ul className="popup-trade-list">
                      {trades.map((trade) => {
                        const tradeDeleteArmed =
                          armedTradeDelete?.folderId === folder.id &&
                          armedTradeDelete.tradeId === trade.id;

                        return (
                          <li key={trade.id}>
                            <div className="popup-trade-row-header">
                              <div>
                                <strong>{trade.title}</strong>
                                <span>
                                  PoE {trade.location.version} • {trade.location.type} •{' '}
                                  {shortenSlug(trade.location.slug)}
                                </span>
                              </div>
                              <span className="popup-inline-badge">
                                {trade.completedAt ? 'Completed' : 'Open'}
                              </span>
                            </div>

                            <div className="popup-inline-actions">
                              <button
                                className="popup-button popup-button--secondary"
                                onClick={() => {
                                  void onToggleTradeCompletion(
                                    folder.id,
                                    trade.id,
                                    trade.title,
                                    trade.completedAt,
                                  );
                                }}
                                type="button">
                                {trade.completedAt ? 'Undo done' : 'Mark done'}
                              </button>
                              <button
                                className={`popup-button popup-button--secondary${
                                  tradeDeleteArmed ? ' popup-button--danger' : ''
                                }`}
                                onClick={() => {
                                  if (tradeDeleteArmed) {
                                    void onDeleteTrade(folder.id, trade.id, trade.title);
                                    setArmedTradeDelete(null);
                                    return;
                                  }

                                  setArmedTradeDelete({
                                    folderId: folder.id,
                                    tradeId: trade.id,
                                  });
                                }}
                                type="button">
                                {tradeDeleteArmed ? 'Confirm delete' : 'Delete trade'}
                              </button>
                              {tradeDeleteArmed ? (
                                <button
                                  className="popup-button popup-button--secondary"
                                  onClick={() => setArmedTradeDelete(null)}
                                  type="button">
                                  Cancel
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="popup-inline-empty">
                      This folder does not have any saved trades yet.
                    </p>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

interface PortableDataPanelProps {
  onClear: () => void;
  onCopy: () => Promise<void> | void;
  onDownload: () => void;
  onGenerateBackup: () => Promise<void> | void;
  portableData: PortableDataState | null;
}

function PortableDataPanel({
  onClear,
  onCopy,
  onDownload,
  onGenerateBackup,
  portableData,
}: PortableDataPanelProps) {
  return (
    <section className="popup-tool-card">
      <div className="popup-panel-header">
        <div>
          <p className="popup-panel-eyebrow">Portable data</p>
          <h2>Backup and export</h2>
        </div>
      </div>

      <p className="popup-copy popup-copy--panel">
        Generate a full backup or export a single folder using the same portable
        text format the legacy add-on understands. The Migration tab can import
        that text again later.
      </p>

      <div className="popup-actions">
        <button className="popup-button" onClick={() => void onGenerateBackup()} type="button">
          Generate full backup
        </button>
        {portableData ? (
          <>
            <button
              className="popup-button popup-button--secondary"
              onClick={() => void onCopy()}
              type="button">
              Copy text
            </button>
            <button
              className="popup-button popup-button--secondary"
              onClick={onDownload}
              type="button">
              Download
            </button>
            <button
              className="popup-button popup-button--secondary"
              onClick={onClear}
              type="button">
              Clear
            </button>
          </>
        ) : null}
      </div>

      {portableData ? (
        <label className="popup-field" htmlFor="portable-data-output">
          <span>{portableData.label}</span>
          <textarea id="portable-data-output" readOnly rows={7} value={portableData.value} />
        </label>
      ) : (
        <p className="popup-empty popup-empty--compact">
          No backup or folder export generated yet.
        </p>
      )}
    </section>
  );
}

function shortenSlug(slug: string) {
  return slug.length > 28 ? `${slug.slice(0, 28)}...` : slug;
}
