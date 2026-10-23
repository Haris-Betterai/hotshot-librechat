import React, { useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { usePrimaryButton } from './shared';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export type GalleryDetail = { label: string; value: string };

export type GalleryItem = {
  src: string;
  name: string;
  price?: string;
  summary?: string;
  /** Facts shown beside the photo, e.g. the comparison rows for this product. */
  details?: GalleryDetail[];
  /** The product page on the store. */
  url?: string;
};

type GalleryProps = {
  items: GalleryItem[];
  /** The open product, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

const NAV_BUTTON =
  'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md ring-1 ring-black/5 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:bg-neutral-800/90 dark:text-neutral-100 dark:hover:bg-neutral-800';

/**
 * A product viewer: the photo beside the product's details and a link to its page.
 * Arrow keys, the arrow buttons and the thumbnails step between products; Escape or a backdrop click closes it.
 */
export default function Gallery({ items, index, onIndexChange }: GalleryProps) {
  const localize = useLocalize();
  const primary = usePrimaryButton();
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
        <Dialog.Overlay className="fixed inset-0 z-[2147483001] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[2147483002] flex max-h-[92vh] w-[min(94vw,64rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl focus:outline-none dark:bg-neutral-900 dark:text-neutral-100 md:h-[min(86vh,40rem)] md:flex-row"
        >
          {item && (
            <>
              <div className="relative flex min-h-0 shrink-0 items-center justify-center bg-white p-6 md:flex-[1.3] md:p-10">
                <img
                  key={item.src}
                  src={item.src}
                  alt={item.name}
                  className="max-h-[38vh] w-auto max-w-full object-contain md:max-h-full"
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
              </div>

              <div className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 dark:border-neutral-700 md:border-l md:border-t-0">
                <div className="flex items-start gap-3 px-5 pb-3 pt-5 md:px-6 md:pt-6">
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="text-lg font-semibold leading-snug md:text-xl">
                      {item.name}
                    </Dialog.Title>
                    {item.price && (
                      <p className="mt-1 text-base font-medium text-neutral-600 dark:text-neutral-300">
                        {item.price}
                      </p>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label={localize('com_ui_close')}
                    className="-mr-2 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </Dialog.Close>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 text-sm md:px-6">
                  {item.summary && (
                    <p className="mb-4 text-neutral-700 dark:text-neutral-300">{item.summary}</p>
                  )}
                  {item.details && item.details.length > 0 && (
                    <dl className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {item.details.map((detail) => (
                        <div key={detail.label} className="py-2.5">
                          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            {detail.label}
                          </dt>
                          <dd className="mt-0.5 text-neutral-900 dark:text-neutral-100">
                            {detail.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 px-5 py-4 dark:border-neutral-700 md:px-6">
                  {count > 1 && (
                    <div className="flex gap-2">
                      {items.map((thumb, i) => (
                        <button
                          key={`${thumb.src}-${i}`}
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
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(primary.className, 'ml-auto')}
                      style={primary.style}
                    >
                      {localize('com_ui_block_view_product')}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
