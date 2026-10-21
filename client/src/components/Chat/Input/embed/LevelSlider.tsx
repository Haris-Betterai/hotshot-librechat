import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useLocalize } from '~/hooks';

type LevelSliderProps = {
  names: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
};

const THUMB = 22;

const position = (fraction: number): string =>
  `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${fraction})`;

/** Discrete slider: label and level name above, a thin brand track with a ringed thumb, stop names below. */
export default function LevelSlider({ names, selectedIndex, onChange }: LevelSliderProps) {
  const localize = useLocalize();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const last = Math.max(1, names.length - 1);
  const fraction = selectedIndex / last;

  const indexAt = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= THUMB) {
      return selectedIndex;
    }
    const ratio = (clientX - rect.left - THUMB / 2) / (rect.width - THUMB);
    return Math.min(last, Math.max(0, Math.round(ratio * last)));
  };

  const move = (index: number) => {
    if (index !== selectedIndex) {
      onChange(index);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    move(indexAt(event.clientX));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      move(indexAt(event.clientX));
    }
  };

  const endDrag = () => setDragging(false);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const targets: Record<string, number> = {
      ArrowLeft: selectedIndex - 1,
      ArrowDown: selectedIndex - 1,
      ArrowRight: selectedIndex + 1,
      ArrowUp: selectedIndex + 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in targets)) {
      return;
    }
    event.preventDefault();
    move(Math.min(last, Math.max(0, targets[event.key])));
  };

  const motion = dragging
    ? ''
    : 'transition-[left,width] duration-150 ease-out motion-reduce:transition-none';

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
        {localize('com_ui_embed_level_label')}
      </div>
      <div
        className="text-2xl font-bold leading-tight"
        style={{ color: 'var(--embed-brand, #3b6cf6)' }}
        aria-live="polite"
        aria-atomic="true"
      >
        {names[selectedIndex]}
      </div>
      <div
        ref={trackRef}
        className="relative mt-2 h-[22px] w-full touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full opacity-15"
          style={{ background: 'var(--embed-brand, #3b6cf6)' }}
          aria-hidden="true"
        />
        <div
          className={`absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full ${motion}`}
          style={{ width: position(fraction), background: 'var(--embed-brand, #3b6cf6)' }}
          aria-hidden="true"
        />
        {names.map((name, index) =>
          index <= selectedIndex ? null : (
            <span
              key={`${name}-${index}`}
              className="pointer-events-none absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/25 dark:bg-white/30"
              style={{ left: position(index / last) }}
              aria-hidden="true"
            />
          ),
        )}
        <div
          role="slider"
          tabIndex={0}
          aria-label={localize('com_ui_embed_level_label')}
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={selectedIndex}
          aria-valuetext={names[selectedIndex]}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className={`absolute top-0 size-[22px] -translate-x-1/2 cursor-grab rounded-full border-2 bg-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--embed-brand,#3b6cf6)] focus-visible:ring-offset-2 active:cursor-grabbing ${motion}`}
          style={{ left: position(fraction), borderColor: 'var(--embed-brand, #3b6cf6)' }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs" aria-hidden="true">
        {names.map((name, index) => (
          <button
            key={`${name}-${index}-label`}
            type="button"
            tabIndex={-1}
            onClick={() => move(index)}
            className={
              index === selectedIndex
                ? 'font-semibold text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
