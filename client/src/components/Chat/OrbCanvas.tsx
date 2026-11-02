import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MODE_FRAMES, paintFrame, resolvePreset } from 'thinking-orbs/engine';
import type { CSSProperties } from 'react';
import type { OrbSize, OrbState } from 'thinking-orbs';

const MAX_DPR = 3;
/** The frame the library paints when motion is reduced. */
const STILL_T = 0.6;

const isDark = (): boolean => {
  const root = document.documentElement;
  if (root.classList.contains('dark')) {
    return true;
  }
  if (root.classList.contains('light')) {
    return false;
  }
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
};

function useDarkTheme(): boolean {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => setDark(isDark());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

type OrbCanvasProps = {
  state: OrbState;
  /** The library's tuned design (dot count, dot size, speed). */
  preset: OrbSize;
  /** Rendered size in CSS pixels. */
  size: number;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * The thinking-orbs drawing, painted at the size it is shown. The library's own component sizes
 * its canvas to the preset (at most 64px), so a larger orb was a stretched 64px bitmap and looked
 * soft. This scales the vector drawing instead, so the dots stay sharp at any size.
 */
export default function OrbCanvas({
  state,
  preset,
  size,
  paused,
  className,
  style,
}: OrbCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dark = useDarkTheme();
  const reduced = useReducedMotion() === true;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    const pixels = Math.round(size * Math.min(MAX_DPR, window.devicePixelRatio || 1));
    canvas.width = pixels;
    canvas.height = pixels;
    const { mode, speed, opts } = resolvePreset(state, preset);
    const frameAt = MODE_FRAMES[mode];
    const scale = pixels / preset;
    const draw = (t: number) => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, preset, preset);
      paintFrame(ctx, frameAt(preset, t, opts), dark);
    };
    const now = () => (performance.now() / 1000) * speed;

    if (reduced) {
      draw(STILL_T);
      return;
    }
    draw(now());
    if (paused) {
      return;
    }

    let frame = 0;
    let running = false;
    let visible = true;
    const loop = () => {
      draw(now());
      if (running) {
        frame = requestAnimationFrame(loop);
      }
    };
    const start = () => {
      if (running) {
        return;
      }
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && document.visibilityState !== 'hidden') {
              start();
              return;
            }
            stop();
          });
    observer?.observe(canvas);
    if (!observer) {
      start();
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
        return;
      }
      if (visible) {
        start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, preset, size, paused, reduced, dark]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, display: 'block', ...style }}
    />
  );
}
