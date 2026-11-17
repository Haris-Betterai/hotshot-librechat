import { memo } from 'react';
import { Pin, PinOff, Star, MessageSquarePlus } from 'lucide-react';
import { TooltipAnchor } from '@librechat/client';
import type { CatalogProduct } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type ProductRowProps = {
  product: CatalogProduct;
  isPinned: boolean;
  isStarred: boolean;
  disabled: boolean;
  onPin: (product: CatalogProduct) => void;
  onNewChat: (product: CatalogProduct) => void;
  onToggleStar: (url: string) => void;
};

function ActionButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TooltipAnchor
      description={label}
      side="left"
      render={
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
        >
          {children}
        </button>
      }
    />
  );
}

function ProductRow({
  product,
  isPinned,
  isStarred,
  disabled,
  onPin,
  onNewChat,
  onToggleStar,
}: ProductRowProps) {
  const localize = useLocalize();
  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-lg px-1.5 py-1.5',
        isPinned ? 'bg-surface-active' : 'hover:bg-surface-hover',
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-secondary">
        {product.image ? (
          <img src={product.image} alt="" loading="lazy" className="size-full object-contain" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary" title={product.title}>
          {product.title}
        </p>
        <p className="truncate text-xs text-text-secondary">
          {product.price ?? localize('com_ui_products_no_price')}
        </p>
      </div>
      <ActionButton
        label={localize(isStarred ? 'com_ui_products_unstar' : 'com_ui_products_star')}
        onClick={() => onToggleStar(product.url)}
      >
        <Star
          className={cn('size-4', isStarred && 'fill-current text-amber-500')}
          aria-hidden="true"
        />
      </ActionButton>
      <ActionButton
        label={localize(isPinned ? 'com_ui_products_unpin' : 'com_ui_products_pin')}
        onClick={() => onPin(product)}
        disabled={disabled}
      >
        {isPinned ? (
          <PinOff className="size-4" aria-hidden="true" />
        ) : (
          <Pin className="size-4" aria-hidden="true" />
        )}
      </ActionButton>
      <ActionButton
        label={localize('com_ui_products_new_chat')}
        onClick={() => onNewChat(product)}
        disabled={disabled}
      >
        <MessageSquarePlus className="size-4" aria-hidden="true" />
      </ActionButton>
    </li>
  );
}

export default memo(ProductRow);
