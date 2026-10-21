export const EMBED_WIDGET_STORAGE_KEY = 'lc-embed-widget';
export const EMBED_WIDGET_ID_STORAGE_KEY = 'lc-embed-widget-id';
export const EMBED_WIDGET_SEARCH_PARAM = 'embed';
const EMBED_PATH_ID = /(?:^|\/)embed\/([^/?#]+)/;

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

export function markEmbedWidget(embedId?: string): void {
  try {
    sessionStorage.setItem(EMBED_WIDGET_STORAGE_KEY, '1');
    if (embedId) {
      sessionStorage.setItem(EMBED_WIDGET_ID_STORAGE_KEY, embedId);
    }
  } catch {
    /* ignore */
  }
}

/** The id of the embed widget this iframe was opened for, if known. */
export function getEmbedWidgetId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const fromPath = EMBED_PATH_ID.exec(window.location.pathname)?.[1];
    if (fromPath) {
      return decodeURIComponent(fromPath);
    }
    return sessionStorage.getItem(EMBED_WIDGET_ID_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
