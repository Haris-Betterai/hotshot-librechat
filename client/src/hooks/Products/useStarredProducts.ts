import { useCallback, useMemo, useState } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';

const storageKey = (userId?: string) => `hotshot:starredProducts:${userId ?? 'anon'}`;

function readStarred(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((url): url is string => typeof url === 'string');
  } catch {
    return [];
  }
}

function writeStarred(key: string, urls: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(urls));
  } catch {
    /* storage unavailable: the list lasts for this session only */
  }
}

/** "My products": the products an employee starred, kept in this browser per user. */
export default function useStarredProducts() {
  const { user } = useAuthContext();
  const key = storageKey(user?.id);
  const [state, setState] = useState(() => ({ key, urls: readStarred(key) }));
  const urls = state.key === key ? state.urls : readStarred(key);
  const starred = useMemo(() => new Set(urls), [urls]);

  const toggleStar = useCallback(
    (url: string) => {
      const next = urls.includes(url) ? urls.filter((entry) => entry !== url) : [...urls, url];
      writeStarred(key, next);
      setState({ key, urls: next });
    },
    [key, urls],
  );

  return { starred, toggleStar };
}
