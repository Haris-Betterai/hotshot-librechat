import { act, renderHook } from '@testing-library/react';
import useBeam from './useBeam';

type Props = { landing: boolean; busy: boolean; activity: string; enabled?: boolean };

const setup = (initial: Props) =>
  renderHook((props: Props) => useBeam({ enabled: true, ...props }), { initialProps: initial });

describe('useBeam', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('runs at full strength on the landing screen', () => {
    const { result } = setup({ landing: true, busy: false, activity: '' });
    expect(result.current).toEqual({ mode: 'full', mounted: true });
  });

  it('turns off when the first message is sent and unmounts after the fade', () => {
    const { result, rerender } = setup({ landing: true, busy: false, activity: '' });
    rerender({ landing: false, busy: true, activity: '' });
    expect(result.current).toEqual({ mode: 'off', mounted: true });
    act(() => jest.advanceTimersByTime(700));
    expect(result.current.mounted).toBe(false);
  });

  it('stays off while a reply streams, however long it takes', () => {
    const { result } = setup({ landing: false, busy: true, activity: '' });
    act(() => jest.advanceTimersByTime(60000));
    expect(result.current.mode).toBe('off');
  });

  it('returns dimmed once the composer has been idle, and hides again on typing', () => {
    const { result, rerender } = setup({ landing: false, busy: false, activity: '' });
    act(() => jest.advanceTimersByTime(11999));
    expect(result.current.mode).toBe('off');
    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toEqual({ mode: 'dim', mounted: true });

    rerender({ landing: false, busy: false, activity: 'h' });
    expect(result.current.mode).toBe('off');
    act(() => jest.advanceTimersByTime(12000));
    expect(result.current.mode).toBe('dim');
  });

  it('never shows when disabled', () => {
    const { result } = setup({ landing: true, busy: false, activity: '', enabled: false });
    expect(result.current).toEqual({ mode: 'off', mounted: false });
  });
});
