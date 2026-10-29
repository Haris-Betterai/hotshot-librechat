import React, { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const DURATION_MS = 320;
const PINNED_PX = 160;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

const scrollParent = (node: HTMLElement | null): HTMLElement | null => {
  let current = node?.parentElement ?? null;
  while (current) {
    const { overflowY } = getComputedStyle(current);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

/** Keeps the bottom in view while the height animates, if the reader was already at the bottom. */
function followBottom(container: HTMLElement) {
  const end = performance.now() + DURATION_MS + 40;
  const step = () => {
    container.scrollTop = container.scrollHeight;
    if (performance.now() < end) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

/**
 * Animates its height to fit its content, so blocks that arrive or change size after an answer
 * grow in smoothly instead of jumping. With `follow`, a reader at the bottom stays at the bottom.
 */
export default function AutoHeight({ children, follow }: { children: ReactNode; follow: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const heightRef = useRef(0);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.ceil(entry.contentRect.height);
      const previous = heightRef.current;
      if (next === previous) {
        return;
      }
      const container = follow && next > previous ? scrollParent(inner) : null;
      const pinned =
        container != null &&
        container.scrollHeight - container.scrollTop - container.clientHeight < PINNED_PX;
      heightRef.current = next;
      setHeight(next);
      if (container && pinned) {
        followBottom(container);
      }
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [follow]);

  return (
    <div
      className="overflow-hidden transition-[height] motion-reduce:transition-none"
      style={{ height, transitionDuration: `${DURATION_MS}ms`, transitionTimingFunction: EASE }}
    >
      <div ref={innerRef} className="relative">
        {children}
      </div>
    </div>
  );
}
