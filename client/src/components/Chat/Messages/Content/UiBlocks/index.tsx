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

function Skeleton() {
  const localize = useLocalize();
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={localize('com_ui_block_loading')}
      className={cn(CARD_CLASS, 'flex min-h-[7rem] animate-pulse gap-3')}
    >
      <div className="size-24 shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div className="h-4 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800" />
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
  if (!block) {
    return isStreaming ? <Skeleton /> : null;
  }
  return (
    <UiBlockBoundary>
      <Block block={block} />
    </UiBlockBoundary>
  );
}
