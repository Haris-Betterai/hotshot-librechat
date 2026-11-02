import { act, renderHook } from '@testing-library/react';
import useTypedText from '../useTypedText';

const long = 'word '.repeat(200);
const opts = (enabled: boolean, live: boolean, slot = 'c1:0') => ({ enabled, live, slot });

describe('useTypedText', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows history at once', () => {
    const { result } = renderHook(() => useTypedText(long, opts(true, false, 'history')));
    expect(result.current).toBe(long);
  });

  it('types out a large block that lands at once on the latest answer', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypedText(text, opts(true, true, 'grow')),
      {
        initialProps: { text: '' },
      },
    );
    rerender({ text: long });
    act(() => jest.advanceTimersByTime(200));
    const partway = result.current.length;
    expect(partway).toBeGreaterThan(0);
    expect(partway).toBeLessThan(long.length);
    expect(long.startsWith(result.current)).toBe(true);

    act(() => jest.advanceTimersByTime(3000));
    expect(result.current).toBe(long);
  });

  it('types out text that mounts already complete while the reply is live', () => {
    const { result } = renderHook(() => useTypedText(long, opts(true, true, 'mount')));
    expect(result.current.length).toBeLessThan(long.length);
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current).toBe(long);
  });

  it('keeps typing when the finished reply remounts the text part', () => {
    const first = renderHook(({ on }) => useTypedText(long, opts(on, true, 'remount')), {
      initialProps: { on: true },
    });
    act(() => jest.advanceTimersByTime(200));
    const before = first.result.current.length;
    first.rerender({ on: false });
    expect(first.result.current).toBe(long);
    first.unmount();

    const second = renderHook(() => useTypedText(long, opts(true, false, 'remount')));
    expect(second.result.current.length).toBe(before);
    act(() => jest.advanceTimersByTime(3000));
    expect(second.result.current).toBe(long);
  });

  it('does not resume another answer from a previous reveal in the same slot', () => {
    const first = renderHook(() => useTypedText(long, opts(true, true, 'reuse')));
    act(() => jest.advanceTimersByTime(200));
    first.unmount();
    const other = `Different ${long}`;
    const second = renderHook(() => useTypedText(other, opts(true, false, 'reuse')));
    expect(second.result.current).toBe(other);
  });

  it('shows small streamed steps and older answers at once', () => {
    const { result, rerender } = renderHook(
      ({ text, on }) => useTypedText(text, opts(on, true, 'small')),
      { initialProps: { text: 'Hello', on: true } },
    );
    rerender({ text: 'Hello there, friend.', on: true });
    expect(result.current).toBe('Hello there, friend.');

    rerender({ text: `Hello there, friend. ${long}`, on: false });
    expect(result.current).toBe(`Hello there, friend. ${long}`);
  });
});
