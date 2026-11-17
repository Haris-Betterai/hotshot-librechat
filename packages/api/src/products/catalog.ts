import { logger } from '@librechat/data-schemas';
import { isStoreProductUrl } from 'librechat-data-provider';
import type { CatalogProduct, ProductCatalog } from 'librechat-data-provider';

const DEFAULT_CATALOG_URL = 'https://mcp.hotshot.thebetterai.com/catalog';
const CACHE_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;
/** After a failed first load, chats skip the catalog for this long instead of waiting again. */
const FAILURE_BACKOFF_MS = 60 * 1000;
const MAX_TEXT = 200;

/** What the tool server's `/catalog` route returns. */
type RawCatalog = {
  updated_at?: number | null;
  products?: Array<Partial<Record<keyof CatalogProduct, unknown>>>;
};

export type LoadedCatalog = {
  catalog: ProductCatalog;
  byUrl: ReadonlyMap<string, CatalogProduct>;
};

let cached: { value: LoadedCatalog; at: number } | null = null;
let inFlight: Promise<LoadedCatalog> | null = null;
let failedAt = 0;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_TEXT) : null;

const httpsUrl = (value: unknown): string | null => {
  const url = text(value);
  return url?.startsWith('https://') ? url : null;
};

function toPriceOptions(value: unknown): CatalogProduct['price_options'] {
  if (!Array.isArray(value)) {
    return null;
  }
  const options = value
    .map((entry: { option?: unknown; price?: unknown }) => ({
      option: text(entry?.option) ?? '',
      price: text(entry?.price),
    }))
    .filter((entry) => entry.option);
  return options.length > 0 ? options : null;
}

function toProduct(raw: Partial<Record<keyof CatalogProduct, unknown>>): CatalogProduct | null {
  const title = text(raw.title);
  if (!title || !isStoreProductUrl(raw.url)) {
    return null;
  }
  return {
    title,
    url: raw.url,
    image: httpsUrl(raw.image),
    price: text(raw.price),
    price_options: toPriceOptions(raw.price_options),
    sku: text(raw.sku),
    category: text(raw.category) ?? 'Other',
  };
}

/** Keeps only well-formed store products, so nothing else reaches the panel or the prompt. */
export function normalizeCatalog(raw: RawCatalog): LoadedCatalog {
  const byUrl = new Map<string, CatalogProduct>();
  for (const entry of raw.products ?? []) {
    const product = entry ? toProduct(entry) : null;
    if (product && !byUrl.has(product.url)) {
      byUrl.set(product.url, product);
    }
  }
  const dropped = (raw.products?.length ?? 0) - byUrl.size;
  if (dropped > 0) {
    logger.debug(`[products] Skipped ${dropped} catalog entries without a valid store link`);
  }
  const updatedAt =
    typeof raw.updated_at === 'number' ? new Date(raw.updated_at * 1000).toISOString() : null;
  return { catalog: { products: [...byUrl.values()], updatedAt }, byUrl };
}

async function fetchCatalog(): Promise<LoadedCatalog> {
  const url = process.env.HOTSHOT_CATALOG_URL || DEFAULT_CATALOG_URL;
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Catalog request failed with ${response.status}`);
  }
  return normalizeCatalog((await response.json()) as RawCatalog);
}

/**
 * The store catalog from the tool server, cached for 10 minutes per process. Concurrent
 * callers share one request; when a refresh fails the last good copy is served.
 */
export async function loadCatalog(): Promise<LoadedCatalog> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.value;
  }
  if (!cached && !inFlight && Date.now() - failedAt < FAILURE_BACKOFF_MS) {
    throw new Error('Catalog unavailable (recent failure)');
  }
  if (!inFlight) {
    inFlight = fetchCatalog()
      .then((value) => {
        cached = { value, at: Date.now() };
        failedAt = 0;
        return value;
      })
      .catch((error) => {
        if (cached) {
          logger.warn('[products] Catalog refresh failed; serving the last copy', error);
          return cached.value;
        }
        failedAt = Date.now();
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** The catalog product for a pinned URL, or null when it isn't a known product. */
export async function findCatalogProduct(url: unknown): Promise<CatalogProduct | null> {
  if (!isStoreProductUrl(url)) {
    return null;
  }
  const { byUrl } = await loadCatalog();
  return byUrl.get(url) ?? null;
}

/** Test hook: forget the cached catalog. */
export function resetCatalogCache(): void {
  cached = null;
  inFlight = null;
  failedAt = 0;
}
