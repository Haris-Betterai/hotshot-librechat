import { atomWithStorage } from 'jotai/utils';

/** Developer view: Decisions API results under answers and the card catalog. Per browser. */
export const devModeAtom = atomWithStorage<boolean>('hotshot:devMode', false, undefined, {
  getOnInit: true,
});
