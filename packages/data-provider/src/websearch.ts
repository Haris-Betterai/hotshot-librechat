export const MAX_WEB_SEARCH_DOMAINS = 20;
export const SUGGESTED_WEB_SEARCH_DOMAIN = 'hotshotsecret.com';

const HOSTNAME_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function splitDomains(input: unknown): string[] {
  return typeof input === 'string' ? input.split(/[\s,]+/) : [];
}

/**
 * Normalises a domain allow-list for OpenAI's `web_search` tool filter.
 * Accepts an array or a comma/whitespace separated string, keeps only bare
 * lowercase hostnames (no scheme, path or port), dedupes, and caps at 20.
 */
export function parseWebSearchDomains(input: unknown): string[] {
  const entries: unknown[] = Array.isArray(input) ? input : splitDomains(input);
  const seen = new Set<string>();
  for (const entry of entries) {
    if (typeof entry !== 'string') {
      continue;
    }
    const host = entry.trim().toLowerCase();
    if (!HOSTNAME_PATTERN.test(host)) {
      continue;
    }
    seen.add(host);
    if (seen.size === MAX_WEB_SEARCH_DOMAINS) {
      break;
    }
  }
  return Array.from(seen);
}
