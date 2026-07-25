import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const popupCss = readFileSync(
  new URL('../entrypoints/popup/App.css', import.meta.url),
  'utf8',
);
const popupSource = readFileSync(
  new URL('../entrypoints/popup/App.tsx', import.meta.url),
  'utf8',
);
const bookmarksManagerSource = readFileSync(
  new URL('../src/popup/BookmarksManager.tsx', import.meta.url),
  'utf8',
);
const confirmationDialogSource = readFileSync(
  new URL('../src/popup/ConfirmationDialog.tsx', import.meta.url),
  'utf8',
);

describe('popup interaction layout styles', () => {
  it('contains toolbar-popup scrolling inside the popup surface', () => {
    expect(popupCss).toMatch(
      /\.popup-shell\s*\{[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/s,
    );
  });

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

  it('hides the cursor only while the release-note preview is open', () => {
    expect(popupCss).toMatch(
      /\.popup-update-notice-content\[data-preview-visible='true'\]\s*\{[^}]*cursor:\s*none;/s,
    );
  });

  it('floats the release-note preview without moving the notice actions', () => {
    expect(popupCss).toMatch(
      /\.popup-confirmation-dialog\[data-tone='notice'\]\s*\{[^}]*overflow:\s*visible;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-confirmation-dialog__surface\s*\{[^}]*position:\s*relative;/s,
    );
    expect(popupCss).not.toMatch(
      /\.popup-update-notice-content\s*\{[^}]*position:\s*relative;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-release-notes__preview\s*\{[^}]*position:\s*absolute;[^}]*top:\s*calc\(100% \+ 8px\);[^}]*right:\s*0;[^}]*left:\s*0;/s,
    );
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

  it('uses the larger folder portrait size in the popup manager too', () => {
    expect(popupCss).toMatch(
      /\.popup-folder-icon\s*\{[^}]*width:\s*48px;[^}]*height:\s*37px;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-folder-icon-fallback\s*\{[^}]*width:\s*48px;[^}]*height:\s*37px;/s,
    );
  });

  it('keeps all popup scrollbars hidden until their surface scrolls', () => {
    expect(popupCss).toMatch(
      /\.popup-shell,[^{]*\.popup-shell \[data-transient-scrollbar='true'\]\s*\{[^}]*scrollbar-color:\s*transparent transparent;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-shell\[data-scrolling='true'\],[^{]*\.popup-shell \[data-transient-scrollbar='true'\]\[data-scrolling='true'\]\s*\{[^}]*scrollbar-color:\s*rgba\(/s,
    );
    expect(popupCss).toMatch(
      /\.popup-confirmation-dialog\s*\{[^}]*scrollbar-color:\s*transparent transparent;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-confirmation-dialog\[data-scrolling='true'\]\s*\{[^}]*scrollbar-color:\s*rgba\(/s,
    );
    expect(confirmationDialogSource).toContain(
      'attachTransientScrollbar(dialog)',
    );
  });

  it('keeps long unbroken folder and bookmark names inside popup cards', () => {
    expect(popupSource).toContain('className="popup-trade-copy"');
    expect(popupCss).toMatch(
      /\.popup-records,[^{]*\.popup-record-card,[^{]*\.popup-record-header,[^{]*\.popup-record-copy,[^{]*\.popup-trade-list,[^{]*\.popup-trade-list li,[^{]*\.popup-trade-row,[^{]*\.popup-trade-copy\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*box-sizing:\s*border-box;/s,
    );
    expect(popupCss).toMatch(
      /\.popup-record-header h3,[^{]*\.popup-trade-copy strong\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s,
    );
  });

  it('caps long popup history names at two wrapped lines', () => {
    expect(popupCss).toMatch(
      /\.popup-history-title\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*overflow-wrap:\s*anywhere;[^}]*-webkit-box-orient:\s*vertical;[^}]*-webkit-line-clamp:\s*2;/s,
    );
  });

  it('moves the tabs to the top when the popup header is hidden', () => {
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
