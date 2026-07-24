// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  createRegroupSimilarsController,
  REGROUP_SIMILARS_HOST_PAGE_STYLES,
} from '../src/content/regroupSimilars';

describe('regroupSimilars enhancer', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('provides host-page styles that visually hide grouped result rows', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Superior Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = REGROUP_SIMILARS_HOST_PAGE_STYLES;
    document.head.append(style);

    createRegroupSimilarsController(document).apply(document);

    const groupedRow = document.querySelector<HTMLElement>('[data-id="row-2"]');
    expect(groupedRow?.getAttribute('bt-regroup-state')).toBe('hidden');
    expect(getComputedStyle(groupedRow!).display).toBe('none');
  });

  it('reuses its toggle button when unchanged results are enhanced again', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Superior Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;
    const controller = createRegroupSimilarsController(document);

    controller.apply(document);
    const originalButton = document.querySelector('.bt-group-button');
    controller.apply(document);

    expect(document.querySelector('.bt-group-button')).toBe(originalButton);
  });

  it('does not create child-list mutations when unchanged results are enhanced again', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Superior Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;
    const controller = createRegroupSimilarsController(document);
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { childList: true, subtree: true });

    controller.apply(document);
    observer.takeRecords();
    controller.apply(document);

    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
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

  it('does not group rows when the seller identity is unavailable', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', '', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', '', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;

    const groupedCount = createRegroupSimilarsController(document).apply(document);

    expect(groupedCount).toBe(0);
    expect(document.querySelectorAll('.bt-group-button')).toHaveLength(0);
  });

  it('preserves group state when equivalent-price decorations are refreshed', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Vaal Regalia', 'Exact Price: 50 Chaos Orb')}
      </div>
    `;
    const controller = createRegroupSimilarsController(document);
    controller.apply(document);
    document.querySelector<HTMLButtonElement>('.bt-group-button')?.click();

    document.querySelectorAll('.price').forEach((price) => {
      price.insertAdjacentHTML(
        'beforeend',
        '<span class="btff-equivalent-pricings">=0.3 Divine Orb</span>',
      );
    });
    controller.apply(document);

    expect(
      document
        .querySelector<HTMLElement>('[data-id="row-2"]')
        ?.getAttribute('bt-regroup-state'),
    ).toBe('visible');
  });

  it('does not regroup bulk-exchange rows', () => {
    document.body.innerHTML = `
      <div class="resultset">
        ${buildRowMarkup('row-1', 'SellerOne', 'Divine Orb', '1 for 150 Chaos Orb', 'exchange')}
        ${buildRowMarkup('row-2', 'SellerOne', 'Divine Orb', '1 for 150 Chaos Orb', 'exchange')}
      </div>
    `;

    const groupedCount = createRegroupSimilarsController(document).apply(document);

    expect(groupedCount).toBe(0);
    expect(document.querySelectorAll('.bt-group-button')).toHaveLength(0);
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
  extraClass = '',
) {
  return `
    <div class="row ${extraClass}" data-id="${rowId}">
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
        ${sellerSlug ? `<a href="/account/view-profile/${sellerSlug}">${sellerSlug}</a>` : '<span>Unknown seller</span>'}
      </div>
    </div>
  `;
}
