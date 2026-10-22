import { memo, useEffect, useState } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import { useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { OrbState } from 'thinking-orbs';

type EmbedOrbProps = {
  size?: number;
  className?: string;
  /** A fixed state; without one, a large animated orb cycles through its states. */
  state?: OrbState;
  /** Defaults to still below 40px so avatars and menus stay calm. */
  paused?: boolean;
};

/** Smallest rendered size that uses the detailed 64px preset. */
const DETAIL_MIN = 30;
const ANIMATE_MIN = 40;
/** The globe is drawn slightly larger than its slot so it reads at avatar size. */
const BLEED = 1.2;
const CYCLE: OrbState[] = ['searching', 'breathing', 'composing', 'working'];
const CYCLE_MS = 3500;

const stateAt = (step: number): OrbState =>
  CYCLE[((step % CYCLE.length) + CYCLE.length) % CYCLE.length];

/** Advances a step counter on an interval while enabled. */
function useCycleStep(enabled: boolean): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const id = setInterval(() => setStep((n) => n + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, [enabled]);
  return step;
}

/** Black dots on light surfaces; the library's light ink takes over in dark mode. */
function EmbedOrb({ size = 32, className, state, paused }: EmbedOrbProps) {
  const reduceMotion = useReducedMotion() === true;
  const still = paused ?? size < ANIMATE_MIN;
  const cycling = state == null && !still && !reduceMotion;
  const step = useCycleStep(cycling);

  const drawn = Math.round(size * BLEED);
  const offset = (size - drawn) / 2;
  const preset = drawn >= DETAIL_MIN ? 64 : 20;
  const layer: CSSProperties = {
    position: 'absolute',
    top: offset,
    left: offset,
    width: drawn,
    height: drawn,
  };
  const ink = 'brightness-[0.2] transition-opacity duration-500 dark:brightness-100';

  if (!cycling) {
    /** Small orbs are drawn twice: their translucent dots wash out at avatar size. */
    const copies = size < ANIMATE_MIN ? [0, 1] : [0];
    return (
      <span
        className={`relative inline-block shrink-0 ${className ?? ''}`}
        style={{ width: size, height: size }}
        data-testid="embed-orb"
      >
        {copies.map((copy) => (
          <ThinkingOrb
            key={copy}
            state={state ?? 'searching'}
            size={preset}
            paused={still}
            aria-hidden="true"
            className={ink}
            style={layer}
          />
        ))}
      </span>
    );
  }

  /** Two slots take turns: the slot holding the newest state fades in over the other. */
  const evenActive = step % 2 === 0;
  const even = stateAt(evenActive ? step : step - 1);
  const odd = stateAt(evenActive ? step - 1 : step);
  return (
    <span
      className={`relative inline-block shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
      data-testid="embed-orb"
    >
      <ThinkingOrb
        state={even}
        size={preset}
        aria-hidden="true"
        className={ink}
        style={{ ...layer, opacity: evenActive ? 1 : 0 }}
      />
      <ThinkingOrb
        state={odd}
        size={preset}
        aria-hidden="true"
        className={ink}
        style={{ ...layer, opacity: evenActive ? 0 : 1 }}
      />
    </span>
  );
}

export default memo(EmbedOrb);
