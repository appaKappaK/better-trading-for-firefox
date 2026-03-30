const GROUP_BUTTON_CLASS = 'bt-group-button';
const REGROUP_HASH_ATTRIBUTE = 'bt-regroup-hash';
const REGROUP_STATE_ATTRIBUTE = 'bt-regroup-state';

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
    const rows = clear(root);

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

    groups.forEach(({ count, groupKey, original }) => {
      if (count === 0) return;
      const state = groupStates.get(groupKey) ?? 'hidden';
      injectToggleButton(original, groupKey, count, state);
    });

    return groupedCount;
  }

  function reset() {
    groupStates.clear();
  }

  function clear(root: ParentNode = doc) {
    const rows = Array.from(
      root.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]'),
    );

    rows.forEach((row) => {
      row.removeAttribute(REGROUP_STATE_ATTRIBUTE);
      const existingButton = row.querySelector<HTMLButtonElement>(
        `.${GROUP_BUTTON_CLASS}`,
      );
      existingButton?.remove();
    });

    return rows;
  }

  function injectToggleButton(
    row: HTMLElement,
    groupKey: string,
    count: number,
    state: GroupState,
  ) {
    const button = doc.createElement('button');
    button.classList.add('btn', 'btn-default', GROUP_BUTTON_CLASS);
    button.dataset.count = String(count);
    button.dataset.state = state;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state === 'visible'));
    button.textContent =
      state === 'visible' ? `Hide ${count} similar` : `Show ${count} similar`;
    button.addEventListener('click', () => {
      const nextState: GroupState = state === 'hidden' ? 'visible' : 'hidden';
      groupStates.set(groupKey, nextState);
      apply(doc);
    });

    const actionHost =
      row.querySelector<HTMLElement>('.details .btns') ??
      row.querySelector<HTMLElement>('.details') ??
      row;
    actionHost.append(button);
  }

  return {
    apply,
    clear,
    reset,
  };
}

function resolveGroupKey(row: HTMLElement, hash: string, index: number) {
  const rowId = row.dataset.id ?? `row-${index}`;
  return `${hash}::${rowId}`;
}

function setItemHash(row: HTMLElement) {
  const seller = row
    .querySelector('.profile-link [href]')
    ?.getAttribute('href')
    ?.replace(/^\/account\/view-profile\//, '');
  const itemName = row
    .querySelector('.itemHeader')
    ?.textContent?.replace(/superior/gi, '');
  const price = row.querySelector('.price')?.textContent;
  const rawHash = [seller, itemName, price]
    .filter(Boolean)
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
