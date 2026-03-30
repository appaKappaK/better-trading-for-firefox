import type { StorageSchemaV1 } from '@/src/lib/storage/schema';
import { formatRelativeTime } from '@/src/popup/time';
import { buildTradeUrl } from '@/src/popup/tradeUrls';

interface Props {
  schema: StorageSchemaV1;
}

export function HistoryView({ schema }: Props) {
  const historyEntries = schema.history.entries;

  return (
    <section className="popup-view-card">
      <div className="popup-view-header">
        <div>
          <p className="popup-panel-eyebrow">History</p>
          <h3>Recent trade locations</h3>
        </div>
      </div>

      {historyEntries.length === 0 ? (
        <div className="popup-empty-state">
          <strong>No trade history yet</strong>
          <p>
            Once the new extension starts logging trade locations, the newest
            entries will appear here first.
          </p>
        </div>
      ) : (
        <ul className="popup-history-list">
          {historyEntries.map((historyEntry) => (
            <li key={historyEntry.id}>
              <a
                className="popup-history-link"
                href={buildTradeUrl(historyEntry)}
                rel="noreferrer"
                target="_blank">
                <strong>{historyEntry.title}</strong>
                <span>
                  {historyEntry.type}/{historyEntry.league}/{historyEntry.slug}
                </span>
                <time dateTime={historyEntry.createdAt}>
                  {formatRelativeTime(historyEntry.createdAt)}
                </time>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
