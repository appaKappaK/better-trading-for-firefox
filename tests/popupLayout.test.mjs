import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const popupCss = readFileSync(
  new URL('../entrypoints/popup/App.css', import.meta.url),
  'utf8',
);

describe('popup interaction layout styles', () => {
  it('centers every button label in both axes', () => {
    expect(popupCss).toMatch(
      /\.popup-button\s*\{[^}]*box-sizing:\s*border-box;[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*min-height:\s*34px;[^}]*border:\s*1px solid transparent;[^}]*font-family:\s*inherit;[^}]*line-height:\s*1;[^}]*text-align:\s*center;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-button--small\s*\{[^}]*min-height:\s*30px;/s,
    );
  });

  it('keeps destructive confirmations fixed in the visible popup viewport', () => {
    expect(popupCss).toMatch(
      /\.popup-confirmation-dialog\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s,
    );
    expect(popupCss).toMatch(/\.popup-confirmation-dialog::backdrop\s*\{/s);
  });

  it('anchors history pill rows left while centering each label internally', () => {
    expect(popupCss).toMatch(
      /\.popup-history-pills\s*\{[^}]*justify-content:\s*flex-start;[^}]*\}\s*\.popup-history-pill\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*text-align:\s*center;/s,
    );
  });

  it('distinguishes unavailable buttons from actions that are actually busy', () => {
    expect(popupCss).toMatch(
      /\.popup-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-button\[aria-busy='true'\]\s*\{[^}]*cursor:\s*progress;/s,
    );
  });

  it('uses a restrained danger palette instead of a bright alert red', () => {
    expect(popupCss).toMatch(
      /\.popup-button--danger\s*\{[^}]*border:\s*1px solid rgba\(151, 78, 68, 0\.48\);[^}]*color:\s*#e7cbc5;[^}]*background:\s*linear-gradient\(180deg, #67362f, #472621\);/s,
    );
  });

  it('does not retain styling for the removed onboarding notice action', () => {
    expect(popupCss).not.toContain('.popup-status__dismiss');
  });

  it('gives popup actions consistent focus, press, and motion-safe feedback', () => {
    expect(popupCss).toMatch(
      /\.popup-shell button:focus-visible,[^{]*\.popup-link-button:focus-visible\s*\{[^}]*outline:\s*2px solid/s,
    );
    expect(popupCss).toMatch(
      /\.popup-shell button:active:not\(:disabled\)\s*\{[^}]*transform:\s*translateY\(1px\) scale\(0\.98\);/s,
    );
    expect(popupCss).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
    expect(popupCss).toMatch(/accent-color:\s*#b86e27;/);
  });
});
