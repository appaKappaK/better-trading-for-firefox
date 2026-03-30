import { describe, expect, it } from 'vitest';

import {
  createChaosRatiosCacheEntry,
  parseChaosRatios,
  readValidChaosRatiosCacheEntry,
} from '../src/lib/poeNinja/chaosRatios';

describe('poe.ninja chaos ratios helpers', () => {
  it('parses currency payload lines into slugged chaos ratios', () => {
    const ratios = parseChaosRatios({
      lines: [
        {
          currencyTypeName: 'Divine Orb',
          chaosEquivalent: 150,
        },
        {
          currencyTypeName: 'Chaos Orb',
          chaosEquivalent: 1,
        },
      ],
    });

    expect(ratios['divine-orb']).toBe(150);
    expect(ratios['chaos-orb']).toBe(1);
  });

  it('returns only unexpired cache entries', () => {
    const cached = createChaosRatiosCacheEntry(
      {
        'divine-orb': 150,
      },
      60_000,
      1_000,
    );

    expect(readValidChaosRatiosCacheEntry(cached, 30_000)?.value['divine-orb']).toBe(150);
    expect(readValidChaosRatiosCacheEntry(cached, 120_000)).toBeNull();
  });
});
