const DEFAULT_SEARCH_COUNT = 5;
const MAX_SEARCH_COUNT = 10;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const BRAVE_SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

const SEARCH_CACHE = new Map();

function normalizeCacheKey(value) {
  return value.toLowerCase().trim();
}

function readCache(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function writeCache(cache, key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function resolveApiKey(systemConfig) {
  const fromSettings = systemConfig?.web?.search?.brave_api_key;
  if (typeof fromSettings === 'string' && fromSettings.trim()) {
    return fromSettings.trim();
  }
  const fromEnv = (process.env.BRAVE_API_KEY || '').trim();
  return fromEnv || undefined;
}

function resolveSearchCount(value, fallback) {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(1, Math.min(MAX_SEARCH_COUNT, Math.floor(parsed)));
}

function resolveSiteName(url) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function withTimeout(signal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

export async function runWebSearch(input) {
  const query = typeof input?.query === 'string' ? input.query.trim() : '';
  if (!query) {
    return { error: 'query is required' };
  }

  const apiKey = resolveApiKey(input?.systemConfig);
  if (!apiKey) {
    return {
      error: 'missing_brave_api_key',
      message:
        'web_search needs a Brave Search API key. Add system.web.search.brave_api_key to settings.json or set BRAVE_API_KEY in the gateway environment.',
      instructions:
        'Open Settings → Web Search, paste your Brave API key, and save. Then retry.',
      docs: 'https://api.search.brave.com/'
    };
  }

  const count = resolveSearchCount(input?.count, DEFAULT_SEARCH_COUNT);
  const country = typeof input?.country === 'string' ? input.country.trim() : '';
  const search_lang = typeof input?.search_lang === 'string' ? input.search_lang.trim() : '';

  const cacheKey = normalizeCacheKey(
    `brave:${query}:${count}:${country || 'default'}:${search_lang || 'default'}`
  );
  const cached = readCache(SEARCH_CACHE, cacheKey);
  if (cached) return { ...cached.value, cached: true };

  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  if (country) {
    url.searchParams.set('country', country);
  }
  if (search_lang) {
    url.searchParams.set('search_lang', search_lang);
  }

  const timeoutMs = Number.isFinite(input?.timeout_ms) ? input.timeout_ms : DEFAULT_TIMEOUT_MS;
  const timeout = withTimeout(undefined, timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey
      },
      signal: timeout.signal
    });

    if (!res.ok) {
      const detail = await res.text();
      return { error: `Brave Search API error (${res.status}): ${detail || res.statusText}` };
    }

    const data = await res.json();
    const results = Array.isArray(data?.web?.results) ? data.web.results : [];
    const mapped = results.map((entry) => ({
      title: entry?.title ?? '',
      url: entry?.url ?? '',
      description: entry?.description ?? '',
      published: entry?.age ?? undefined,
      siteName: resolveSiteName(entry?.url ?? '')
    }));

    const payload = {
      query,
      provider: 'brave',
      count: mapped.length,
      tookMs: Date.now() - start,
      results: mapped
    };
    writeCache(SEARCH_CACHE, cacheKey, payload, DEFAULT_CACHE_TTL_MS);
    return payload;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  } finally {
    timeout.cancel();
  }
}
