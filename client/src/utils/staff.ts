export const STAFF_BASE = '/staff';

export function isStaffPath(pathname: string = currentPathname()): boolean {
  return pathname === STAFF_BASE || pathname.startsWith(`${STAFF_BASE}/`);
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
