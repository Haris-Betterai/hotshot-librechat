import { parseLenient, humanizeKey } from '../JsonView';

describe('humanizeKey', () => {
  it('turns snake_case into a sentence-cased label', () => {
    expect(humanizeKey('fluid_capacity_name')).toBe('Fluid capacity name');
    expect(humanizeKey('vehicle_name')).toBe('Vehicle name');
  });

  it('splits camelCase', () => {
    expect(humanizeKey('lastScrapedAt')).toBe('Last scraped at');
  });

  it('returns the original key when nothing is left to humanize', () => {
    expect(humanizeKey('___')).toBe('___');
  });
});

describe('parseLenient', () => {
  it('parses well-formed JSON without marking it truncated', () => {
    const result = parseLenient('{"a": 1, "b": "two"}');
    expect(result).toEqual({ value: { a: 1, b: 'two' }, truncated: false });
  });

  it('repairs an object cut off mid-value', () => {
    const result = parseLenient('{"a": 1, "b": "two", "c": "unfinis');
    expect(result?.truncated).toBe(true);
    expect(result?.value).toEqual({ a: 1, b: 'two' });
  });

  it('repairs a payload that ends on a trailing comma', () => {
    const result = parseLenient('{"a": 1, "b": "two",');
    expect(result?.truncated).toBe(true);
    expect(result?.value).toEqual({ a: 1, b: 'two' });
  });

  it('repairs truncated nested structures, keeping the complete entries', () => {
    const result = parseLenient('{"outer": {"x": 1, "y": 2}, "next": [1, 2, 3');
    expect(result?.truncated).toBe(true);
    expect(result?.value).toEqual({ outer: { x: 1, y: 2 }, next: [1, 2] });
  });

  it('repairs a truncated array of objects', () => {
    const result = parseLenient('[{"id": 1}, {"id": 2}, {"id": 3');
    expect(result?.truncated).toBe(true);
    expect(result?.value).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('does not treat commas inside strings as cut points', () => {
    const result = parseLenient('{"note": "a, b, c", "next": "unfinis');
    expect(result?.truncated).toBe(true);
    expect(result?.value).toEqual({ note: 'a, b, c' });
  });

  it('returns undefined for text that is not JSON at all', () => {
    expect(parseLenient('just some prose, with a comma')).toBeUndefined();
  });
});

describe('parseLenient with multiple concatenated documents', () => {
  it('returns an array when several complete documents are concatenated', () => {
    const result = parseLenient('{"a": 1}\n{"b": 2}\n{"c": 3}');
    expect(result?.truncated).toBe(false);
    expect(result?.value).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it('keeps earlier documents when the last one is cut off', () => {
    const result = parseLenient('{"a": 1}\n{"b": 2}\n{"c": 3, "d": "unfinis');
    expect(result?.truncated).toBe(true);
    expect(result?.value).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it('is not confused by braces inside string values', () => {
    const result = parseLenient('{"a": "}{ not a brace"}\n{"b": 2}');
    expect(result?.truncated).toBe(false);
    expect(result?.value).toEqual([{ a: '}{ not a brace' }, { b: 2 }]);
  });

  it('still returns a single value for one document', () => {
    const result = parseLenient('{"only": true}');
    expect(result?.value).toEqual({ only: true });
  });
});
