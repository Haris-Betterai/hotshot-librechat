import {
  safeUiUrl,
  parseUiBlock,
  calculateDose,
  parseYouTubeUrl,
  MAX_UI_QUICK_REPLIES,
} from './uiblocks';

const json = (value: unknown) => JSON.stringify(value);

describe('parseUiBlock', () => {
  it('returns null for invalid, partial or unknown JSON', () => {
    expect(parseUiBlock('{"type":"product_card","name":"Diesel')).toBeNull();
    expect(parseUiBlock('[]')).toBeNull();
    expect(parseUiBlock(json({ type: 'banner' }))).toBeNull();
  });

  it('builds a product card and keeps only https links', () => {
    const block = parseUiBlock(
      json({
        type: 'product_card',
        name: 'Diesel Extreme',
        url: 'https://www.hotshotsecret.com/diesel-extreme/',
        image: 'javascript:alert(1)',
        price: '$17.99 - $399.99',
        sizes: [{ label: '16 oz', price: '$17.99' }, { price: '$5' }, 'bad'],
        dose: '16 oz treats 40 gal',
      }),
    );
    expect(block).toEqual({
      type: 'product_card',
      name: 'Diesel Extreme',
      url: 'https://www.hotshotsecret.com/diesel-extreme/',
      price: '$17.99 - $399.99',
      sizes: [{ label: '16 oz', price: '$17.99' }],
      dose: '16 oz treats 40 gal',
    });
  });

  it('rejects a product card without a safe url', () => {
    expect(parseUiBlock(json({ type: 'product_card', name: 'X', url: 'http://x.com' }))).toBeNull();
  });

  it('builds a comparison and pads missing cells', () => {
    const block = parseUiBlock(
      json({
        type: 'comparison',
        products: [{ name: 'Diesel Extreme' }, { name: 'EDT' }],
        rows: [{ label: 'Use', values: ['Every 6,000 mi'] }, { label: 'bad' }],
        verdict: 'Run both',
      }),
    );
    expect(block).toMatchObject({
      type: 'comparison',
      rows: [{ label: 'Use', values: ['Every 6,000 mi', '—'] }],
      verdict: 'Run both',
    });
  });

  it('needs at least two products and one row to compare', () => {
    expect(
      parseUiBlock(json({ type: 'comparison', products: [{ name: 'A' }], rows: [] })),
    ).toBeNull();
  });

  it('builds a dose calculator with a valid ratio', () => {
    const block = parseUiBlock(
      json({
        type: 'dose_calculator',
        product: 'FR3',
        ratio: { amount: 1.5, unit: 'oz', per: 1, perUnit: 'quart' },
        capacity: '13',
      }),
    );
    expect(block).toMatchObject({ product: 'FR3', capacity: 13 });
    expect(
      parseUiBlock(
        json({ type: 'dose_calculator', product: 'FR3', ratio: { amount: -1, unit: 'oz' } }),
      ),
    ).toBeNull();
  });

  it('accepts name as the dose calculator product', () => {
    const block = parseUiBlock(
      json({
        type: 'dose_calculator',
        name: 'Diesel Extreme',
        ratio: { amount: 16, unit: 'oz', per: 40, perUnit: 'gallon' },
      }),
    );
    expect(block).toMatchObject({ type: 'dose_calculator', product: 'Diesel Extreme' });
  });

  it('dedupes and caps quick replies', () => {
    const options = ['Yes', 'Yes', ...Array.from({ length: 10 }, (_, i) => `Option ${i}`)];
    const block = parseUiBlock(json({ type: 'quick_replies', options }));
    expect(block?.type === 'quick_replies' && block.options.length).toBeLessThanOrEqual(
      MAX_UI_QUICK_REPLIES,
    );
    expect(block?.type === 'quick_replies' && block.options[0]).toBe('Yes');
  });

  it('defaults vehicle picker fields and drops unknown ones', () => {
    expect(parseUiBlock(json({ type: 'vehicle_picker' }))).toEqual({
      type: 'vehicle_picker',
      fields: ['year', 'make', 'model', 'engine'],
    });
    expect(parseUiBlock(json({ type: 'vehicle_picker', fields: ['engine', 'vin'] }))).toEqual({
      type: 'vehicle_picker',
      fields: ['engine'],
    });
  });
});

describe('helpers', () => {
  it('calculates a dose rounded to one decimal', () => {
    expect(calculateDose({ amount: 1.5, unit: 'oz', per: 1, perUnit: 'quart' }, 13)).toBe(19.5);
    expect(calculateDose({ amount: 16, unit: 'oz', per: 40, perUnit: 'gallon' }, 26)).toBe(10.4);
  });

  it('accepts only https urls', () => {
    expect(safeUiUrl('https://a.com/x')).toBe('https://a.com/x');
    expect(safeUiUrl('http://a.com')).toBeUndefined();
    expect(safeUiUrl('data:image/png;base64,xx')).toBeUndefined();
  });
});

describe('video block', () => {
  const block = (url: string, extra: Record<string, unknown> = {}) =>
    parseUiBlock(JSON.stringify({ type: 'video', url, ...extra }));

  it.each([
    ['https://www.youtube.com/watch?v=MIPTS5BN62c', 'MIPTS5BN62c', undefined],
    ['https://youtu.be/MIPTS5BN62c?t=95', 'MIPTS5BN62c', 95],
    ['https://www.youtube.com/shorts/MIPTS5BN62c', 'MIPTS5BN62c', undefined],
    ['https://m.youtube.com/watch?v=MIPTS5BN62c&t=1m30s', 'MIPTS5BN62c', 90],
  ])('reads %s', (url, id, start) => {
    const parsed = block(url, { title: 'Stiction Eliminator challenge' });
    expect(parsed).toMatchObject({
      type: 'video',
      videoId: id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: 'Stiction Eliminator challenge',
    });
    expect(parsed && 'start' in parsed ? parsed.start : undefined).toBe(start);
  });

  it.each([
    'https://vimeo.com/123456',
    'https://www.youtube.com/watch?v=short',
    'http://www.youtube.com/watch?v=MIPTS5BN62c',
    'javascript:alert(1)',
    'https://evil.example/watch?v=MIPTS5BN62c',
  ])('rejects %s', (url) => {
    expect(block(url)).toBeNull();
  });

  it('parses ids from the helper directly', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/embed/MIPTS5BN62c?start=12')).toEqual({
      id: 'MIPTS5BN62c',
      start: 12,
    });
  });
});
