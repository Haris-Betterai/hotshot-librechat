import { isStoreProductUrl } from '../src/products';
import createPayload from '../src/createPayload';
import { EModelEndpoint } from '../src/schemas';
import type { TSubmission } from '../src/types';

describe('isStoreProductUrl', () => {
  it('accepts only Hot Shot product page links', () => {
    expect(isStoreProductUrl('https://www.hotshotsecret.com/products/diesel-extreme')).toBe(true);
    expect(isStoreProductUrl('https://www.hotshotsecret.com/products/diesel-extreme/')).toBe(false);
    expect(isStoreProductUrl('http://www.hotshotsecret.com/products/diesel-extreme')).toBe(false);
    expect(isStoreProductUrl('https://evil.com/products/diesel-extreme')).toBe(false);
    expect(isStoreProductUrl('javascript:alert(1)')).toBe(false);
    expect(isStoreProductUrl(null)).toBe(false);
  });
});

describe('createPayload productUrl', () => {
  const submission = (productUrl?: string | null) =>
    ({
      conversation: { conversationId: 'c1', productUrl },
      userMessage: { text: 'hi' },
      endpointOption: { endpoint: EModelEndpoint.agents },
      isTemporary: false,
    }) as unknown as TSubmission;

  it('sends the pinned product, or null when nothing is pinned', () => {
    const url = 'https://www.hotshotsecret.com/products/fr3';
    expect(createPayload(submission(url)).payload.productUrl).toBe(url);
    expect(createPayload(submission()).payload.productUrl).toBeNull();
  });
});
