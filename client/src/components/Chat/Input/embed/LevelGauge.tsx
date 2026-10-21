import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useLocalize } from '~/hooks';

type LevelGaugeProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  /** Readable name of the current level. */
  name: string;
  /** 0 to 1 position of the current level. */
  fraction: number;
  open: boolean;
};

const CENTER = 12;
const RADIUS = 9;
const START_DEG = 135;
const SWEEP_DEG = 270;

const point = (deg: number, radius: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
};

const [arcStartX, arcStartY] = point(START_DEG, RADIUS);
const [arcEndX, arcEndY] = point(START_DEG + SWEEP_DEG, RADIUS);
const ARC = `M ${arcStartX} ${arcStartY} A ${RADIUS} ${RADIUS} 0 1 1 ${arcEndX} ${arcEndY}`;

/** Round speedometer button: a 270 degree arc filled up to the current level, with a needle. */
const LevelGauge = forwardRef<HTMLButtonElement, LevelGaugeProps>(function LevelGauge(
  { name, fraction, open, className, ...props },
  ref,
) {
  const localize = useLocalize();
  const clamped = Math.min(1, Math.max(0, fraction));
  const [needleX, needleY] = point(START_DEG + SWEEP_DEG * clamped, RADIUS - 3.5);
  const label = `${localize('com_ui_embed_level_label')}: ${name}`;

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${className ?? ''}`}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
        <path
          d={ARC}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {clamped > 0 && (
          <path
            d={ARC}
            pathLength={100}
            stroke="var(--embed-brand, #3b6cf6)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${clamped * 100} 100`}
          />
        )}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={needleX}
          y2={needleY}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={CENTER} cy={CENTER} r="1.6" fill="currentColor" />
      </svg>
    </button>
  );
});

export default LevelGauge;
