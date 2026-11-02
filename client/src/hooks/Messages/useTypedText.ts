import { useEffect, useRef, useState } from 'react';

/** Growth smaller than this is shown at once: the model is already streaming in small steps. */
const JUMP_CHARS = 120;
const CHARS_PER_SECOND = 1500;
const TICK_MS = 40;
const CHARS_PER_TICK = Math.ceil((CHARS_PER_SECOND * TICK_MS) / 1000);

/**
 * Reveal progress by slot (conversation and part), so a reveal survives the text part remounting
 * when the finished reply replaces the streamed one under a new message id.
 */
const progress = new Map<string, number>();

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const commonPrefix = (left: string, right: string): number => {
  const max = Math.min(left.length, right.length);
  let index = 0;
  while (index < max && left.charCodeAt(index) === right.charCodeAt(index)) {
    index++;
  }
  return index;
};

type TypedTextOptions = {
  /** Only the latest assistant answer types out. */
  enabled: boolean;
  /** The reply is still being received: text already present on mount is new, not history. */
  live: boolean;
  /** Identifies the answer's text slot across remounts. */
  slot: string;
};

/**
 * Types out a large block of text that lands on the latest answer all at once. Some models (GPT-6
 * on the Responses API) send the whole final answer as one chunk, so the reply would otherwise
 * appear in a single jump. Small streamed steps, history and reduced motion show at once.
 */
export default function useTypedText(
  text: string,
  { enabled, live, slot }: TypedTextOptions,
): string {
  const initial = (() => {
    const saved = progress.get(slot);
    if (enabled && saved != null) {
      return Math.min(saved, text.length);
    }
    return enabled && live ? 0 : text.length;
  })();
  const [shown, setShown] = useState(initial);
  const shownRef = useRef(initial);
  const targetRef = useRef(text);

  useEffect(() => {
    const kept = Math.min(shownRef.current, commonPrefix(targetRef.current, text));
    targetRef.current = text;
    const remaining = text.length - kept;
    const reveal = enabled && remaining >= JUMP_CHARS && !prefersReducedMotion();
    if (!reveal) {
      shownRef.current = text.length;
      setShown(text.length);
      progress.delete(slot);
      return;
    }
    shownRef.current = kept;
    setShown(kept);
    const timer = setInterval(() => {
      const next = Math.min(targetRef.current.length, shownRef.current + CHARS_PER_TICK);
      shownRef.current = next;
      setShown(next);
      if (next < targetRef.current.length) {
        progress.set(slot, next);
        return;
      }
      progress.delete(slot);
      clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [text, enabled, slot]);

  return shown >= text.length ? text : text.slice(0, shown);
}
