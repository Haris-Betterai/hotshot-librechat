export const REDIRECT_PARAM = 'redirect_to';
export const SESSION_KEY = 'post_login_redirect_to';

/** Matches `/login` as a full path segment, with optional basename prefix (e.g. `/librechat/login/2fa`) */
const LOGIN_PATH_RE = /(?:^|\/)login(?:\/|$)/;

/** Validates that a redirect target is a safe relative path (not an absolute or protocol-relative URL) */
export function isSafeRedirect(url: string): boolean {
  if (!url.startsWith('/') || url.startsWith('//')) {
    return false;
  }
  const path = url.split('?')[0].split('#')[0];
  return !LOGIN_PATH_RE.test(path);
}

/**
 * Resolves the post-login redirect from URL params and sessionStorage,
 * cleans up both sources, and returns the validated target (or null).
 */
export function getPostLoginRedirect(searchParams: URLSearchParams): string | null {
  const urlRedirect = searchParams.get(REDIRECT_PARAM);
  const storedRedirect = sessionStorage.getItem(SESSION_KEY);

  const target = urlRedirect ?? storedRedirect;

  if (storedRedirect) {
    sessionStorage.removeItem(SESSION_KEY);
  }

  if (target == null || !isSafeRedirect(target)) {
    return null;
  }

  return target;
}

export function persistRedirectToSession(value: string): void {
  if (isSafeRedirect(value)) {
    sessionStorage.setItem(SESSION_KEY, value);
  }
}

export const SHARE_CONTINUE_PARAM = 'continue';

const SHARE_PATH_RE = /^\/share\/([^/?#]+)\/?(?:[?#].*)?$/;

/**
 * For a guest bounced to login from a share page's "Continue this chat", the share page to
 * return to once their guest session exists, marked to continue the chat on arrival.
 */
export function shareContinuePath(redirect: string | null): string | null {
  const shareId = redirect?.match(SHARE_PATH_RE)?.[1];
  if (shareId == null) {
    return null;
  }
  return `/share/${shareId}?${SHARE_CONTINUE_PARAM}=1`;
}
