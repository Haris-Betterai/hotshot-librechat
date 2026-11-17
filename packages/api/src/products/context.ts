import { logger } from '@librechat/data-schemas';
import type { CatalogProduct } from 'librechat-data-provider';
import { findCatalogProduct } from './catalog';

const priceLine = (product: CatalogProduct): string => {
  const options = product.price_options
    ?.map((option) => (option.price ? `${option.option} ${option.price}` : option.option))
    .join('; ');
  return options || product.price || 'not listed';
};

/** System-prompt block that tells the agent which product the chat is about. */
export function pinnedProductBlock(product: CatalogProduct): string {
  return [
    '## Pinned product',
    "This chat is pinned to one Hot Shot's Secret product. Unless the employee clearly asks about something else, read their messages as being about this product, and call get_product_by_url with its link before giving product facts.",
    `- Name: ${product.title}`,
    `- Link: ${product.url}`,
    `- Category: ${product.category}`,
    `- Price: ${priceLine(product)}`,
    ...(product.sku ? [`- SKU: ${product.sku}`] : []),
  ].join('\n');
}

/** The pinned-product block for a request, or undefined when nothing valid is pinned. */
export async function pinnedProductInstructions(productUrl: unknown): Promise<string | undefined> {
  if (productUrl == null) {
    return undefined;
  }
  try {
    const product = await findCatalogProduct(productUrl);
    return product ? pinnedProductBlock(product) : undefined;
  } catch (error) {
    logger.warn('[products] Could not load the catalog for a pinned product', error);
    return undefined;
  }
}
