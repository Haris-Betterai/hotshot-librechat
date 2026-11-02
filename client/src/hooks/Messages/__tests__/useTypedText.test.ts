import { act, renderHook } from '@testing-library/react';
import useTypedText from '../useTypedText';

const long = 'word '.repeat(200);

describe('useTypedText', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows text present on mount at once', () => {
    const { result } = renderHook(() => useTypedText(long, true));
    expect(result.current).toBe(long);
  });

  it('types out a large block that lands at once on the latest answer', () => {
    const { result, rerender } = renderHook(({ text }) => useTypedText(text, true), {
      initialProps: { text: '' },
    });
    rerender({ text: long });
    expect(result.current.length).toBeLessThan(long.length);

    act(() => jest.advanceTimersByTime(200));
    const partway = result.current.length;
    expect(partway).toBeGreaterThan(0);
    expect(partway).toBeLessThan(long.length);
    expect(long.startsWith(result.current)).toBe(true);

    act(() => jest.advanceTimersByTime(2000));
    expect(result.current).toBe(long);
  });

  it('shows small streamed steps and older answers at once', () => {
    const { result, rerender } = renderHook(({ text, on }) => useTypedText(text, on), {
      initialProps: { text: 'Hello', on: true },
    });
    rerender({ text: 'Hello there, friend.', on: true });
    expect(result.current).toBe('Hello there, friend.');

    rerender({ text: `Hello there, friend. ${long}`, on: false });
    expect(result.current).toBe(`Hello there, friend. ${long}`);
  });
});
