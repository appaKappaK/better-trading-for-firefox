import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const popupSource = readFileSync(
  new URL('../entrypoints/popup/App.tsx', import.meta.url),
  'utf8',
);

describe('first-run guidance', () => {
  it('describes an empty library without presenting setup as a reset', () => {
    expect(popupSource).not.toContain(
      'Import a legacy backup or start fresh to begin.',
    );
    expect(popupSource).toContain(
      'Import a legacy backup from the Import tab, or dismiss this notice to continue without importing.',
    );
    expect(popupSource).not.toContain("'Start fresh'");
    expect(popupSource).not.toContain("'Continue without import'");
    expect(popupSource).toContain(
      'aria-label="Dismiss and continue without import"',
    );
    expect(popupSource).toContain(
      'className="popup-button popup-button--secondary popup-button--small popup-status__dismiss"',
    );
    expect(popupSource).toMatch(
      /popup-status__dismiss[\s\S]*onClick=\{\(\) => void handleContinueWithoutImport\(\)\}[\s\S]*Dismiss/,
    );
  });
});
