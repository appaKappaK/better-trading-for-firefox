import { describe, expect, it } from 'vitest';

import {
  formatTradeLeagueLabel,
  getTradeUrl,
  normalizeTradeLeague,
  parseTradeLocationFromPathname,
} from '../src/lib/trade/location';

describe('trade location helpers', () => {
  it('parses encoded multi-word leagues into readable text', () => {
    expect(
      parseTradeLocationFromPathname(
        '/trade/search/HC%20LANDMINED%20GSF%20(PL80003)/EB04ajr4S5',
      ),
    ).toMatchObject({
      version: '1',
      type: 'search',
      league: 'HC LANDMINED GSF (PL80003)',
      slug: 'EB04ajr4S5',
      isLive: false,
    });
  });

  it('round-trips decoded leagues back into encoded trade URLs', () => {
    expect(
      getTradeUrl({
        version: '1',
        type: 'search',
        league: 'HC LANDMINED GSF (PL80003)',
        slug: 'EB04ajr4S5',
      }),
    ).toBe(
      'https://www.pathofexile.com/trade/search/HC%20LANDMINED%20GSF%20(PL80003)/EB04ajr4S5',
    );
  });

  it('decodes percent-encoded league names only once', () => {
    expect(normalizeTradeLeague('%25 Delirious')).toBe('% Delirious');
    expect(normalizeTradeLeague(normalizeTradeLeague('%25 Delirious'))).toBe(
      '% Delirious',
    );
    expect(normalizeTradeLeague('100% Delirious')).toBe('100% Delirious');
  });

  it('round-trips realm-prefixed trade paths without extra slashes', () => {
    const location = parseTradeLocationFromPathname(
      '/trade2/search/poe2/HC%20Mirage/abc123/live',
    );

    expect(location).toMatchObject({
      version: '2',
      type: 'search',
      league: 'poe2/HC Mirage',
      slug: 'abc123',
      isLive: true,
    });
    expect(
      getTradeUrl({
        version: '2',
        type: 'search',
        league: 'poe2/HC Mirage',
        slug: 'abc123',
      }, '/live'),
    ).toBe('https://www.pathofexile.com/trade2/search/poe2/HC%20Mirage/abc123/live');
  });

  it('formats realm-prefixed leagues for human-facing labels', () => {
    expect(formatTradeLeagueLabel('poe2/Fate of the Vaal')).toBe(
      'PoE2 - Fate of the Vaal',
    );
    expect(formatTradeLeagueLabel('poe2/HC Fate of the Vaal')).toBe(
      'PoE2 - HC Fate of the Vaal',
    );
    expect(formatTradeLeagueLabel('HC LANDMINED GSF (PL80003)')).toBe(
      'HC LANDMINED GSF (PL80003)',
    );
  });
});
