import { parseWebSearchDomains, MAX_WEB_SEARCH_DOMAINS } from './websearch';

describe('parseWebSearchDomains', () => {
  it('splits commas and newlines, lowercases, dedupes and drops non-hostnames', () => {
    expect(
      parseWebSearchDomains(
        'HotshotSecret.com,\nhttps://a.com/x, shop.example.co.uk localhost a.com:80',
      ),
    ).toEqual(['hotshotsecret.com', 'shop.example.co.uk']);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 30 }, (_, i) => `site${i}.com`);
    expect(parseWebSearchDomains(many)).toHaveLength(MAX_WEB_SEARCH_DOMAINS);
  });

  it('returns empty for non-text input', () => {
    expect(parseWebSearchDomains(undefined)).toEqual([]);
  });
});
