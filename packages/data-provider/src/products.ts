const STORE_PRODUCT_URL = /^https:\/\/www\.hotshotsecret\.com\/products\/[a-z0-9][a-z0-9-]{0,199}$/;

/** A Hot Shot's Secret product page link, the only value a chat can pin. */
export const isStoreProductUrl = (value: unknown): value is string =>
  typeof value === 'string' && STORE_PRODUCT_URL.test(value);

export type CatalogPriceOption = {
  option: string;
  price: string | null;
};

export type CatalogProduct = {
  title: string;
  url: string;
  image: string | null;
  price: string | null;
  price_options: CatalogPriceOption[] | null;
  sku: string | null;
  category: string;
};

export type ProductCatalog = {
  products: CatalogProduct[];
  /** When the store was last scraped (ISO). */
  updatedAt: string | null;
};

export type PinProductInput = {
  conversationId: string;
  productUrl: string | null;
};

export type PinProductResult = {
  conversationId: string;
  productUrl: string | null;
};
