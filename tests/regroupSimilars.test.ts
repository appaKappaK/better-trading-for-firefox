// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { createRegroupSimilarsController } from '../src/content/regroupSimilars';

describe('regroupSimilars enhancer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('hides consecutive similar rows behind a single toggle button', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Superior Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-3', 'SellerTwo', 'Hubris Circlet', 'Exact Price: 3 Divine Orb')}
      </div>
    `;

    const controller = createRegroupSimilarsController(document);

    const groupedCount = controller.apply(document);

    expect(groupedCount).toBe(1);
    expect(document.querySelectorAll('.bt-group-button')).toHaveLength(1);
    expect(document.querySelector<HTMLElement>('[data-id="row-2"]')?.getAttribute('bt-regroup-state')).toBe('hidden');
    expect(document.querySelector<HTMLElement>('[data-id="row-1"] .bt-group-button')?.textContent).toContain('Show 1 similar');
  });

  it('toggles a consecutive group visible and hidden again', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Superior Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;

    const controller = createRegroupSimilarsController(document);
    controller.apply(document);

    document.querySelector<HTMLButtonElement>('.bt-group-button')?.click();

    expect(document.querySelector<HTMLElement>('[data-id="row-2"]')?.getAttribute('bt-regroup-state')).toBe('visible');
    expect(document.querySelector<HTMLButtonElement>('.bt-group-button')?.textContent).toContain('Hide 1 similar');

    document.querySelector<HTMLButtonElement>('.bt-group-button')?.click();

    expect(document.querySelector<HTMLElement>('[data-id="row-2"]')?.getAttribute('bt-regroup-state')).toBe('hidden');
    expect(document.querySelector<HTMLButtonElement>('.bt-group-button')?.textContent).toContain('Show 1 similar');
  });

  it('does not merge non-consecutive runs that happen to share the same hash', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerTwo', 'Hubris Circlet', 'Exact Price: 3 Divine Orb')}
        ${buildRowMarkup('row-3', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;

    const controller = createRegroupSimilarsController(document);

    const groupedCount = controller.apply(document);

    expect(groupedCount).toBe(0);
    expect(document.querySelectorAll('.bt-group-button')).toHaveLength(0);
    expect(document.querySelector<HTMLElement>('[data-id="row-3"]')?.hasAttribute('bt-regroup-state')).toBe(false);
  });

  it('clears regroup buttons and hidden rows when disabled', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Superior Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;

    const controller = createRegroupSimilarsController(document);
    controller.apply(document);

    controller.clear(document);
    controller.reset();

    expect(document.querySelectorAll('.bt-group-button')).toHaveLength(0);
    expect(document.querySelector<HTMLElement>('[data-id="row-2"]')?.hasAttribute('bt-regroup-state')).toBe(false);
  });
});

function buildRowMarkup(
  rowId: string,
  sellerSlug: string,
  itemName: string,
  priceText: string,
) {
  return `
    <div class="row" data-id="${rowId}">
      <div class="middle">
        <div class="itemName itemHeader"><span class="lc">${itemName}</span></div>
      </div>
      <div class="right">
        <div class="details">
          <div class="price">${priceText}</div>
          <div class="btns"></div>
        </div>
      </div>
      <div class="profile-link">
        <a href="/account/view-profile/${sellerSlug}">${sellerSlug}</a>
      </div>
    </div>
  `;
}
