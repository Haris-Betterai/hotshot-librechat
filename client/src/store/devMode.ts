import { atomWithStorage } from 'jotai/utils';

const STORAGE_KEY = 'hotshot:devMode';

/**
 * `?dev=1` turns the developer view on and `?dev=0` off. Read when the app loads, because the
 * router drops the query string before the chat view mounts.
 */
const applyDevParam = () => {
  try {
    const value = new URLSearchParams(window.location.search).get('dev');
    if (value === '1' || value === '0') {
      localStorage.setItem(STORAGE_KEY, String(value === '1'));
    }
  } catch {
    return;
  }
};

applyDevParam();

/** Developer view: Decisions API results under answers and the card catalog. Per browser. */
export const devModeAtom = atomWithStorage<boolean>(STORAGE_KEY, false, undefined, {
  getOnInit: true,
});
