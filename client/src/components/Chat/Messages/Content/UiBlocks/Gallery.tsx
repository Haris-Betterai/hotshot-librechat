import React, { useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export type GalleryItem = { src: string; name: string; caption?: string };

type GalleryProps = {
  items: GalleryItem[];
  /** The open photo, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

const NAV_BUTTON =
  'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md ring-1 ring-black/5 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:bg-neutral-800/90 dark:text-neutral-100 dark:hover:bg-neutral-800';

/** A product photo viewer: arrow keys step through the photos, Escape or a backdrop click closes it. */
export default function Gallery({ items, index, onIndexChange }: GalleryProps) {
  const localize = useLocalize();
  const count = items.length;
  const item = index == null ? null : items[index];

  const step = useCallback(
    (delta: number) => {
      if (index == null || count < 2) {
        return;
      }
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  return (
    <Dialog.Root open={item != null} onOpenChange={(open) => !open && onIndexChange(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[101] flex max-h-[92vh] w-[min(92vw,44rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl focus:outline-none dark:bg-neutral-900 dark:text-neutral-100"
        >
          {item && (
            <>
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-white p-6 sm:p-10">
                <img
                  key={item.src}
                  src={item.src}
                  alt={item.name}
                  className="max-h-[62vh] w-auto max-w-full object-contain"
                />
                {count > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label={localize('com_ui_block_gallery_prev')}
                      className={cn(NAV_BUTTON, 'left-3')}
                    >
                      <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label={localize('com_ui_block_gallery_next')}
                      className={cn(NAV_BUTTON, 'right-3')}
                    >
                      <ChevronRight className="size-5" aria-hidden="true" />
                    </button>
                  </>
                )}
                <Dialog.Close
                  aria-label={localize('com_ui_close')}
                  className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                >
                  <X className="size-5" aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="flex items-center gap-3 border-t border-neutral-200 px-5 py-3 dark:border-neutral-700">
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="truncate text-sm font-semibold">
                    {item.name}
                  </Dialog.Title>
                  {item.caption && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.caption}</p>
                  )}
                </div>
                {count > 1 && (
                  <div className="flex gap-2">
                    {items.map((thumb, i) => (
                      <button
                        key={thumb.src}
                        type="button"
                        onClick={() => onIndexChange(i)}
                        aria-label={thumb.name}
                        aria-current={i === index}
                        className={cn(
                          'size-11 overflow-hidden rounded-lg border bg-white p-1 transition',
                          i === index
                            ? 'border-neutral-900 dark:border-neutral-100'
                            : 'border-neutral-200 opacity-60 hover:opacity-100 dark:border-neutral-700',
                        )}
                      >
                        <img src={thumb.src} alt="" className="size-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
