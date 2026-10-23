import React, { Component, useMemo } from 'react';
import type { ReactNode } from 'react';
import { parseUiBlock } from 'librechat-data-provider';
import type { TUiBlock } from 'librechat-data-provider';
import { CARD_CLASS } from './shared';
import ProductCard from './ProductCard';
import Comparison from './Comparison';
import Calculator from './Calculator';
import Replies from './Replies';
import Vehicle from './Vehicle';
import Video from './Video';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

class UiBlockBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type BlockType = TUiBlock['type'];

const BLOCK_TYPES: ReadonlySet<string> = new Set<BlockType>([
  'product_card',
  'comparison',
  'dose_calculator',
  'quick_replies',
  'vehicle_picker',
  'video',
]);

/** The block's type from a partly streamed source, once the model has written it. */
export const peekBlockType = (source: string): BlockType | null => {
  const match = /"type"\s*:\s*"([a-z_]+)"/.exec(source);
  return match && BLOCK_TYPES.has(match[1]) ? (match[1] as BlockType) : null;
};

const BAR = 'rounded bg-neutral-100 dark:bg-neutral-800';

/** A placeholder shaped like the block being built, so the layout doesn't jump when it lands. */
function Skeleton({ type }: { type: BlockType }) {
  const localize = useLocalize();
  const status = {
    role: 'status',
    'aria-busy': true,
    'aria-label': localize('com_ui_block_loading'),
  } as const;

  if (type === 'quick_replies') {
    return (
      <div {...status} className="my-3 flex animate-pulse flex-wrap gap-2">
        {['w-32', 'w-40', 'w-28'].map((width) => (
          <div key={width} className={cn(BAR, 'h-9 rounded-full', width)} />
        ))}
      </div>
    );
  }
  if (type === 'video') {
    return (
      <div {...status} className={cn(CARD_CLASS, 'animate-pulse')}>
        <div className={cn('aspect-video w-full rounded-xl', BAR)} />
      </div>
    );
  }
  if (type === 'comparison') {
    return (
      <div {...status} className={cn(CARD_CLASS, 'flex max-w-none animate-pulse flex-col gap-3')}>
        <div className="grid grid-cols-4 gap-3">
          <div />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn('size-10 shrink-0 rounded-lg', BAR)} />
              <div className={cn('h-3 flex-1', BAR)} />
            </div>
          ))}
        </div>
        {[0, 1, 2].map((row) => (
          <div key={row} className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((cell) => (
              <div key={cell} className={cn('h-3', BAR)} />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (type === 'dose_calculator' || type === 'vehicle_picker') {
    return (
      <div {...status} className={cn(CARD_CLASS, 'flex animate-pulse flex-col gap-3')}>
        <div className={cn('h-4 w-1/3', BAR)} />
        <div className={cn('h-10 w-1/2 rounded-lg', BAR)} />
        <div className={cn('h-14 w-full rounded-xl', BAR)} />
      </div>
    );
  }
  return (
    <div {...status} className={cn(CARD_CLASS, 'flex min-h-[7rem] animate-pulse gap-3')}>
      <div className={cn('size-24 shrink-0 rounded-xl', BAR)} />
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div className={cn('h-4 w-2/3', BAR)} />
        <div className={cn('h-3 w-full', BAR)} />
        <div className={cn('h-3 w-1/2', BAR)} />
      </div>
    </div>
  );
}

function Block({ block }: { block: TUiBlock }) {
  switch (block.type) {
    case 'product_card':
      return <ProductCard block={block} />;
    case 'comparison':
      return <Comparison block={block} />;
    case 'dose_calculator':
      return <Calculator block={block} />;
    case 'quick_replies':
      return <Replies block={block} />;
    case 'vehicle_picker':
      return <Vehicle block={block} />;
    case 'video':
      return <Video block={block} />;
  }
}

type UiBlockProps = { source: string; isStreaming?: boolean };

export default function UiBlock({ source, isStreaming = false }: UiBlockProps) {
  const block = useMemo(() => parseUiBlock(source), [source]);
  const pendingType = useMemo(
    () => (block || !isStreaming ? null : peekBlockType(source)),
    [block, isStreaming, source],
  );
  if (!block) {
    return pendingType ? <Skeleton type={pendingType} /> : null;
  }
  return (
    <UiBlockBoundary>
      <Block block={block} />
    </UiBlockBoundary>
  );
}
