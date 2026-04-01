export interface PinnedItemRecord {
  id: string;
  chaosEquivalent?: number | null;
  imageUrl?: string | null;
  pinnedAt: string;
  price: string | null;
  subtitle: string;
  title: string;
}

type Listener = (items: PinnedItemRecord[]) => void;

const PIN_ACTION_HOST_CLASS = 'btff-pin-action-host';
const PIN_BUTTON_CLASS = 'btff-pin-button';
const PINNED_CLASS = 'btff-pinned';
const PINNED_GLOW_CLASS = 'btff-pinned-glow';

export function createPinnedItemsStore(doc: Document = document) {
  const listeners = new Set<Listener>();
  const pinnedItems = new Map<string, PinnedItemRecord>();

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
    syncPinnedRowState(rows);
  }

  function toggleRow(row: HTMLElement) {
    const itemId = row.getAttribute('data-id');
    if (!itemId) return false;

    if (pinnedItems.has(itemId)) {
      pinnedItems.delete(itemId);
    } else {
      pinnedItems.set(itemId, extractPinnedItem(row));
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
    button.textContent = isPinned ? 'Unpin' : 'Pin';
    button.setAttribute('aria-pressed', isPinned ? 'true' : 'false');
  }

  function syncPinnedRowState(rows: HTMLElement[] = findRows()) {
    rows.forEach((row) => {
      const host = resolvePinButtonHost(row);
      const button = host.querySelector<HTMLButtonElement>(`.${PIN_BUTTON_CLASS}`);
      const itemId = row.getAttribute('data-id');
      const isPinned = itemId ? pinnedItems.has(itemId) : false;

      row.classList.toggle(PINNED_CLASS, isPinned);

      if (button) {
        button.textContent = isPinned ? 'Unpin' : 'Pin';
        button.setAttribute('aria-pressed', isPinned ? 'true' : 'false');
      }
    });
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
    getItems,
    scrollToItem,
    subscribe,
    toggleRow,
    unpin,
  };
}

function extractPinnedItem(row: HTMLElement): PinnedItemRecord {
  const itemId = row.getAttribute('data-id');
  if (!itemId) {
    throw new Error('Pinned rows must expose a data-id attribute.');
  }

  const title =
    normalizePinnedText(
      findText(row, [
        '.itemName .itemHeader',
        '.itemName',
        '.details .title',
        '.middle .itemLevel',
      ]),
    ) ?? `Pinned result ${itemId}`;
  const price = extractCleanPrice(row);
  const subtitleParts = [
    normalizePinnedText(findText(row, ['.itemLevel'])),
    normalizePinnedText(findText(row, ['.details .account', '.account'])),
  ]
    .map((value) => normalizePinnedText(value))
    .filter(Boolean);

  return {
    id: itemId,
    chaosEquivalent: extractChaosEquivalent(row),
    imageUrl: findItemImageUrl(row),
    pinnedAt: new Date().toISOString(),
    price,
    subtitle:
      subtitleParts.length > 0
        ? subtitleParts.join(' | ')
        : 'Pinned from the current trade results.',
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
    row.querySelector<HTMLImageElement>('.left img') ??
    row.querySelector<HTMLImageElement>('.image img') ??
    row.querySelector<HTMLImageElement>('img');
  return image?.src ?? null;
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
