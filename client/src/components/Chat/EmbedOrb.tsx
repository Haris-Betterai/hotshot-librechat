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
/** The dotted globe sits inside a dark disc, like the widget launcher. */
const INSET = 0.8;

function EmbedOrb({ size = 32, className, state = 'searching', paused }: EmbedOrbProps) {
  const inner = Math.round(size * INSET);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className ?? ''}`}
      style={{ width: size, height: size, background: '#111827' }}
      data-testid="embed-orb"
    >
      <ThinkingOrb
        state={state}
        theme="dark"
        size={inner >= DETAIL_MIN ? 64 : 20}
        paused={paused ?? size < ANIMATE_MIN}
        aria-hidden="true"
        style={{ width: inner, height: inner, filter: 'brightness(1.6)' }}
      />
    </span>
  );
}

export default memo(EmbedOrb);
