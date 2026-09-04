import { renderHook, act } from '@testing-library/react';
import useSmoothedStreamText from '../useSmoothedStreamText';

describe('useSmoothedStreamText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the full text immediately when not streaming', () => {
    const { result } = renderHook(() => useSmoothedStreamText('hello world', false));
    expect(result.current).toBe('hello world');
  });

  it('starts empty and grows toward the target while streaming', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }: { text: string; streaming: boolean }) =>
        useSmoothedStreamText(text, streaming),
      { initialProps: { text: '', streaming: true } },
    );

    expect(result.current).toBe('');

    rerender({ text: 'a'.repeat(500), streaming: true });

    act(() => {
      jest.advanceTimersByTime(40);
    });
    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current.length).toBeLessThan(500);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe('a'.repeat(500));
  });

  it('snaps to the full text as soon as streaming ends, even mid-reveal', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }: { text: string; streaming: boolean }) =>
        useSmoothedStreamText(text, streaming),
      { initialProps: { text: 'a'.repeat(500), streaming: true } },
    );

    act(() => {
      jest.advanceTimersByTime(40);
    });
    expect(result.current.length).toBeLessThan(500);

    rerender({ text: 'a'.repeat(500), streaming: false });
    expect(result.current).toBe('a'.repeat(500));
  });

  it('does not lag more than the capped amount behind a large burst', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }: { text: string; streaming: boolean }) =>
        useSmoothedStreamText(text, streaming),
      { initialProps: { text: '', streaming: true } },
    );

    rerender({ text: 'a'.repeat(5000), streaming: true });

    act(() => {
      jest.advanceTimersByTime(40);
    });
    // First tick should already have snapped close to the target rather than
    // starting a multi-second crawl from zero.
    expect(result.current.length).toBeGreaterThan(4500);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('a'.repeat(5000));
  });

  it('clamps rather than replays when the text shrinks (edit/regenerate)', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }: { text: string; streaming: boolean }) =>
        useSmoothedStreamText(text, streaming),
      { initialProps: { text: 'a'.repeat(500), streaming: true } },
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe('a'.repeat(500));

    rerender({ text: 'short', streaming: true });
    expect(result.current).toBe('short');
  });
});
