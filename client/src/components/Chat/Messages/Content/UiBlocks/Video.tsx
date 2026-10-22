import React, { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import type { TUiVideo } from 'librechat-data-provider';
import { CARD_CLASS, LINK_CLASS } from './shared';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/** Privacy-enhanced player; only loads once the customer presses play. */
const embedUrl = ({ videoId, start }: TUiVideo) => {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (start) {
    params.set('start', String(start));
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

export default function Video({ block }: { block: TUiVideo }) {
  const localize = useLocalize();
  const [playing, setPlaying] = useState(false);
  const title = block.title ?? localize('com_ui_block_video');

  return (
    <div className={cn(CARD_CLASS, 'flex flex-col gap-3')}>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {playing ? (
          <iframe
            src={embedUrl(block)}
            title={title}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={localize('com_ui_block_video_play', { 0: title })}
            className="group absolute inset-0 size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          >
            <img
              src={`https://i.ytimg.com/vi/${block.videoId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-transform group-hover:scale-105">
                <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium leading-snug">{title}</p>
        {block.summary && <p className="text-neutral-600 dark:text-neutral-400">{block.summary}</p>}
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(LINK_CLASS, 'inline-flex items-center gap-1 self-start text-xs')}
        >
          {localize('com_ui_block_video_watch')}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
