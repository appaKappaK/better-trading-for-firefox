import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contentEntrypoint = readFileSync(
  new URL('../entrypoints/content.tsx', import.meta.url),
  'utf8',
);

describe('bookmark league persistence wiring', () => {
  it('stores the current league when saving or updating a bookmark search', () => {
    expect(
      contentEntrypoint.match(/league:\s*snapshot\.tradeLocation\.league/g),
    ).toHaveLength(2);
  });
});
