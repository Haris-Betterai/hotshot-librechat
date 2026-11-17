import { useCallback, useMemo, useState } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';

const storageKey = (userId?: string) => `hotshot:starredProducts:${userId ?? 'anon'}`;

function readStarred(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === 'string') : [];
  } catch {
    return [];
  }
}

/** "My products": the products an employee starred, kept in this browser per user. */
export default function useStarredProducts() {
  const { user } = useAuthContext();
  const key = storageKey(user?.id);
  const [starred, setStarred] = useState<string[]>(() => readStarred(key));
  const starredSet = useMemo(() => new Set(starred), [starred]);

  const toggleStar = useCallback(
    (url: string) => {
      setStarred((prev) => {
        const next = prev.includes(url) ? prev.filter((entry) => entry !== url) : [...prev, url];
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* storage unavailable: keep the in-memory list */
        }
        return next;
      });
    },
    [key],
  );

  return { starred: starredSet, toggleStar };
}
