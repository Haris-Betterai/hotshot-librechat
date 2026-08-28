export const STAFF_BASE = '/staff';
export const STAFF_LOGIN_STORAGE_KEY = 'lc-staff-login';

export function isStaffPath(pathname: string = currentPathname()): boolean {
  return pathname === STAFF_BASE || pathname.startsWith(`${STAFF_BASE}/`);
}

export function markStaffLoginIntent(): void {
  try {
    sessionStorage.setItem(STAFF_LOGIN_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearStaffLoginIntent(): void {
  try {
    sessionStorage.removeItem(STAFF_LOGIN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Staff wall is URL `?staff=1` or `/staff`. The session flag only counts on /login or /staff — not on /c/new after Back. */
export function wantsStaffLogin(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  pathname: string = currentPathname(),
): boolean {
  if (new URLSearchParams(search).has('staff')) {
    return true;
  }

  const onStaffAuthSurface = isStaffPath(pathname) || /^\/login(\/|$)/.test(pathname);
  if (!onStaffAuthSurface) {
    clearStaffLoginIntent();
    return false;
  }

  try {
    return sessionStorage.getItem(STAFF_LOGIN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function viewPath(path: string, pathname: string = currentPathname()): string {
  const [pathnamePart, search = ''] = path.split('?');
  const normalized = pathnamePart.startsWith('/') ? pathnamePart : `/${pathnamePart}`;
  const suffix = search ? `?${search}` : '';

  if (
    normalized === STAFF_BASE ||
    normalized.startsWith(`${STAFF_BASE}/`) ||
    normalized.startsWith('/login') ||
    normalized.startsWith('/embed') ||
    normalized.startsWith('/oauth') ||
    normalized.startsWith('/share')
  ) {
    return `${normalized}${suffix}`;
  }

  if (isStaffPath(pathname)) {
    return `${STAFF_BASE}${normalized}${suffix}`;
  }

  return `${normalized}${suffix}`;
}

export function chatPath(conversationId: string, pathname?: string): string {
  return viewPath(`/c/${conversationId}`, pathname);
}

export function staffHomePath(): string {
  return `${STAFF_BASE}/c/new`;
}

export function publicHomePath(): string {
  return '/c/new';
}

export function isChatConversationPath(pathname: string, conversationId: string): boolean {
  return pathname === `/c/${conversationId}` || pathname === `/staff/c/${conversationId}`;
}

function currentPathname(): string {
  if (typeof window === 'undefined') {
    return '/';
  }
  return window.location.pathname;
}
