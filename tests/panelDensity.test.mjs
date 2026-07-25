import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const panelCss = readFileSync(
  new URL('../src/content/panel.css', import.meta.url),
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

  it('lets in-page list surfaces align with the tab row', () => {
    expect(panelCss).toMatch(
      /\.btff-panel__scroll-area\s*\{[^}]*padding-right:\s*0;[^}]*margin-right:\s*0;/s,
    );
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
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::before,[^{]*\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::after\s*\{[^}]*background:\s*#c85a4a;/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::before\s*\{[^}]*rotate\(45deg\);/s,
    );
    expect(panelCss).toMatch(
      /\.btff-panel__trade-row\[data-completed='true'\] \.btff-panel__trade-title::after\s*\{[^}]*rotate\(-45deg\);/s,
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
});
