export interface PinnedItemRecord {
  id: string;
  chaosEquivalent?: number | null;
  currencyIconUrl?: string | null;
  imageUrl?: string | null;
  pinnedAt: string;
  price: string | null;
  sourcePath: string;
  subtitle: string;
  title: string;
}

type Listener = (items: PinnedItemRecord[]) => void;

const PIN_ACTION_HOST_CLASS = 'btff-pin-action-host';
const PIN_BUTTON_CLASS = 'btff-pin-button';
const PINNED_CLASS = 'btff-pinned';
const PINNED_GLOW_CLASS = 'btff-pinned-glow';
const PINNED_ITEM_FALLBACK_TITLE = 'Pinned item';
const PINNED_ITEM_FALLBACK_SUBTITLE = 'Pinned from the current trade results.';

export const PINNED_ITEMS_HOST_PAGE_STYLES = `
  .btff-pin-action-host {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .details .btns + .btff-pin-action-host {
    margin-top: 8px;
  }
  .btff-pin-button {
    display: inline-block;
    min-width: 22px;
    padding: 1px 5px;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    text-align: center;
    vertical-align: middle;
    border-radius: 0;
    border: 1px solid #444;
    background-color: #222;
    background-image: none;
    color: #e9cf9f;
    cursor: pointer;
    white-space: nowrap;
    touch-action: manipulation;
    user-select: none;
  }
  .btff-pin-button[aria-pressed='true'] {
    background-color: #5a3a10;
    border-color: #a06820;
    color: #f5d98a;
  }
  .btff-pin-button:hover {
    background-color: #2e2e2e;
    border-color: #666;
  }
  .row[data-btff-pinned='true'] {
    box-shadow: inset 0 0 0 2px rgba(184, 110, 39, 0.32);
  }
  .btff-pinned-glow {
    box-shadow:
      0 0 0 2px rgba(184, 110, 39, 0.32),
      0 0 24px rgba(184, 110, 39, 0.28);
  }
`;

