export const EMBED_WIDGET_STORAGE_KEY = 'lc-embed-widget';
export const EMBED_WIDGET_SEARCH_PARAM = 'embed';

export function isEmbedWidget(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (/(?:^|\/)embed\/[^/]+/.test(window.location.pathname)) {
      return true;
    }
    if (new URLSearchParams(window.location.search).get(EMBED_WIDGET_SEARCH_PARAM) === '1') {
      return true;
    }
    return sessionStorage.getItem(EMBED_WIDGET_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markEmbedWidget(): void {
  try {
    sessionStorage.setItem(EMBED_WIDGET_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}
