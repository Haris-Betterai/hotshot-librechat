import { useCallback, useMemo, useState } from 'react';
import { matchSorter } from 'match-sorter';
import { Spinner, Dropdown, FilterInput, useToastContext } from '@librechat/client';
import type { CatalogProduct } from 'librechat-data-provider';
import { useLocalize, useNewConvo, usePinnedProduct, useStarredProducts } from '~/hooks';
import { useGetStartupConfig, useProductCatalogQuery } from '~/data-provider';
import ProductRow from './ProductRow';

const FILTER_ALL = '__all__';
const FILTER_STARRED = '__starred__';

export default function ProductsPanel() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { newConversation } = useNewConvo();
  const { data: startupConfig } = useGetStartupConfig();
  const isStaff = startupConfig?.isStaff === true;
  const { data: catalog, isLoading, isError } = useProductCatalogQuery(isStaff);
  const { productUrl, setPinnedProduct, isSaving } = usePinnedProduct();
  const { starred, toggleStar } = useStarredProducts();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_ALL);

  const products = useMemo(() => catalog?.products ?? [], [catalog]);

  const filterOptions = useMemo(() => {
    const categories = [...new Set(products.map((product) => product.category))].sort();
    return [
      { value: FILTER_ALL, label: localize('com_ui_products_all') },
      { value: FILTER_STARRED, label: localize('com_ui_products_starred') },
      ...categories.map((category) => ({ value: category, label: category })),
    ];
  }, [products, localize]);

  const visible = useMemo(() => {
    const inFilter = products.filter((product) => {
      if (filter === FILTER_ALL) {
        return true;
      }
      if (filter === FILTER_STARRED) {
        return starred.has(product.url);
      }
      return product.category === filter;
    });
    const query = search.trim();
    return query ? matchSorter(inFilter, query, { keys: ['title', 'sku', 'category'] }) : inFilter;
  }, [products, filter, starred, search]);

  const handlePin = useCallback(
    async (product: CatalogProduct) => {
      try {
        await setPinnedProduct(productUrl === product.url ? null : product.url);
      } catch {
        showToast({ message: localize('com_ui_products_pin_failed'), status: 'error' });
      }
    },
    [productUrl, setPinnedProduct, showToast, localize],
  );

  const handleNewChat = useCallback(
    (product: CatalogProduct) => newConversation({ template: { productUrl: product.url } }),
    [newConversation],
  );

  if (!isStaff) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="p-4 text-center text-sm text-text-secondary">
        {localize('com_ui_products_unavailable')}
      </p>
    );
  }

  return (
    <div
      role="region"
      aria-label={localize('com_ui_products')}
      className="flex h-auto w-full flex-col gap-2 px-3 pb-3 pt-2"
    >
      <FilterInput
        inputId="products-search"
        label={localize('com_ui_products_filter')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Dropdown
        value={filter}
        onChange={setFilter}
        options={filterOptions}
        className="w-full"
        ariaLabel={localize('com_ui_products_category')}
        testId="products-filter"
      />
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          {localize(
            filter === FILTER_STARRED ? 'com_ui_products_none_starred' : 'com_ui_products_empty',
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5" aria-label={localize('com_ui_products')}>
          {visible.map((product) => (
            <ProductRow
              key={product.url}
              product={product}
              isPinned={product.url === productUrl}
              isStarred={starred.has(product.url)}
              disabled={isSaving}
              onPin={handlePin}
              onNewChat={handleNewChat}
              onToggleStar={toggleStar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
