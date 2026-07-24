const GROUP_BUTTON_CLASS = 'bt-group-button';
const REGROUP_HASH_ATTRIBUTE = 'bt-regroup-hash';
const REGROUP_STATE_ATTRIBUTE = 'bt-regroup-state';

export const REGROUP_SIMILARS_HOST_PAGE_STYLES = `
  div.row[bt-regroup-state='hidden'] {
    display: none !important;
  }
  div.row[bt-regroup-state='visible'] {
    background: rgba(16, 16, 16, 0.8) !important;
  }
  .bt-group-button {
    margin-left: 8px;
  }
`;

type GroupState = 'hidden' | 'visible';
type SimilarGroup = {
  count: number;
  groupKey: string;
  hash: string;
  original: HTMLElement;
};

export function createRegroupSimilarsController(doc: Document = document) {
  const groupStates = new Map<string, GroupState>();

  function apply(root: ParentNode = doc) {
    const rows = collectRows(root);
    rows.forEach((row) => row.removeAttribute(REGROUP_STATE_ATTRIBUTE));

    let previousHash: string | null = null;
    let currentGroup: SimilarGroup | null = null;
    let groupedCount = 0;
    const groups: SimilarGroup[] = [];

    rows.forEach((row, index) => {
      const hash = setItemHash(row);
      if (!hash) {
        previousHash = null;
        currentGroup = null;
        return;
      }

      if (currentGroup && previousHash === hash) {
        const state = groupStates.get(currentGroup.groupKey) ?? 'hidden';
        row.setAttribute(REGROUP_STATE_ATTRIBUTE, state);
        currentGroup.count += 1;
        groupedCount++;
        previousHash = hash;
        return;
      }

      previousHash = hash;
      currentGroup = {
        count: 0,
        groupKey: resolveGroupKey(row, hash, index),
        hash,
        original: row,
      };
      groups.push(currentGroup);
    });

    const activeGroupRows = new Set<HTMLElement>();

    groups.forEach(({ count, groupKey, original }) => {
      if (count === 0) return;
      const state = groupStates.get(groupKey) ?? 'hidden';
      activeGroupRows.add(original);
      ensureToggleButton(original, groupKey, count, state);
    });

    rows.forEach((row) => {
      if (activeGroupRows.has(row)) return;
      row.querySelector<HTMLButtonElement>(`.${GROUP_BUTTON_CLASS}`)?.remove();
    });

    return groupedCount;
  }

  function reset() {
    groupStates.clear();
  }

  function clear(root: ParentNode = doc) {
    const rows = collectRows(root);

    rows.forEach((row) => {
      row.removeAttribute(REGROUP_STATE_ATTRIBUTE);
      const existingButton = row.querySelector<HTMLButtonElement>(
        `.${GROUP_BUTTON_CLASS}`,
      );
      existingButton?.remove();
    });

    return rows;
  }

  function ensureToggleButton(
    row: HTMLElement,
    groupKey: string,
    count: number,
    state: GroupState,
  ) {
    let button = row.querySelector<HTMLButtonElement>(`.${GROUP_BUTTON_CLASS}`);

    if (!button) {
      button = doc.createElement('button');
      button.classList.add('btn', 'btn-default', GROUP_BUTTON_CLASS);
      button.type = 'button';
      button.addEventListener('click', (event) => {
        const currentButton = event.currentTarget as HTMLButtonElement;
        const currentGroupKey = currentButton.dataset.groupKey;
        if (!currentGroupKey) return;

        const nextState: GroupState =
          currentButton.dataset.state === 'visible' ? 'hidden' : 'visible';
        groupStates.set(currentGroupKey, nextState);
        apply(doc);
      });

      const actionHost =
        row.querySelector<HTMLElement>('.details .btns') ??
        row.querySelector<HTMLElement>('.details') ??
        row;
      actionHost.append(button);
    }

    button.dataset.count = String(count);
    button.dataset.groupKey = groupKey;
    button.dataset.state = state;
    button.setAttribute('aria-pressed', String(state === 'visible'));
    const label =
      state === 'visible' ? `Hide ${count} similar` : `Show ${count} similar`;
    if (button.textContent !== label) {
      button.textContent = label;
    }
  }

  return {
    apply,
    clear,
    reset,
  };
}

function collectRows(root: ParentNode) {
  return Array.from(
    root.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]'),
  );
}

function resolveGroupKey(row: HTMLElement, hash: string, index: number) {
  const rowId = row.dataset.id ?? `row-${index}`;
  return `${hash}::${rowId}`;
}

function setItemHash(row: HTMLElement) {
  if (row.classList.contains('exchange')) {
    row.removeAttribute(REGROUP_HASH_ATTRIBUTE);
    return null;
  }

  const seller = row
    .querySelector('.profile-link [href]')
    ?.getAttribute('href')
    ?.replace(/^\/account\/view-profile\//, '')
    .trim();
  const itemName = row
    .querySelector('.itemHeader')
    ?.textContent?.replace(/superior/gi, '')
    .trim();
  const priceElement = row.querySelector<HTMLElement>('.price');
  const nativePriceElement = priceElement?.cloneNode(true) as HTMLElement | undefined;
  nativePriceElement
    ?.querySelectorAll('.btff-equivalent-pricings')
    .forEach((element) => element.remove());
  const price = nativePriceElement?.textContent?.trim();

  if (!seller || !itemName || !price) {
    row.removeAttribute(REGROUP_HASH_ATTRIBUTE);
    return null;
  }

  const rawHash = [seller, itemName, price]
    .join('')
    .replace(/\s/g, '')
    .toLowerCase();

  if (!rawHash) {
    row.removeAttribute(REGROUP_HASH_ATTRIBUTE);
    return null;
  }

  const hash = encodeURIComponent(rawHash);
  row.setAttribute(REGROUP_HASH_ATTRIBUTE, hash);
  return hash;
}
