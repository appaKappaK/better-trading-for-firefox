// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyMaximumSocketWarnings,
  detectTradePageVersion,
} from '../src/content/tradePage';

describe('tradePage spike helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/trade/search/Standard');
  });

  it('detects PoE 1 and PoE 2 trade paths', () => {
    expect(detectTradePageVersion('/trade/search/Standard')).toBe('poe1');
    expect(detectTradePageVersion('/trade2/search/poe2/Standard')).toBe('poe2');
    expect(detectTradePageVersion('/foo')).toBe('unknown');
  });

  it('adds a maximum sockets warning to qualifying PoE 1 body armours', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="phase0-row" class="row">
          <div class="left">
            <div class="itemRendered"></div>
            <div class="icon">
              <img src="https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/Fancy.png" alt="">
              <div class="sockets">
                <span class="socket"></span>
                <span class="socket"></span>
              </div>
            </div>
          </div>
          <div class="middle">
            <div class="itemLevel">Item Level: 80</div>
          </div>
        </div>
      </div>
    `;

    const warningCount = applyMaximumSocketWarnings(document);

    expect(warningCount).toBe(1);
    expect(document.querySelector('.btff-phase0-maximum-sockets')?.textContent).toContain('Max 6 sockets');
  });

  it('does not add warnings on PoE 2 pages', () => {
    window.history.replaceState({}, '', '/trade2/search/poe2/Standard');

    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="phase0-row" class="row">
          <div class="left">
            <div class="itemRendered"></div>
            <div class="icon">
              <img src="https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/Fancy.png" alt="">
              <div class="sockets">
                <span class="socket"></span>
                <span class="socket"></span>
              </div>
            </div>
          </div>
          <div class="middle">
            <div class="itemLevel">Item Level: 80</div>
          </div>
        </div>
      </div>
    `;

    const warningCount = applyMaximumSocketWarnings(document);

    expect(warningCount).toBe(0);
    expect(document.querySelector('.btff-phase0-maximum-sockets')).toBeNull();
  });

  it('removes socket warnings when the enhancer is disabled', () => {
    document.body.innerHTML = `
      <div class="resultset">
        <div data-id="phase0-row" class="row">
          <div class="left">
            <div class="itemRendered">
              <div class="btff-phase0-maximum-sockets">Old warning</div>
            </div>
            <div class="icon">
              <img src="https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/Fancy.png" alt="">
              <div class="sockets">
                <span class="socket"></span>
                <span class="socket"></span>
              </div>
            </div>
          </div>
          <div class="middle">
            <div class="itemLevel">Item Level: 80</div>
          </div>
        </div>
      </div>
    `;

    const warningCount = applyMaximumSocketWarnings(document, false);

    expect(warningCount).toBe(0);
    expect(document.querySelector('.btff-phase0-maximum-sockets')).toBeNull();
  });
});
