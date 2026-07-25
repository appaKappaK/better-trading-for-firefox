import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const panelCss = readFileSync(
  new URL('../src/content/panel.css', import.meta.url),
  'utf8',
);
const panelSource = readFileSync(
  new URL('../src/content/Phase0Panel.tsx', import.meta.url),
  'utf8',
);

describe('in-page panel density styles', () => {
  it('lets the history layout own spacing instead of inheriting trade-row margins', () => {
    expect(panelCss).toMatch(
      /\.btff-history-time,\s*\.btff-history-pill\s*\{[^}]*margin-top:\s*0;/s,
    );
  });

  it('sets compact history padding and line heights explicitly', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__history-item\s*>\s*\.btff-panel__trade-link\s*\{[^}]*padding:\s*8px 10px;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-history-entry-header strong\s*\{[^}]*line-height:\s*16px;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-history-pill\s*\{[^}]*line-height:\s*12px;/s,
    );
  });

  it('gives pinned item artwork a modest size increase', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__pinned-thumb\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;/s,
    );
  });

  it('sizes pinned prices near seller text with a clearer currency icon', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__pinned-price\s*\{[^}]*font-size:\s*13px;[^}]*line-height:\s*16px;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-price-icon\s*\{[^}]*width:\s*16px;[^}]*height:\s*16px;/s,
    );
  });

  it('moves list scrollbars outside the aligned card surfaces and leaves drag room', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__bookmark-list-scroll,[^{]*\.btff-panel__scroll-area\[data-page='history'\],[^{]*\.btff-panel__scroll-area\[data-page='pinned'\]\s*\{[^}]*padding-left:\s*16px;[^}]*margin-left:\s*-16px;[^}]*padding-right:\s*10px;[^}]*margin-right:\s*-16px;/s,
    );
  });

  it('does not clip the bookmark scrollbar after moving its rail outside the cards', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__scroll-area\[data-page='bookmarks'\]\s*\{[^}]*overflow:\s*visible;/s,
    );
  });

  it('keeps Quick Save outside the capped bookmark list in overlay mode', () => {
    expect(panelSource).toMatch(
      /className="btff-panel__scroll-area"\s+data-page=\{currentPage\}/,
    );
    expect(panelSource).toMatch(
      /className="btff-panel__bookmark-list-scroll"\s+data-transient-scrollbar="true"/,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__bookmark-list-scroll,[^{]*\.btff-panel__scroll-area\[data-page='history'\],[^{]*\.btff-panel__scroll-area\[data-page='pinned'\]\s*\{[^}]*max-height:\s*446px;/s,
    );
    expect(panelCss).toMatch(
      /:host\(\[data-sidebar='true'\]\)\s+\.btff-panel__bookmark-list-scroll,[^{]*:host\(\[data-sidebar='true'\]\)\s+\.btff-panel__scroll-area\[data-page='history'\],[^{]*:host\(\[data-sidebar='true'\]\)\s+\.btff-panel__scroll-area\[data-page='pinned'\]\s*\{[^}]*max-height:\s*none;/s,
    );
  });

  it('separates Quick Save from the bookmark-only scroll surface', () => {
    expect(panelSource).toMatch(
      /<div\s+aria-hidden="true"\s+className="btff-panel__bookmark-divider"/,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__bookmark-divider,[^{]*\.btff-panel__section-divider\s*\{[^}]*height:\s*1px;[^}]*linear-gradient/s,
    );
  });

  it('uses the bookmark separator treatment above pinned, history, and the footer', () => {
    expect(panelSource).toMatch(
      /currentPage !== 'bookmarks'[\s\S]*className="btff-panel__section-divider btff-panel__section-divider--list"/,
    );
    expect(panelSource).toMatch(
      /className="btff-panel__section-divider btff-panel__section-divider--footer"[\s\S]*<section className="btff-panel__footer">/,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__bookmark-divider,[^{]*\.btff-panel__section-divider\s*\{[^}]*height:\s*1px;[^}]*linear-gradient/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__footer\s*\{[^}]*border-top:\s*0;/s,
    );
  });

  it('reveals every in-page scrollbar only while its surface is scrolling', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__scroll-area,[^{]*\.btff-panel \[data-transient-scrollbar='true'\]\s*\{[^}]*scrollbar-color:\s*transparent transparent;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__scroll-area\[data-scrolling='true'\],[^{]*\.btff-panel \[data-transient-scrollbar='true'\]\[data-scrolling='true'\]\s*\{[^}]*scrollbar-color:\s*rgba\(/s,
    );
  });

  it('fills the available compact header height with larger folder portraits', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__folder-icon\s*\{[^}]*width:\s*48px;[^}]*height:\s*37px;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__folder-icon-fallback\s*\{[^}]*width:\s*48px;[^}]*height:\s*37px;/s,
    );
  });

  it('keeps long unbroken folder and bookmark names inside their cards', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__records,[^{]*\.btff-panel__record,[^{]*\.btff-panel__record-header,[^{]*\.btff-panel__record-toggle,[^{]*\.btff-panel__trade-list,[^{]*\.btff-panel__trade-row,[^{]*\.btff-panel__trade-link\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*box-sizing:\s*border-box;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__record-title-row strong\s*\{[^}]*flex:\s*1 1 auto;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__trade-title\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s,
    );
  });

  it('caps long in-page history names at two wrapped lines', () => {
    expect(panelCss).toMatch(
      /\.btff-history-entry-header strong\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*overflow-wrap:\s*anywhere;[^}]*-webkit-box-orient:\s*vertical;[^}]*-webkit-line-clamp:\s*2;/s,
    );
  });

  it('makes the full Quick Save header card part of its toggle hit area', () => {
    expect(panelSource).toMatch(
      /className="btff-panel__composer-body"/,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__composer\s*\{[^}]*padding:\s*0;[^}]*overflow:\s*hidden;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__composer-toggle\s*\{[^}]*min-height:\s*40px;[^}]*padding:\s*8px 12px;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__composer-body\s*\{[^}]*padding:\s*0 12px 12px;/s,
    );
  });

  it('lifts reordered bookmark cards without growing them into the clipped edges', () => {
    const liftedCardRule = panelCss.match(
      /\.btff-panel__record\[data-reorder-source='true'\]\s*\{[^}]*\}/s,
    )?.[0];

    expect(liftedCardRule).toContain(
      'transform: translate3d(0, var(--btff-folder-drag-y, 0), 0);',
    );
    expect(liftedCardRule).not.toContain('scale(');
    expect(liftedCardRule).toContain('0 10px 18px -8px rgba(0, 0, 0, 0.34)');
  });

  it('anchors history pill rows left while centering each label internally', () => {
    expect(panelCss).toMatch(
      /\.btff-history-pills\s*\{[^}]*justify-content:\s*flex-start;[^}]*\}\s*\.btff-history-pill\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*text-align:\s*center;/s,
    );
  });

  it('uses square outer corners when the panel is docked as a sidebar', () => {
    expect(panelCss).toMatch(
      /:host\(\[data-sidebar='true'\]\) \.btff-panel\s*\{[^}]*border-radius:\s*0;/s,
    );
  });

  it('gives panel actions keyboard focus and pressed feedback', () => {
    expect(panelCss).toMatch(
      /\.btff-panel button:focus-visible,[^{]*\.btff-panel-dock button:focus-visible,[^{]*\{[^}]*outline:\s*2px solid/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel button:active:not\(:disabled\)\s*\{[^}]*transform:\s*translateY\(1px\) scale\(0\.98\);/s,
    );
    expect(panelCss).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
  });

  it('marks completed bookmark names with a muted red X instead of a strikethrough', () => {
    expect(panelCss).not.toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\][^{]*\{[^}]*text-decoration:\s*line-through;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::before,[^{]*\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::after\s*\{[^}]*inset:\s*-1px -2px;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::before\s*\{[^}]*background:\s*linear-gradient\(\s*to bottom right,[^;]*#c85a4a/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::after\s*\{[^}]*background:\s*linear-gradient\(\s*to bottom left,[^;]*#c85a4a/s,
    );
    expect(panelCss).not.toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::before,[^{]*\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::after\s*\{[^}]*width:\s*20px;/s,
    );
    expect(panelCss).not.toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title\s*\{[^}]*opacity:/s,
    );
  });

  it('gives every name-color choice a 24px pointer target', () => {
    expect(panelCss).toMatch(
      /\.btff-name-color-picker__option\s*\{[^}]*min-width:\s*24px;[^}]*min-height:\s*24px;/s,
    );
  });

  it('caps the folder icon list at the compact 208px viewport', () => {
    expect(panelCss).toMatch(
      /\.btff-folder-icon-picker__options\s*\{[^}]*max-height:\s*208px;/s,
    );
  });

  it('draws the folder reorder destination inside the scrollable list bounds', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__reorder-slot\s*\{[^}]*position:\s*absolute;[^}]*inset-inline:\s*0;[^}]*box-sizing:\s*border-box;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__reorder-slot\s*\{[^}]*transform:\s*translate3d\(0,\s*var\(--btff-folder-slot-y\),\s*0\);/s,
    );
    expect(panelCss).not.toMatch(
      /\.btff-panel__record\[data-reorder-edge='(?:before|after)'\][^{]*\{[^}]*(?:top|bottom):\s*-\d+px;/s,
    );
  });

  it('uses the pinned card surface as its reorder affordance', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__pinned-item\s*\{[^}]*cursor:\s*grab;[^}]*touch-action:\s*none;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__pinned-item\[data-reorder-source='true'\]\s*\{[^}]*cursor:\s*grabbing;/s,
    );
  });

  it('lifts reordered pinned cards without enlarging their clipped layout box', () => {
    const liftedPinnedRule = panelCss.match(
      /\.btff-panel__pinned-item\[data-reorder-source='true'\]\s*\{[^}]*\}/s,
    )?.[0];

    expect(liftedPinnedRule).toContain(
      'transform: translate3d(0, var(--btff-folder-drag-y, 0), 0);',
    );
    expect(liftedPinnedRule).not.toContain('scale(');
    expect(liftedPinnedRule).toContain(
      '0 10px 18px -8px rgba(0, 0, 0, 0.34)',
    );
  });
});
