import { useState, useEffect, useRef } from 'react';

/** Characters revealed per second once the buffer has caught up to the model's
 *  output. Fast enough to feel instant for a short reply, slow enough that a
 *  burst of several sentences arriving in one network chunk doesn't pop in as
 *  a single flash. */
const CHARS_PER_SECOND = 420;
/** How far the reveal is allowed to trail the actual streamed text before it
 *  snaps forward. Bounds the lag after a large chunk (e.g. a long tool-result
 *  paragraph landing in one SSE frame) so the visible text is never stuck
 *  seconds behind what the model has already produced. */
const MAX_LAG_CHARS = 220;
/** Reveal tick interval. Text does not need 60fps to read as smooth — this
 *  also keeps the growing markdown block from re-parsing more often than
 *  needed (see `MarkdownBlocks`, which re-parses its still-growing last block
 *  on every content change). One steady interval runs for the life of a
 *  stream — independent of how often `text` itself updates — rather than
 *  being torn down and recreated on every chunk, which could otherwise starve
 *  reveal ticks if chunks arrive faster than the tick rate. */
const TICK_MS = 40;
const CHARS_PER_TICK = Math.max(1, Math.ceil((CHARS_PER_SECOND * TICK_MS) / 1000));

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Paces how much of a streaming message's text is revealed, independent of
 * how bursty the underlying network chunks are. `MarkdownBlocks` already
 * re-parses only its still-growing last block on every content change, so
 * feeding it a shorter, steadily-growing prefix of the same string is exactly
 * what it already expects — this changes the rate the string grows at, not
 * how it is rendered.
 *
 * Returns `text` unchanged (no lag, no ticking) whenever `isStreaming` is
 * false, so completed and historical messages render instantly. Also bypasses
 * pacing under `prefers-reduced-motion`.
 */
export default function useSmoothedStreamText(text: string, isStreaming: boolean): string {
  const [revealed, setRevealed] = useState(() => (isStreaming ? '' : text));
  const targetTextRef = useRef(text);
  const revealedLengthRef = useRef(revealed.length);

  // Keep the latest target text available to the ticking effect without
  // making that effect depend on `text` (which would tear down and recreate
  // the interval on every streamed chunk).
  useEffect(() => {
    targetTextRef.current = text;
    if (!isStreaming) {
      return;
    }
    // Text shrank (edit/regenerate) — clamp instead of trying to "unreveal".
    if (revealedLengthRef.current > text.length) {
      revealedLengthRef.current = text.length;
      setRevealed(text);
    }
  }, [text, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      revealedLengthRef.current = targetTextRef.current.length;
      setRevealed(targetTextRef.current);
      return;
    }

    if (prefersReducedMotion()) {
      revealedLengthRef.current = targetTextRef.current.length;
      setRevealed(targetTextRef.current);
      return;
    }

    const intervalId = setInterval(() => {
      const target = targetTextRef.current;
      const behindBy = target.length - revealedLengthRef.current;
      if (behindBy <= 0) {
        return;
      }
      const next =
        behindBy > MAX_LAG_CHARS
          ? target.length - MAX_LAG_CHARS + CHARS_PER_TICK
          : revealedLengthRef.current + CHARS_PER_TICK;
      const clamped = Math.min(next, target.length);
      revealedLengthRef.current = clamped;
      setRevealed(target.slice(0, clamped));
    }, TICK_MS);

    return () => clearInterval(intervalId);
    // Intentionally re-armed only when the streaming state itself changes —
    // see the comment above the target-tracking effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  return isStreaming ? revealed : text;
}
