import { memo } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import type { OrbState } from 'thinking-orbs';

type EmbedOrbProps = {
  size?: number;
  className?: string;
  state?: OrbState;
  /** Defaults to still below 40px so avatars and menus stay calm. */
  paused?: boolean;
};

/** Smallest rendered size that uses the detailed 64px preset. */
const DETAIL_MIN = 30;
const ANIMATE_MIN = 40;
/** The globe is drawn slightly larger than its slot so it reads at avatar size. */
const BLEED = 1.2;

/** Black dots on light surfaces; the library's light ink takes over in dark mode. */
function EmbedOrb({ size = 32, className, state = 'searching', paused }: EmbedOrbProps) {
  const drawn = Math.round(size * BLEED);
  const offset = (size - drawn) / 2;
  return (
    <span
      className={`relative inline-block shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
      data-testid="embed-orb"
    >
      <ThinkingOrb
        state={state}
        size={drawn >= DETAIL_MIN ? 64 : 20}
        paused={paused ?? size < ANIMATE_MIN}
        aria-hidden="true"
        className="brightness-[0.2] dark:brightness-100"
        style={{ position: 'absolute', top: offset, left: offset, width: drawn, height: drawn }}
      />
    </span>
  );
}

export default memo(EmbedOrb);
