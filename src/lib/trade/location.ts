import type { TradeSiteVersion } from '../../features/bookmarks/types';

const BASE_URL = 'https://www.pathofexile.com';
const TRADE_REALMS = new Set(['xbox', 'sony', 'poe2']);
const ENCODED_SEGMENT_REGEX = /%(?:[0-9a-fA-F]{2})/;
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

export interface ParsedTradeLocation {
  version: TradeSiteVersion;
  type: string;
  league: string;
  slug: string;
  isLive: boolean;
}

export function parseTradeLocationFromPathname(
  pathname: string,
): ParsedTradeLocation | null {
  const pathParts = pathname.split('/').filter(Boolean);
  const [versionPart, type, rawLeague, rawSlug, rawLive] = pathParts;

  if (!versionPart || !type) return null;
  if (versionPart !== 'trade' && versionPart !== 'trade2') return null;

  if (rawLeague && TRADE_REALMS.has(rawLeague)) {
    const realmLeague = rawSlug;
    const slug = pathParts[4];
    const live = pathParts[5];

    if (!realmLeague || !slug) return null;

    return {
      version: versionPart === 'trade2' ? '2' : '1',
      type,
      league: `${rawLeague}/${normalizeTradePathSegment(realmLeague)}`,
      slug,
      isLive: live === 'live',
    };
  }

  if (!rawLeague || !rawSlug) return null;

  return {
    version: versionPart === 'trade2' ? '2' : '1',
    type,
    league: normalizeTradeLeague(rawLeague),
    slug: rawSlug,
    isLive: rawLive === 'live',
  };
}

export function getTradeUrl(
  location: Pick<ParsedTradeLocation, 'version' | 'type' | 'league' | 'slug'>,
  suffix = '',
) {
  const tradeRoot = location.version === '2' ? 'trade2' : 'trade';
  return [
    BASE_URL,
    tradeRoot,
    location.type,
    ...getTradeLeaguePathSegments(location.league),
    location.slug,
  ].join('/') + suffix;
}

export function compareTradeLocations(
  left: Pick<ParsedTradeLocation, 'version' | 'type' | 'league' | 'slug'>,
  right: Pick<ParsedTradeLocation, 'version' | 'type' | 'league' | 'slug'>,
) {
  return (
    left.version === right.version &&
    left.type === right.type &&
    left.league === right.league &&
    left.slug === right.slug
  );
}

export function formatTradeLocationLabel(
  location: Pick<ParsedTradeLocation, 'type' | 'league' | 'slug'>,
) {
  return [location.type, location.league, location.slug].join('/');
}

export function formatTradeHistoryFallbackLabel(
  location: Pick<ParsedTradeLocation, 'type' | 'slug'>,
) {
  if (location.type === 'search') return 'Empty search';

  return [location.type, location.slug].join('/');
}

export function normalizeTradeLeague(league: string) {
  const realmSeparatorIndex = league.indexOf('/');
  if (realmSeparatorIndex > 0) {
    const realm = league.slice(0, realmSeparatorIndex);
    const realmLeague = league.slice(realmSeparatorIndex + 1);
    if (TRADE_REALMS.has(realm) && realmLeague) {
      return `${realm}/${normalizeTradePathSegment(realmLeague)}`;
    }
  }

  return normalizeTradePathSegment(league);
}

export function formatTradeLeagueLabel(league: string) {
  const normalizedLeague = normalizeTradeLeague(league);
  const realmSeparatorIndex = normalizedLeague.indexOf('/');
  if (realmSeparatorIndex <= 0) {
    return normalizedLeague;
  }

  const realm = normalizedLeague.slice(0, realmSeparatorIndex);
  const realmLeague = normalizedLeague.slice(realmSeparatorIndex + 1);
  if (!TRADE_REALMS.has(realm) || !realmLeague) {
    return normalizedLeague;
  }

  if (realm === 'poe2') {
    return `PoE2 - ${realmLeague}`;
  }

  return `${capitalizeRealm(realm)} - ${realmLeague}`;
}

export function normalizeTradePathSegment(value: string) {
  if (!ENCODED_SEGMENT_REGEX.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function encodeTradePathSegment(value: string) {
  return encodeURIComponent(value)
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
}

function getTradeLeaguePathSegments(league: string) {
  const normalizedLeague = normalizeTradeLeague(league);
  const realmSeparatorIndex = normalizedLeague.indexOf('/');
  if (realmSeparatorIndex > 0) {
    const realm = normalizedLeague.slice(0, realmSeparatorIndex);
    const realmLeague = normalizedLeague.slice(realmSeparatorIndex + 1);
    if (TRADE_REALMS.has(realm) && realmLeague) {
      return [realm, encodeTradePathSegment(realmLeague)];
    }
  }

  return [encodeTradePathSegment(normalizedLeague)];
}

function capitalizeRealm(realm: string) {
  return realm.charAt(0).toUpperCase() + realm.slice(1);
}

export function formatRelativeTimestamp(timestamp: string, now = Date.now()) {
  const deltaMs = new Date(timestamp).getTime() - now;

  if (!Number.isFinite(deltaMs)) return 'unknown time';

  const deltaSeconds = Math.round(deltaMs / 1000);
  const absoluteSeconds = Math.abs(deltaSeconds);

  if (absoluteSeconds < 60) {
    return relativeTimeFormatter.format(deltaSeconds, 'second');
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) {
    return relativeTimeFormatter.format(deltaMinutes, 'minute');
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return relativeTimeFormatter.format(deltaHours, 'hour');
  }

  const deltaDays = Math.round(deltaHours / 24);
  return relativeTimeFormatter.format(deltaDays, 'day');
}
