import mongoose from 'mongoose';
import { isStoreProductUrl } from 'librechat-data-provider';
import { logger } from '@librechat/data-schemas';
import type { PinProductInput } from 'librechat-data-provider';
import type { IConversation } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { Model } from 'mongoose';
import { findCatalogProduct, loadCatalog } from './catalog';

type ProductsRequest = {
  user: { id: string };
  body?: Partial<PinProductInput>;
};

export async function getCatalogHandler(_req: ProductsRequest, res: Response): Promise<Response> {
  try {
    const { catalog } = await loadCatalog();
    return res.json(catalog);
  } catch (error) {
    logger.error('[products] Failed to load the catalog', error);
    return res.status(503).json({ error: 'The product list is unavailable right now' });
  }
}

/** Pins a catalog product to one of the user's chats, or unpins it with `productUrl: null`. */
export async function pinProductHandler(req: ProductsRequest, res: Response): Promise<Response> {
  const { conversationId, productUrl } = req.body ?? {};
  if (typeof conversationId !== 'string' || !conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }
  if (productUrl !== null && !isStoreProductUrl(productUrl)) {
    return res.status(400).json({ error: 'productUrl must be a store product link or null' });
  }

  try {
    if (productUrl !== null && !(await findCatalogProduct(productUrl))) {
      return res.status(400).json({ error: 'Unknown product' });
    }
    const Conversation = mongoose.models.Conversation as Model<IConversation>;
    const update = productUrl === null ? { $unset: { productUrl: 1 } } : { $set: { productUrl } };
    /** `timestamps: false` keeps the chat where it is in the sidebar. */
    const result = await Conversation.updateOne({ conversationId, user: req.user.id }, update, {
      timestamps: false,
    });
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    return res.json({ conversationId, productUrl });
  } catch (error) {
    logger.error('[products] Failed to pin a product', error);
    return res.status(500).json({ error: 'Unable to pin the product' });
  }
}
