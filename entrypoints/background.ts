import {
  createChaosRatiosCacheEntry,
  parseChaosRatios,
  readValidChaosRatiosCacheEntry,
  type PoeNinjaChaosRatios,
  type PoeNinjaCurrenciesPayload,
} from '@/src/lib/poeNinja/chaosRatios';

const POE_NINJA_API_ROOT = 'https://poe.ninja/api';
const POE_NINJA_PING_URL =
  `${POE_NINJA_API_ROOT}/data/currencyoverview?league=Standard&type=Currency`;
const POE_NINJA_CACHE_PREFIX = 'btff-poe-ninja-chaos-ratios:';
const POE_NINJA_CACHE_TTL_MS = 60 * 60 * 1000;

interface PoeNinjaPingResponse {
  durationMs: number;
  error?: string;
  fetchedAt: string;
  lineCount?: number;
  ok: boolean;
}

interface PoeNinjaChaosRatiosResponse {
  error?: string;
  fetchedAt?: string;
  ok: boolean;
  ratios?: PoeNinjaChaosRatios;
  source?: 'cache' | 'network';
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    console.log('Better Trading for Firefox background ready.', {
      id: browser.runtime.id,
    });
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === 'btff:poe-ninja-ping') {
      return pingPoeNinja();
    }

    if (message?.type === 'btff:poe-ninja-chaos-ratios') {
      return fetchChaosRatios(message.league);
    }

    return undefined;
  });
});

async function pingPoeNinja(): Promise<PoeNinjaPingResponse> {
  const startedAt = Date.now();

  try {
    const response = await fetch(POE_NINJA_PING_URL, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`poe.ninja responded with ${response.status}`);
    }

    const payload = (await response.json()) as { lines?: unknown[] };

    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      fetchedAt: new Date().toISOString(),
      lineCount: Array.isArray(payload.lines) ? payload.lines.length : 0,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchChaosRatios(
  league: string,
): Promise<PoeNinjaChaosRatiosResponse> {
  const cacheKey = `${POE_NINJA_CACHE_PREFIX}${league}`;
  const cachedResult = await browser.storage.local.get(cacheKey);
  const cachedEntry = readValidChaosRatiosCacheEntry(cachedResult[cacheKey]);

  if (cachedEntry) {
    return {
      ok: true,
      fetchedAt: cachedEntry.fetchedAt,
      ratios: cachedEntry.value,
      source: 'cache',
    };
  }

  try {
    const payload = await fetchPoeNinjaPayload(
      `/data/currencyoverview?type=Currency&league=${encodeURIComponent(league)}`,
    );
    const ratios = parseChaosRatios(payload);
    const cacheEntry = createChaosRatiosCacheEntry(ratios, POE_NINJA_CACHE_TTL_MS);

    await browser.storage.local.set({
      [cacheKey]: cacheEntry,
    });

    return {
      ok: true,
      fetchedAt: cacheEntry.fetchedAt,
      ratios,
      source: 'network',
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchPoeNinjaPayload(resource: string) {
  const response = await fetch(`${POE_NINJA_API_ROOT}${resource}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`poe.ninja responded with ${response.status}`);
  }

  return (await response.json()) as PoeNinjaCurrenciesPayload;
}
