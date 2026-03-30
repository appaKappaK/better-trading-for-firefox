import { useEffect, useState } from 'react';

import type { StorageSchemaV1 } from '@/src/lib/storage/schema';

interface Props {
  schema: StorageSchemaV1;
  onToggleFolder: (folderId: string) => void;
}

export function BookmarksView({ schema, onToggleFolder }: Props) {
  const [showArchived, setShowArchived] = useState(false);

  const activeFolders = schema.bookmarks.folders.filter(
    (folder) => folder.archivedAt === null,
  );
  const archivedFolders = schema.bookmarks.folders.filter(
    (folder) => folder.archivedAt !== null,
  );
  const displayedFolders = showArchived ? archivedFolders : activeFolders;

  useEffect(() => {
    if (showArchived && archivedFolders.length === 0) {
      setShowArchived(false);
    }
  }, [archivedFolders.length, showArchived]);

  return (
    <section className="popup-view-card">
      <div className="popup-view-header">
        <div>
          <p className="popup-panel-eyebrow">Bookmarks</p>
          <h3>Read-only folder view</h3>
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

      {displayedFolders.length === 0 ? (
        <div className="popup-empty-state">
          <strong>
            {showArchived ? 'No archived folders yet' : 'No bookmark folders yet'}
          </strong>
          <p>
            {showArchived
              ? 'Archived folders from imported data will appear here.'
              : 'Import a legacy export or backup to populate the new schema.'}
          </p>
        </div>
      ) : (
        <div className="popup-folder-stack">
          {displayedFolders.map((folder) => {
            const trades = schema.bookmarks.tradesByFolderId[folder.id] ?? [];
            const isExpanded = schema.preferences.expandedFolderIds.includes(
              folder.id,
            );

            return (
              <article className="popup-folder-card" key={folder.id}>
                <button
                  className="popup-folder-header"
                  onClick={() => onToggleFolder(folder.id)}
                  type="button">
                  <div>
                    <strong>{folder.title}</strong>
                    <div className="popup-folder-meta">
                      <span>PoE {folder.version}</span>
                      <span>{trades.length} trades</span>
                      {folder.archivedAt ? <span>Archived</span> : null}
                    </div>
                  </div>
                  <span className="popup-folder-toggle">
                    {isExpanded ? 'Hide' : 'Show'}
                  </span>
                </button>

                {isExpanded ? (
                  trades.length > 0 ? (
                    <ul className="popup-trade-list">
                      {trades.map((trade) => (
                        <li className="popup-trade-row" key={trade.id}>
                          <div>
                            <strong>{trade.title}</strong>
                            <span>
                              {trade.location.type}/{trade.location.slug}
                            </span>
                          </div>
                          {trade.completedAt ? (
                            <span className="popup-badge">Completed</span>
                          ) : (
                            <span className="popup-badge popup-badge--muted">
                              Open
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="popup-inline-empty">
                      This folder has no saved trades yet.
                    </div>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
