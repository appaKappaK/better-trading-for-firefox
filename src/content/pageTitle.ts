import type { StorageSchemaV1 } from '@/src/lib/storage/schema';
import type { ParsedTradeLocation } from '@/src/lib/trade/location';

const TITLE_MUTATION_THROTTLE_MS = 100;
const WOOP_PREFIX_REGEX = /^\((\d+)\)\s+/;
const DEFAULT_BASE_SITE_TITLE = 'Path of Exile Trade';
const NULL_CATEGORY = 'Any';
const NULL_RARITY = 'Any';

const SEARCH_INPUT_SELECTOR = '.search-panel .search-bar .search-left input';
const CATEGORY_INPUT_SELECTOR =
  '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(1) input';
const RARITY_INPUT_SELECTOR =
  '.search-advanced-items .filter-group:nth-of-type(1) .filter-property:nth-of-type(2) input';

export function createPageTitleController(doc: Document = document) {
  const titleElement = doc.querySelector('title');
  let baseSiteTitle = normalizeBaseSiteTitle(doc.title);
  let historySourceTitle = '';
  let lastAppliedTitle: string | null = null;
  let lastWoopCount = parseWoopCount(doc.title);
  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;
  let controlledTitle = baseSiteTitle;

  function connect() {
    if (!titleElement || observer) return;

    observer = new MutationObserver(() => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleDocumentTitleMutation, TITLE_MUTATION_THROTTLE_MS);
    });
    observer.observe(titleElement, { childList: true });
  }

  function disconnect() {
    observer?.disconnect();
    observer = null;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function getHistorySourceTitle() {
    return historySourceTitle;
  }

  function update(schema: StorageSchemaV1 | null, location: ParsedTradeLocation | null) {
    const activeTradeTitle = resolveActiveTradeTitle({
      doc,
      location,
      schema,
    });
    historySourceTitle = activeTradeTitle;
    controlledTitle = buildControlledPageTitle({
      baseSiteTitle,
      location,
      tradeTitle: activeTradeTitle,
    });
    applyTitle();
  }

  return {
    connect,
    disconnect,
    getHistorySourceTitle,
    update,
  };

  function applyTitle() {
    if (!titleElement || !controlledTitle) return;

    const nextTitle = prefixWithWoopCount(controlledTitle, lastWoopCount);
    if (doc.title === nextTitle) return;

    lastAppliedTitle = nextTitle;
    doc.title = nextTitle;
  }

  function handleDocumentTitleMutation() {
    const currentTitle = doc.title;
    const currentWoopCount = parseWoopCount(currentTitle);
    if (currentWoopCount !== null) {
      lastWoopCount = currentWoopCount;
    }

    if (currentTitle === lastAppliedTitle) {
      lastAppliedTitle = null;
      return;
    }

    const strippedTitle = normalizeBaseSiteTitle(currentTitle);
    if (strippedTitle && strippedTitle !== controlledTitle) {
      baseSiteTitle = strippedTitle;
      historySourceTitle = strippedTitle;
    }

    applyTitle();
  }
}

export function buildControlledPageTitle(input: {
  baseSiteTitle: string;
  location: ParsedTradeLocation | null;
  tradeTitle: string;
}) {
  const baseSiteTitle =
    input.baseSiteTitle.trim() || DEFAULT_BASE_SITE_TITLE;
  const location = input.location;

  if (!location) {
    return baseSiteTitle;
  }

  const liveSegment = location.isLive ? 'LIVE ' : '';
  const tradeTitleSegment = input.tradeTitle ? `${input.tradeTitle} - ` : '';

  return `${liveSegment}${tradeTitleSegment}${baseSiteTitle}`.trim();
}

export function findActiveBookmarkTradeTitle(
  schema: StorageSchemaV1 | null,
  location: Pick<ParsedTradeLocation, 'version' | 'type' | 'slug'> | null,
) {
  if (!schema || !location) return null;

  let matchingFolders = schema.bookmarks.folders
    .map((folder) => ({
      ...folder,
      trades: (schema.bookmarks.tradesByFolderId[folder.id] ?? []).filter(
        (trade) =>
          trade.location.version === location.version &&
          trade.location.type === location.type &&
          trade.location.slug === location.slug,
      ),
    }))
    .filter((folder) => folder.trades.length > 0);

  if (matchingFolders.length === 0) return null;

  const unarchivedFolders = matchingFolders.filter((folder) => !folder.archivedAt);
  if (unarchivedFolders.length > 0) {
    matchingFolders = unarchivedFolders;
  }

  const matchingTrades = matchingFolders
    .flatMap((folder) => folder.trades)
    .sort((left, right) => left.title.localeCompare(right.title));

  return matchingTrades[0]?.title ?? null;
}

export function parseWoopCount(title: string): number | null {
  const woopMatch = WOOP_PREFIX_REGEX.exec(title);
  if (!woopMatch) return null;

  const count = Number.parseInt(woopMatch[1], 10);
  return Number.isNaN(count) ? null : count;
}

export function recommendSearchTitle(doc: Document = document) {
  const name = scrapeInputValue(doc, SEARCH_INPUT_SELECTOR);
  if (name) return name;

  const category = scrapeInputValue(doc, CATEGORY_INPUT_SELECTOR, NULL_CATEGORY);
  const rarity = scrapeInputValue(doc, RARITY_INPUT_SELECTOR, NULL_RARITY);

  if (!category) return '';
  if (!rarity) return category;

  return `${category} (${rarity})`;
}

export function resolveActiveTradeTitle(input: {
  doc: Document;
  location: ParsedTradeLocation | null;
  schema: StorageSchemaV1 | null;
}) {
  if (!input.location) return '';

  const bookmarkTitle = findActiveBookmarkTradeTitle(input.schema, input.location);
  if (bookmarkTitle) return bookmarkTitle;

  return input.location.type === 'search' ? recommendSearchTitle(input.doc) : '';
}

function normalizeBaseSiteTitle(title: string) {
  const strippedTitle = stripWoopPrefix(title).trim();
  return strippedTitle || DEFAULT_BASE_SITE_TITLE;
}

function prefixWithWoopCount(title: string, woopCount: number | null) {
  return woopCount !== null ? `(${woopCount}) ${title}` : title;
}

function scrapeInputValue(
  doc: Document,
  selector: string,
  nullValue?: string,
) {
  const input = doc.querySelector<HTMLInputElement>(selector);
  const value = input?.value?.trim();

  if (!value) return null;
  if (nullValue && value === nullValue) return null;

  return value;
}

function stripWoopPrefix(title: string) {
  return title.replace(WOOP_PREFIX_REGEX, '');
}
