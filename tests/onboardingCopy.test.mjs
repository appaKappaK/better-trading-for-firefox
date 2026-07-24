import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const popupSource = readFileSync(
  new URL('../entrypoints/popup/App.tsx', import.meta.url),
  'utf8',
);

describe('first-run flow', () => {
  it('opens Import without rendering or enforcing an onboarding notice', () => {
    expect(popupSource).not.toContain(
      'Import a legacy backup or start fresh to begin.',
    );
    expect(popupSource).not.toContain('ONBOARDING_FEEDBACK');
    expect(popupSource).not.toContain('popup-status__dismiss');
    expect(popupSource).not.toContain('handleContinueWithoutImport');
    expect(popupSource).not.toContain('disabled={needsOnboarding');
    expect(popupSource).not.toContain('needsOnboarding: boolean');
    expect(popupSource).not.toContain("'Start fresh'");
    expect(popupSource).not.toContain("'Continue without import'");
    expect(popupSource).toMatch(
      /hasLoadedInitialSchemaRef[\s\S]*hasCompletedOnboarding\s*\?\s*'bookmarks'\s*:\s*'import'/,
    );
    expect(popupSource).toMatch(
      /!nextSchema\.preferences\.hasCompletedOnboarding[\s\S]*completeStoredOnboarding\(\)/,
    );
  });
});
