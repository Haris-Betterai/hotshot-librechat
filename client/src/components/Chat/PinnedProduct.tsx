import { memo, useMemo } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { useGetStartupConfig, useProductCatalogQuery } from '~/data-provider';
import { useLocalize, usePinnedProduct } from '~/hooks';

/** The product pinned to the open chat (staff only), shown above the message box. */
function PinnedProduct() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data: startupConfig } = useGetStartupConfig();
  const isStaff = startupConfig?.isStaff === true;
  const { productUrl, setPinnedProduct, isSaving } = usePinnedProduct();
  const { data: catalog } = useProductCatalogQuery(isStaff && productUrl != null);

  const product = useMemo(
    () => catalog?.products.find((entry) => entry.url === productUrl),
    [catalog, productUrl],
  );

  if (!isStaff || !product) {
    return null;
  }

  const unpin = async () => {
    try {
      await setPinnedProduct(null);
    } catch {
      showToast({ message: localize('com_ui_products_pin_failed'), status: 'error' });
    }
  };

  return (
    <div
      role="group"
      aria-label={localize('com_ui_products_pinned')}
      className="mx-auto mb-2 flex w-full max-w-3xl items-center gap-3 rounded-xl border border-border-light bg-surface-primary px-3 py-2 xl:max-w-4xl"
    >
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-secondary">
        {product.image ? (
          <img src={product.image} alt="" className="size-full object-contain" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">{localize('com_ui_products_pinned')}</p>
        <p className="truncate text-sm font-medium text-text-primary">{product.title}</p>
      </div>
      {product.price ? (
        <span className="hidden shrink-0 text-sm text-text-secondary sm:inline">
          {product.price}
        </span>
      ) : null}
      <a
        href={product.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={localize('com_ui_products_open')}
        className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
      <button
        type="button"
        onClick={unpin}
        disabled={isSaving}
        aria-label={localize('com_ui_products_unpin')}
        className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default memo(PinnedProduct);
