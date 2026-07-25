import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const popupCss = readFileSync(
  new URL('../entrypoints/popup/App.css', import.meta.url),
  'utf8',
);
const bookmarksManagerSource = readFileSync(
  new URL('../src/popup/BookmarksManager.tsx', import.meta.url),
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
    expect(popupCss).not.toMatch(/\.popup-confirmation\s*\{/s);
    expect(popupCss).not.toContain('.popup-confirmation--nested');
    expect(popupCss).not.toContain('.popup-confirmation--history');
  });

  it('gives informational notices a neutral fixed-dialog treatment', () => {
    expect(popupCss).toMatch(
      /\.popup-confirmation-dialog\[data-tone='notice'\]\s*\{[^}]*border-color:\s*rgba\(184, 110, 39, 0\.32\);[^}]*background:\s*rgba\(25, 29, 37, 0\.99\);/s,
    );
    expect(popupCss).not.toContain('.popup-update-notice {');
  });

  it('routes legacy bookmark-manager deletions through the shared modal', () => {
    expect(bookmarksManagerSource).toContain(
      "import { ConfirmationDialog } from '@/src/popup/ConfirmationDialog';",
    );
    expect(bookmarksManagerSource).toContain('confirmation="delete-folder"');
    expect(bookmarksManagerSource).toContain('confirmation="delete-trade"');
    expect(bookmarksManagerSource).not.toContain('Confirm delete');
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

  it('caps the folder icon list at the compact 208px viewport', () => {
    expect(popupCss).toMatch(
      /\.btff-folder-icon-picker__options\s*\{[^}]*max-height:\s*208px;/s,
    );
  });

  it('moves the tabs to the top when the popup introduction is hidden', () => {
    expect(popupCss).toMatch(
      /\.popup-shell\[data-popup-intro-hidden='true'\]\s*>\s*\.popup-tabs:first-child\s*\{[^}]*margin-top:\s*0;/s,
    );
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
