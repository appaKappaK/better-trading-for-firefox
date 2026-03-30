// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyHighlightStatFilters,
  clearHighlightStatFilters,
} from '../src/content/highlightStatFilters';

describe('highlightStatFilters enhancer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('highlights matching explicit and pseudo mods from active search filters', () => {
    document.body.innerHTML = `
      <section class="search-advanced-pane">
        <div class="filter-group-body">
          <div class="filter">
            <div class="filter-title">Pseudo +#% total Elemental Resistance</div>
          </div>
          <div class="filter">
            <div class="filter-title">+# to maximum Life</div>
          </div>
        </div>
      </section>

      <div class="resultset">
        <div class="row" data-id="row-1">
          <div class="explicitMod">+98 to maximum Life</div>
          <div class="pseudoMod">+37% total Elemental Resistance</div>
          <div class="implicitMod">Adds 5 to 10 Fire Damage</div>
        </div>
      </div>
    `;

    const highlightedCount = applyHighlightStatFilters(document);

    expect(highlightedCount).toBe(2);
    expect(document.querySelector('.explicitMod')?.classList.contains('bt-highlight-stat-filters')).toBe(true);
    expect(document.querySelector('.pseudoMod')?.classList.contains('bt-highlight-stat-filters')).toBe(true);
    expect(document.querySelector('.implicitMod')?.classList.contains('bt-highlight-stat-filters')).toBe(false);
  });

  it('clears old highlights when there are no active stat filters', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div class="row" data-id="row-1">
          <div class="explicitMod bt-highlight-stat-filters">+98 to maximum Life</div>
        </div>
      </div>
    `;

    const highlightedCount = applyHighlightStatFilters(document);

    expect(highlightedCount).toBe(0);
    expect(document.querySelector('.explicitMod')?.classList.contains('bt-highlight-stat-filters')).toBe(false);
  });

  it('can clear existing highlights when the enhancer is disabled', () => {
    document.body.innerHTML = `
      <section class="search-advanced-pane">
        <div class="filter-group-body">
          <div class="filter">
            <div class="filter-title">+# to maximum Life</div>
          </div>
        </div>
      </section>

      <div class="resultset">
        <div class="row" data-id="row-1">
          <div class="explicitMod bt-highlight-stat-filters">+98 to maximum Life</div>
        </div>
      </div>
    `;

    clearHighlightStatFilters(document);

    expect(document.querySelector('.explicitMod')?.classList.contains('bt-highlight-stat-filters')).toBe(false);
  });
});
