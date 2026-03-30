import {
  parseTradeLocationFromPathname,
  type ParsedTradeLocation,
} from '../lib/trade/location';

const ILVL_THRESHOLDS = [
  { maxSockets: 2, ilvl: 1 },
  { maxSockets: 3, ilvl: 24 },
  { maxSockets: 4, ilvl: 34 },
  { maxSockets: 5, ilvl: 49 },
];

const SOCKET_WARNING_CLASS = 'btff-phase0-maximum-sockets';

export type TradePageVersion = 'poe1' | 'poe2' | 'unknown';

export interface TradePageSnapshot {
  version: TradePageVersion;
  resultsFound: number;
  socketWarnings: number;
  currentPath: string;
  tradeLocation: ParsedTradeLocation | null;
  lastRefreshedAt: string;
}

interface CollectTradePageSnapshotOptions {
  pathname?: string;
  socketWarnings?: number;
}

export function collectTradePageSnapshot(
  doc: Document = document,
  options: CollectTradePageSnapshotOptions = {},
): TradePageSnapshot {
  const pathname = options.pathname ?? window.location.pathname;
  const resultsFound = doc.querySelectorAll('.resultset > div.row[data-id]').length;
  const tradeLocation = parseTradeLocationFromPathname(pathname);

  return {
    version: detectTradePageVersion(pathname),
    resultsFound,
    socketWarnings: options.socketWarnings ?? 0,
    currentPath: pathname,
    tradeLocation,
    lastRefreshedAt: new Date().toLocaleTimeString(),
  };
}

export function detectTradePageVersion(pathname: string): TradePageVersion {
  if (pathname.startsWith('/trade2/')) return 'poe2';
  if (pathname.startsWith('/trade/')) return 'poe1';

  return 'unknown';
}

export function applyMaximumSocketWarnings(
  root: ParentNode = document,
  enabled: boolean = true,
): number {
  const version = detectTradePageVersion(window.location.pathname);
  const rows = Array.from(
    root.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]'),
  );

  let warningCount = 0;

  for (const row of rows) {
    const itemRendered = row.querySelector<HTMLElement>('.itemRendered');
    const existingWarning = itemRendered?.querySelector<HTMLElement>(
      `.${SOCKET_WARNING_CLASS}`,
    );

    if (!itemRendered || version !== 'poe1' || !enabled) {
      existingWarning?.remove();
      continue;
    }

    const socketsCount = row.querySelectorAll('.sockets .socket').length;
    const ilvlText = row.querySelector('.itemLevel')?.textContent ?? '';
    const ilvlMatch = ilvlText.match(/(\d+)/);
    const iconSource = row.querySelector<HTMLImageElement>('.icon img')?.src ?? '';
    const isArmor = /\/BodyArmours\//.test(iconSource);

    if (!ilvlMatch || socketsCount === 0 || !isArmor) {
      existingWarning?.remove();
      continue;
    }

    const ilvl = Number.parseInt(ilvlMatch[1], 10);
    const maximumSockets = resolveMaximumSockets(ilvl);

    if (Number.isNaN(ilvl) || socketsCount >= maximumSockets) {
      existingWarning?.remove();
      continue;
    }

    const warningText = `Max ${maximumSockets} sockets at iLvl ${ilvl}`;

    if (!existingWarning) {
      const warning = document.createElement('div');
      warning.className = SOCKET_WARNING_CLASS;
      warning.textContent = warningText;
      itemRendered.prepend(warning);
    } else {
      existingWarning.textContent = warningText;
    }

    warningCount++;
  }

  return warningCount;
}

function resolveMaximumSockets(ilvl: number) {
  const threshold = ILVL_THRESHOLDS.find((item) => ilvl <= item.ilvl);
  return threshold?.maxSockets ?? 6;
}
