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
const DETAIL_MIN = 24;
const ANIMATE_MIN = 40;

function EmbedOrb({ size = 32, className, state = 'searching', paused }: EmbedOrbProps) {
  return (
    <ThinkingOrb
      state={state}
      size={size >= DETAIL_MIN ? 64 : 20}
      paused={paused ?? size < ANIMATE_MIN}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size }}
      data-testid="embed-orb"
    />
  );
}

export default memo(EmbedOrb);
