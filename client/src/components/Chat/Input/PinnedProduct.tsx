import { memo, useMemo } from 'react';
import { Package } from 'lucide-react';
import { useToastContext } from '@librechat/client';
import { isStoreProductUrl } from 'librechat-data-provider';
import { useGetStartupConfig, useProductCatalogQuery } from '~/data-provider';
import { useLocalize, usePinnedProduct } from '~/hooks';
import RemoveFile from './Files/RemoveFile';

/**
 * The product pinned to the open chat (staff only), shown inside the message box the
 * same way an attached file is. Clicking it opens the product page.
 */
function PinnedProduct() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data: startupConfig } = useGetStartupConfig();
  const isStaff = startupConfig?.isStaff === true;
  const { productUrl, setPinnedProduct } = usePinnedProduct();
  const { data: catalog } = useProductCatalogQuery(isStaff && productUrl != null);

  const product = useMemo(
    () => catalog?.products.find((entry) => entry.url === productUrl),
    [catalog, productUrl],
  );

  if (!isStaff || !isStoreProductUrl(productUrl)) {
    return null;
  }

  const title = product?.title ?? productUrl.split('/').pop() ?? productUrl;
  const subtitle = [localize('com_ui_products_pinned'), product?.price].filter(Boolean).join(' · ');

  const unpin = async () => {
    try {
      await setPinnedProduct(null);
    } catch {
      showToast({ message: localize('com_ui_products_pin_failed'), status: 'error' });
    }
  };

  return (
    <div className="mx-2 mt-2 flex flex-wrap gap-2">
      <div className="group relative inline-block text-sm text-text-primary">
        <a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={localize('com_ui_products_open')}
          className="block overflow-hidden rounded-2xl border border-border-light bg-surface-hover-alt"
        >
          <div className="w-56 p-1.5">
            <div className="flex flex-row items-center gap-2">
              <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-primary">
                {product?.image ? (
                  <img src={product.image} alt="" className="size-full object-contain" />
                ) : (
                  <Package className="size-5 text-text-secondary" aria-hidden="true" />
                )}
              </div>
              <div className="overflow-hidden">
                <div className="truncate font-medium" title={title}>
                  {title}
                </div>
                <div className="truncate text-text-secondary">{subtitle}</div>
              </div>
            </div>
          </div>
        </a>
        <RemoveFile onRemove={unpin} />
      </div>
    </div>
  );
}

export default memo(PinnedProduct);
