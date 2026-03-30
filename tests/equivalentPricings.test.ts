// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { applyEquivalentPricings } from '../src/content/equivalentPricings';

describe('equivalentPricings enhancer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds divine equivalence for valuable chaos prices', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="chaos-row" class="row">
          <div class="right">
            <div class="details">
              <div class="price">
                <span data-field="price" class="s sorted sorted-asc">
                  <span class="price-label fixed-price">Exact Price:</span><br>
                  <span>100</span><span>x</span>
                  <span class="currency-text currency-image">
                    <img src="https://example.com/chaos.png" alt="chaos">
                    <span>Chaos Orb</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const count = applyEquivalentPricings(document, 'poe1', {
      'divine-orb': 150,
    });

    expect(count).toBe(1);
    expect(document.querySelector('.btff-equivalent-pricings-chaos')?.textContent).toContain(
      '=0.7x',
    );
  });

  it('adds chaos equivalence and a fractional remainder for non-chaos prices', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="divine-row" class="row">
          <div class="right">
            <div class="details">
              <div class="price">
                <span data-field="price" class="s sorted sorted-asc">
                  <span class="price-label fixed-price">Exact Price:</span><br>
                  <span>1.1</span><span>x</span>
                  <span class="currency-text currency-image">
                    <img src="https://example.com/divine.png" alt="divine">
                    <span>Divine Orb</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const count = applyEquivalentPricings(document, 'poe1', {
      'divine-orb': 150,
    });

    expect(count).toBe(1);
    expect(document.querySelector('.btff-equivalent-pricings-chaos')?.textContent).toContain(
      '=165x',
    );
    expect(
      document.querySelector('.btff-equivalent-pricings-chaos-fraction')?.textContent,
    ).toContain('=1x+15x');
  });

  it('clears pricing decorations when the page is unsupported', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="divine-row" class="row">
          <div class="right">
            <div class="details">
              <div class="price">
                <span data-field="price" class="s sorted sorted-asc">
                  <span class="price-label fixed-price">Exact Price:</span><br>
                  <span>1</span><span>x</span>
                  <span class="currency-text currency-image">
                    <img src="https://example.com/divine.png" alt="divine">
                    <span>Divine Orb</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    applyEquivalentPricings(document, 'poe1', {
      'divine-orb': 150,
    });
    expect(document.querySelector('.btff-equivalent-pricings')).not.toBeNull();

    const count = applyEquivalentPricings(document, 'poe2', null);

    expect(count).toBe(0);
    expect(document.querySelector('.btff-equivalent-pricings')).toBeNull();
  });
});
