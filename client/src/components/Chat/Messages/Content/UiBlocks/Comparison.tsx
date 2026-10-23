import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { TUiComparison } from 'librechat-data-provider';
import type { GalleryItem } from './Gallery';
import { CARD_CLASS, LINK_CLASS } from './shared';
import Gallery from './Gallery';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const STICKY_CELL = 'sticky left-0 z-10 bg-white dark:bg-neutral-900';

export default function Comparison({ block }: { block: TUiComparison }) {
  const localize = useLocalize();
  const [photo, setPhoto] = useState<number | null>(null);
  const photos = useMemo(
    () =>
      block.products.flatMap((product, column): GalleryItem[] =>
        product.image
          ? [
              {
                src: product.image,
                name: product.name,
                price: product.price,
                url: product.url,
                details: block.rows
                  .map((row) => ({ label: row.label, value: row.values[column] ?? '' }))
                  .filter((detail) => detail.value !== ''),
              },
            ]
          : [],
      ),
    [block.products, block.rows],
  );

  return (
    <div className={cn(CARD_CLASS, 'max-w-none overflow-hidden p-0 sm:p-0')}>
      {block.title && (
        <h3 className="px-3 pb-1 pt-3 text-base font-semibold sm:px-4">{block.title}</h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-700">
              <th scope="col" className={cn(STICKY_CELL, 'w-28 px-3 py-3 sm:px-4')}>
                <span className="sr-only">{localize('com_ui_block_compare_feature')}</span>
              </th>
              {block.products.map((product) => (
                <th key={product.name} scope="col" className="px-3 py-3 align-top font-medium">
                  <div className="flex items-start gap-2">
                    {product.image && (
                      <button
                        type="button"
                        onClick={() => setPhoto(photos.findIndex((p) => p.src === product.image))}
                        aria-label={localize('com_ui_block_gallery_open', { 0: product.name })}
                        className="shrink-0 cursor-zoom-in rounded-lg bg-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                      >
                        <img
                          src={product.image}
                          alt=""
                          loading="lazy"
                          className="size-12 rounded-lg object-contain"
                        />
                      </button>
                    )}
                    <div className="min-w-0">
                      {product.url ? (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LINK_CLASS}
                        >
                          {product.name}
                        </a>
                      ) : (
                        <span>{product.name}</span>
                      )}
                      {product.price && (
                        <div className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                          {product.price}
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-700"
              >
                <th
                  scope="row"
                  className={cn(
                    STICKY_CELL,
                    'px-3 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 sm:px-4',
                  )}
                >
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td key={`${row.label}-${index}`} className="px-3 py-2.5 align-top">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.verdict && (
        <p className="flex items-start gap-2 border-t border-neutral-200 bg-neutral-50 px-3 py-3 font-medium dark:border-neutral-700 dark:bg-neutral-800 sm:px-4">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{block.verdict}</span>
        </p>
      )}
      <Gallery items={photos} index={photo} onIndexChange={setPhoto} />
    </div>
  );
}
