import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const popupSource = readFileSync(
  new URL('../entrypoints/popup/App.tsx', import.meta.url),
  'utf8',
);

describe('first-run guidance', () => {
  it('describes an empty library without presenting setup as a reset', () => {
    expect(popupSource).toContain(
      'Import a legacy backup or continue with an empty bookmark library.',
    );
    expect(popupSource).not.toContain(
      'Import a legacy backup or start fresh to begin.',
    );
  });
});
