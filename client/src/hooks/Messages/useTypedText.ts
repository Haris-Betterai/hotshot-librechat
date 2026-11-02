import { useEffect, useRef, useState } from 'react';

/** Growth smaller than this is shown at once: the model is already streaming in small steps. */
const JUMP_CHARS = 120;
const CHARS_PER_SECOND = 1500;
const TICK_MS = 40;
const CHARS_PER_TICK = Math.ceil((CHARS_PER_SECOND * TICK_MS) / 1000);

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Types out a large block of text that lands on the latest answer all at once. Some models (GPT-6
 * on the Responses API) send the whole final answer as one chunk, even after the stream itself has
 * ended, so the reply would otherwise appear in a single jump.
 *
 * Text present on mount, small streamed steps, replaced text and reduced motion all show at once.
 */
export default function useTypedText(text: string, enabled: boolean): string {
  const [shown, setShown] = useState(text.length);
  const shownRef = useRef(text.length);
  const targetRef = useRef(text);

  useEffect(() => {
    const grew = text.startsWith(targetRef.current);
    const growth = text.length - shownRef.current;
    targetRef.current = text;
    if (!enabled || !grew || growth < JUMP_CHARS || prefersReducedMotion()) {
      shownRef.current = text.length;
      setShown(text.length);
      return;
    }
    const timer = setInterval(() => {
      const next = Math.min(targetRef.current.length, shownRef.current + CHARS_PER_TICK);
      shownRef.current = next;
      setShown(next);
      if (next >= targetRef.current.length) {
        clearInterval(timer);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [text, enabled]);

  return shown >= text.length ? text : text.slice(0, shown);
}