export function createPinnedItemsStore(doc: Document = document) {
  const listeners = new Set<Listener>();
  const pinnedItems = new Map<string, PinnedItemRecord>();
  let currentSourcePath = doc.defaultView?.location?.pathname ?? '';

  function subscribe(listener: Listener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  function getItems() {
    return [...pinnedItems.values()].sort((left, right) =>
      right.pinnedAt.localeCompare(left.pinnedAt),
    );
  }

  function emit() {
    const items = getItems();
    listeners.forEach((listener) => listener(items));
  }

  function ensureButtons(root: ParentNode = doc) {
    const rows = findRows(root);
    rows.forEach((row) => ensureRowButton(row));
    let refreshedStoredItem = false;
    rows.forEach((row) => {
      refreshedStoredItem = refreshStoredItem(row) || refreshedStoredItem;
    });
    syncPinnedRowState(rows);

    if (refreshedStoredItem) {
      emit();
    }
  }

  function getItem(itemId: string) {
    return pinnedItems.get(itemId) ?? null;
  }

  function toggleRow(row: HTMLElement) {
    const itemId = row.getAttribute('data-id');
    if (!itemId) return false;

    if (pinnedItems.has(itemId)) {
      pinnedItems.delete(itemId);
    } else {
      pinnedItems.set(itemId, extractPinnedItem(row, currentSourcePath));
    }

    syncPinnedRowState();
    emit();
    return true;
  }

  function unpin(itemId: string) {
    if (!pinnedItems.delete(itemId)) return false;

    syncPinnedRowState();
    emit();
    return true;
  }

  function clear() {
    if (pinnedItems.size === 0) return false;

    pinnedItems.clear();
    syncPinnedRowState();
    emit();
    return true;
  }

  function hasRow(itemId: string, root: ParentNode = doc) {
    return findRows(root).some((row) => row.getAttribute('data-id') === itemId);
  }

  function replaceItems(items: PinnedItemRecord[]) {
    pinnedItems.clear();
    items.forEach((item) => {
      pinnedItems.set(item.id, item);
    });
    syncPinnedRowState();
    emit();
  }

  function scrollToItem(itemId: string) {
    const row = findRows().find((candidate) => candidate.getAttribute('data-id') === itemId);
    if (!row) return false;

    row.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    row.classList.add(PINNED_GLOW_CLASS);
    doc.defaultView?.setTimeout(() => {
      row.classList.remove(PINNED_GLOW_CLASS);
    }, 1600);

    return true;
  }

  function ensureRowButton(row: HTMLElement) {
    const host = resolvePinButtonHost(row);
    let button = host.querySelector<HTMLButtonElement>(`.${PIN_BUTTON_CLASS}`);

    if (!button) {
      button = doc.createElement('button');
      button.className = PIN_BUTTON_CLASS;
      button.type = 'button';
      button.addEventListener('click', () => {
        void toggleRow(row);
      });
      host.append(button);
    }

    const itemId = row.getAttribute('data-id');
    const isPinned = itemId ? pinnedItems.has(itemId) : false;

    row.classList.toggle(PINNED_CLASS, isPinned);
    setPinButtonState(button, isPinned);
  }

  function refreshStoredItem(row: HTMLElement) {
    const itemId = row.getAttribute('data-id');
    if (!itemId) return false;

    const storedItem = pinnedItems.get(itemId);
    if (!storedItem || !isPinnedItemPlaceholderTitle(storedItem.title)) {
      return false;
    }

    const capturedItem = extractPinnedItem(row, storedItem.sourcePath);
    if (isPinnedItemPlaceholderTitle(capturedItem.title)) {
      return false;
    }

    pinnedItems.set(itemId, {
      ...capturedItem,
      chaosEquivalent:
        capturedItem.chaosEquivalent ?? storedItem.chaosEquivalent ?? null,
      currencyIconUrl:
        capturedItem.currencyIconUrl ?? storedItem.currencyIconUrl ?? null,
      imageUrl: capturedItem.imageUrl ?? storedItem.imageUrl ?? null,
      pinnedAt: storedItem.pinnedAt,
      price: capturedItem.price ?? storedItem.price,
      sourcePath: storedItem.sourcePath,
      subtitle:
        capturedItem.subtitle === PINNED_ITEM_FALLBACK_SUBTITLE
          ? storedItem.subtitle
          : capturedItem.subtitle,
    });
    return true;
  }

  function setSourcePath(sourcePath: string) {
    currentSourcePath = sourcePath;
  }

  function syncPinnedRowState(rows: HTMLElement[] = findRows()) {
    rows.forEach((row) => {
      const host = resolvePinButtonHost(row);
      const button = host.querySelector<HTMLButtonElement>(`.${PIN_BUTTON_CLASS}`);
      const itemId = row.getAttribute('data-id');
      const isPinned = itemId ? pinnedItems.has(itemId) : false;

      row.classList.toggle(PINNED_CLASS, isPinned);

      if (button) {
        setPinButtonState(button, isPinned);
      }
    });
  }

  function setPinButtonState(button: HTMLButtonElement, isPinned: boolean) {
    const label = isPinned ? 'Unpin' : 'Pin';
    if (button.textContent !== label) {
      button.textContent = label;
    }
    button.setAttribute('aria-pressed', String(isPinned));
  }

  function resolvePinButtonHost(row: HTMLElement) {
    const existingHost = row.querySelector<HTMLElement>(`.${PIN_ACTION_HOST_CLASS}`);
    if (existingHost) return existingHost;

    const host = doc.createElement('div');
    host.className = PIN_ACTION_HOST_CLASS;

    // Place pin host AFTER the existing button row (.btns) so it always appears
    // below Whisper / Travel to Hideout / AFK / Online — whatever is shown.
    const details = row.querySelector<HTMLElement>('.details');
    const existingButtons = details?.querySelector<HTMLElement>('.btns');
    if (existingButtons) {
      existingButtons.insertAdjacentElement('afterend', host);
      return host;
    }

    if (details) {
      details.append(host);
      return host;
    }

    const fallbackContainer =
      row.querySelector<HTMLElement>('.middle') ??
      row.querySelector<HTMLElement>('.left') ??
      row;
    fallbackContainer.append(host);

    return host;
  }

  return {
    clear,
    ensureButtons,
    getItem,
    getItems,
    hasRow,
    replaceItems,
    scrollToItem,
    setSourcePath,
    subscribe,
    toggleRow,
    unpin,
  };
}

function extractPinnedItem(row: HTMLElement, sourcePath: string): PinnedItemRecord {
  const itemId = row.getAttribute('data-id');
  if (!itemId) {
    throw new Error('Pinned rows must expose a data-id attribute.');
  }

  const itemName = normalizePinnedText(
    findText(row, [
      '.itemHeader .itemName:not(.typeLine) .lc',
      '.itemName.itemHeader:not(.typeLine) .lc',
      '.itemName:not(.typeLine) .lc',
      '.itemHeader .itemName:not(.typeLine)',
      '.itemName:not(.typeLine)',
      '.item-popup__header .item-popup__header-line:not(.type-line):not(.typeLine)',
      '.item-popup__header-line',
      '.itemHeader .name',
      '.itemHeader .title',
      '.itemHeader .lprice .title',
    ]),
  );
  const itemBaseType = normalizePinnedText(
    findText(row, [
      '.itemHeader .itemName.typeLine .lc',
      '.itemName.itemHeader.typeLine .lc',
      '.itemName.typeLine .lc',
      '[data-field="typeLine"]',
      '.itemHeader .itemName.typeLine',
      '.itemName.typeLine',
      '.item-popup__header .item-popup__header-line + .item-popup__header-line',
      '.item-popup__header .type-line',
      '.item-popup__header .typeLine',
    ]),
  );
  const title =
    itemName ??
    normalizePinnedText(
      findText(row, [
        '.itemHeader > .lc',
        '.itemHeader .lc',
        '[data-field="name"]',
        '.itemHeader',
        '.item-popup__header',
        '.details .title',
      ]),
    ) ??
    itemBaseType ??
    PINNED_ITEM_FALLBACK_TITLE;
  const price = extractCleanPrice(row);
  const subtitleParts = [
    itemBaseType && itemBaseType !== title ? itemBaseType : null,
    normalizePinnedText(findText(row, ['[data-field="ilvl"]', '.itemLevel'])),
    normalizePinnedText(
      findText(row, [
        '.details [data-field="indexed"] .profile-link a',
        '.details .profile-link a',
        '.details .account-name',
        '.details .character-name',
        '.details .account',
        '.account-name',
        '.account',
      ]),
    ),
  ].filter(Boolean);

  return {
    id: itemId,
    chaosEquivalent: extractChaosEquivalent(row),
    currencyIconUrl: findCurrencyIconUrl(row),
    imageUrl: findItemImageUrl(row),
    pinnedAt: new Date().toISOString(),
    price,
    sourcePath,
    subtitle:
      subtitleParts.length > 0
        ? subtitleParts.join(' | ')
        : PINNED_ITEM_FALLBACK_SUBTITLE,
    title,
  };
}

function extractCleanPrice(row: HTMLElement): string | null {
  // Prefer structured data-field elements — same source equivalentPricings uses,
  // avoids "Asking Price:" labels and "Fee:" text the site injects into .price.
  const valueText = row
    .querySelector('[data-field="price"] > br + span')
    ?.textContent?.trim();
  const currencyName = row
    .querySelector('[data-field="price"] .currency-text span')
    ?.textContent?.trim();

  if (valueText && currencyName) {
    return normalizePinnedText(`${valueText}×${currencyName}`);
  }

  // Fallback: clone the element so we can strip our own injected nodes before reading.
  const priceEl =
    row.querySelector<HTMLElement>('.price .price-tag') ??
    row.querySelector<HTMLElement>('.price') ??
    row.querySelector<HTMLElement>('.listing-price');
  if (!priceEl) return null;

  const clone = priceEl.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.btff-equivalent-pricings').forEach((el) => el.remove());
  return normalizePinnedText(clone.textContent ?? null);
}

function extractChaosEquivalent(row: HTMLElement): number | null {
  const chaosEl = row.querySelector<HTMLElement>('.btff-equivalent-pricings-chaos');
  if (!chaosEl) return null;
  // textContent is "=NNNx[img-alt]" — extract just the digits/decimal
  const raw = chaosEl.textContent?.replace(/[^0-9.]/g, '').trim();
  const value = raw ? Number.parseFloat(raw) : NaN;
  return Number.isNaN(value) ? null : value;
}

function findItemImageUrl(row: HTMLElement) {
  const image =
    row.querySelector<HTMLImageElement>('.left .icon img') ??
    row.querySelector<HTMLImageElement>('.left img') ??
    row.querySelector<HTMLImageElement>('.image img') ??
    row.querySelector<HTMLImageElement>('img');
  return image?.src ?? null;
}

function findCurrencyIconUrl(row: HTMLElement) {
  return (
    row.querySelector<HTMLImageElement>('[data-field="price"] .currency-image img')
      ?.src ?? null
  );
}

export function getPinnedItemDisplayTitle(title: string): string {
  const normalizedTitle = normalizePinnedText(title);
  if (isPinnedItemPlaceholderTitle(normalizedTitle)) {
    return PINNED_ITEM_FALLBACK_TITLE;
  }

  return normalizedTitle ?? PINNED_ITEM_FALLBACK_TITLE;
}

function isPinnedItemPlaceholderTitle(title: string | null) {
  if (!title) return true;
  return (
    title === PINNED_ITEM_FALLBACK_TITLE ||
    /^Pinned result(?:\s|$)/i.test(title)
  );
}

function normalizePinnedText(value: string | null) {
  if (!value) return null;

  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return null;

  return compact
    .replaceAll('Ã—', '×')
    .replaceAll('Â·', '·')
    .replaceAll('â€¢', '•')
    .replaceAll('â€”', '—')
    .replaceAll('â€“', '–');
}

function findRows(root: ParentNode = document) {
  return Array.from(
    root.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]'),
  );
}

function findText(root: ParentNode, selectors: string[]) {
  for (const selector of selectors) {
    const text = root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
    if (text) return text;
  }

  return null;
}

export const PINNED_ROW_CLASS = PINNED_CLASS;
export const PINNED_ROW_GLOW_CLASS = PINNED_GLOW_CLASS;
