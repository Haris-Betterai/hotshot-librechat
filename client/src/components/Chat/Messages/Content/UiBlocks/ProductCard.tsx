import React, { useState } from 'react';
import { ExternalLink, Droplets } from 'lucide-react';
import type { TUiProductCard } from 'librechat-data-provider';
import { CARD_CLASS, LINK_CLASS, usePrimaryButton } from './shared';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function ProductCard({ block }: { block: TUiProductCard }) {
  const localize = useLocalize();
  const primary = usePrimaryButton();
  const sizes = block.sizes ?? [];
  const [selected, setSelected] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const size = sizes[selected];
  const price = size?.price ?? block.price;

  return (
    <div className={cn(CARD_CLASS, 'flex flex-col gap-3 min-[420px]:flex-row')}>
      {block.image && !imageFailed && (
        <img
          src={block.image}
          alt={block.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="size-24 shrink-0 self-center rounded-xl bg-white object-contain min-[420px]:size-28 min-[420px]:self-start"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(LINK_CLASS, 'text-base leading-snug')}
        >
          {block.name}
        </a>
        {block.summary && <p className="text-neutral-600 dark:text-neutral-400">{block.summary}</p>}
        {block.dose && (
          <p className="flex items-start gap-1.5 text-neutral-700 dark:text-neutral-300">
            <Droplets className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{block.dose}</span>
          </p>
        )}
        {sizes.length > 1 && (
          <div
            role="radiogroup"
            aria-label={localize('com_ui_block_size')}
            className="inline-flex max-w-full flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
          >
            {sizes.map((option, index) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={index === selected}
                onClick={() => setSelected(index)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
                  index === selected
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          {price ? (
            <span aria-live="polite" className="text-lg font-semibold">
              {price}
              {sizes.length === 1 && (
                <span className="ml-1.5 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                  {sizes[0].label}
                </span>
              )}
            </span>
          ) : (
            <span />
          )}
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className={primary.className}
            style={primary.style}
          >
            {localize('com_ui_block_view_product')}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
