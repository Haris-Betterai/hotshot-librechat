import { useEffect, useRef } from 'react';

const DURATION_MS = 320;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const MIN_ITEMS = 3;
const LISTS = ':scope .markdown > ol, :scope .markdown > ul, :scope .markdown > table';

/** The answer's own top-level lists and tables long enough to be what a card replaces. */
const findLists = (messageId: string): HTMLElement[] => {
  const root = document.getElementById(messageId);
  if (!root) {
    return [];
  }
  return Array.from(root.querySelectorAll<HTMLElement>(LISTS)).filter(
    (element) => element.querySelectorAll(':scope > li, :scope tr').length >= MIN_ITEMS,
  );
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateFold(element: HTMLElement, fold: boolean) {
  const style = getComputedStyle(element);
  const open = {
    height: `${element.scrollHeight}px`,
    opacity: 1,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
  };
  const closed = { height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px' };
  const animation = element.animate(fold ? [open, closed] : [closed, open], {
    duration: DURATION_MS,
    easing: EASE,
  });
  element.style.overflow = 'hidden';
  animation.onfinish = () => {
    element.style.overflow = '';
    element.hidden = fold;
  };
}

/**
 * Folds the answer's list away when the card under it shows the same list, so it isn't read twice.
 * The first fold of an already-loaded answer is instant; later toggles animate.
 */
export function useFoldLists(messageId: string, fold: boolean) {
  const settled = useRef(false);

  useEffect(() => {
    const lists = findLists(messageId);
    if (lists.length === 0) {
      return;
    }
    const animate = settled.current && !reducedMotion();
    settled.current = true;
    for (const element of lists) {
      if (element.hidden === fold) {
        continue;
      }
      if (!animate) {
        element.hidden = fold;
        continue;
      }
      if (!fold) {
        element.hidden = false;
      }
      animateFold(element, fold);
    }
  }, [messageId, fold]);

  useEffect(
    () => () => {
      findLists(messageId).forEach((element) => {
        element.hidden = false;
      });
    },
    [messageId],
  );
}
