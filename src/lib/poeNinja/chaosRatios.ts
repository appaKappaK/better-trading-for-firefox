export interface PoeNinjaCurrenciesPayloadLine {
  chaosEquivalent: number;
  currencyTypeName: string;
}

export interface PoeNinjaCurrenciesPayload {
  lines: PoeNinjaCurrenciesPayloadLine[];
}

export interface PoeNinjaChaosRatios {
  [key: string]: number;
}

export interface PoeNinjaChaosRatiosCacheEntry {
  expiresAt: string;
  fetchedAt: string;
  value: PoeNinjaChaosRatios;
}

export function parseChaosRatios(
  payload: PoeNinjaCurrenciesPayload,
): PoeNinjaChaosRatios {
  return payload.lines.reduce((ratios, line) => {
    ratios[slugify(line.currencyTypeName)] = line.chaosEquivalent;
    return ratios;
  }, {} as PoeNinjaChaosRatios);
}

export function createChaosRatiosCacheEntry(
  value: PoeNinjaChaosRatios,
  ttlMs: number,
  now = Date.now(),
): PoeNinjaChaosRatiosCacheEntry {
  return {
    expiresAt: new Date(now + ttlMs).toISOString(),
    fetchedAt: new Date(now).toISOString(),
    value,
  };
}

export function readValidChaosRatiosCacheEntry(
  value: unknown,
  now = Date.now(),
): PoeNinjaChaosRatiosCacheEntry | null {
  if (!isRecord(value)) return null;
  if (!isRecord(value.value)) return null;
  if (typeof value.expiresAt !== 'string' || typeof value.fetchedAt !== 'string') {
    return null;
  }

  const expiresAt = new Date(value.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || now > expiresAt) return null;

  return {
    expiresAt: value.expiresAt,
    fetchedAt: value.fetchedAt,
    value: value.value as PoeNinjaChaosRatios,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^-\w]/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
