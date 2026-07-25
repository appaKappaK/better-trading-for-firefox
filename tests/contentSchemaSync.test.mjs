import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contentEntrypoint = readFileSync(
  new URL('../entrypoints/content.tsx', import.meta.url),
  'utf8',
);

describe('content schema synchronization', () => {
  it('shows the loading replacement only before the first schema is available', () => {
    expect(contentEntrypoint).toMatch(
      /const shouldShowSchemaLoading = schema === null;/,
    );
    expect(contentEntrypoint).toMatch(
      /if \(shouldShowSchemaLoading\) \{\s*isSchemaLoading = true;\s*render\(\);\s*\}/s,
    );
    expect(contentEntrypoint).toMatch(
      /if \(shouldShowSchemaLoading\) \{\s*isSchemaLoading = false;\s*render\(\);\s*\}/s,
    );
  });
});
