const HOTSHOT_ORB_FILE = 'hotshot-orb.svg';

/** True when an icon URL points at the Hotshot orb, which renders as a live thinking orb. */
export const isHotshotOrb = (iconURL?: string | null): boolean =>
  typeof iconURL === 'string' && iconURL.split('?')[0].endsWith(HOTSHOT_ORB_FILE);
