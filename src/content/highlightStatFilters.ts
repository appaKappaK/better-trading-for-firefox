const SEARCHED_STAT_CLASS = 'bt-highlight-stat-filters';
const MODS_SELECTOR = '.explicitMod,.pseudoMod,.implicitMod';
const SEARCHED_STATS_SELECTOR =
  '.filter-group-body .filter:not(.disabled) .filter-title';
const SEARCH_PANEL_SELECTOR = '.search-advanced-pane';

export function applyHighlightStatFilters(root: ParentNode = document) {
  const modElements = Array.from(
    root.querySelectorAll<HTMLElement>(MODS_SELECTOR),
  );

  modElements.forEach((modElement) => {
    modElement.classList.remove(SEARCHED_STAT_CLASS);
  });

  const statNeedles = collectStatNeedles(root);

  if (statNeedles.length === 0) {
    return 0;
  }

  let highlightedCount = 0;

  modElements.forEach((modElement) => {
    const modText = modElement.textContent?.trim() ?? '';
    if (!modText) return;

    const normalizedText = modText.toLowerCase();
    if (!statNeedles.some((needle) => needle.test(normalizedText))) return;

    modElement.classList.add(SEARCHED_STAT_CLASS);
    highlightedCount++;
  });

  return highlightedCount;
}

export function clearHighlightStatFilters(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLElement>(MODS_SELECTOR)
    .forEach((modElement) => modElement.classList.remove(SEARCHED_STAT_CLASS));
}

function collectStatNeedles(root: ParentNode) {
  const searchPanels = Array.from(
    root.querySelectorAll<HTMLElement>(SEARCH_PANEL_SELECTOR),
  );
  const statsPanel = searchPanels.at(-1);

  if (!statsPanel) {
    return [];
  }

  const statElements = Array.from(
    statsPanel.querySelectorAll<HTMLElement>(SEARCHED_STATS_SELECTOR),
  );

  return statElements
    .map((element) => normalizeStatFilter(element.innerText || element.textContent || ''))
    .filter((value): value is string => value.length > 0)
    .map((value) => createStatNeedle(value));
}

function normalizeStatFilter(rawStat: string) {
  return rawStat.trim().toLowerCase().replace(/^pseudo /, '');
}

function createStatNeedle(stat: string) {
  return new RegExp(escapeRegex(stat).replace(/#/g, '[\\+\\-]?\\d+'), 'i');
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
