import { render, screen, fireEvent } from 'test/layout-test-utils';
import LevelSlider from '../LevelSlider';

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));

const names = ['Auto', 'Deep', 'Ultra'];

function mockTrack(slider: HTMLElement) {
  const track = slider.parentElement as HTMLElement;
  jest.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 336,
    top: 0,
    bottom: 36,
    width: 336,
    height: 36,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return track;
}

beforeAll(() => {
  Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, configurable: true });
});

it('exposes slider semantics and the level name', () => {
  render(<LevelSlider names={names} selectedIndex={1} onChange={jest.fn()} />);
  const slider = screen.getByRole('slider');
  expect(slider).toHaveAttribute('aria-valuemin', '0');
  expect(slider).toHaveAttribute('aria-valuemax', '2');
  expect(slider).toHaveAttribute('aria-valuenow', '1');
  expect(slider).toHaveAttribute('aria-valuetext', 'Deep');
});

it.each([
  ['ArrowRight', 1, 2],
  ['ArrowLeft', 1, 0],
  ['Home', 2, 0],
  ['End', 0, 2],
])('%s moves the value', (key, from, to) => {
  const onChange = jest.fn();
  render(<LevelSlider names={names} selectedIndex={from} onChange={onChange} />);
  fireEvent.keyDown(screen.getByRole('slider'), { key });
  expect(onChange).toHaveBeenCalledWith(to);
});

it('does not move past the ends', () => {
  const onChange = jest.fn();
  render(<LevelSlider names={names} selectedIndex={2} onChange={onChange} />);
  fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
  expect(onChange).not.toHaveBeenCalled();
});

it('selects the nearest stop when the track is clicked and follows a drag', () => {
  const onChange = jest.fn();
  render(<LevelSlider names={names} selectedIndex={0} onChange={onChange} />);
  const track = mockTrack(screen.getByRole('slider'));
  fireEvent.pointerDown(track, { clientX: 336 });
  expect(onChange).toHaveBeenLastCalledWith(2);
  fireEvent.pointerMove(track, { clientX: 168 });
  expect(onChange).toHaveBeenLastCalledWith(1);
});

it('reflects the selection in aria-valuetext after a change', () => {
  const { rerender } = render(<LevelSlider names={names} selectedIndex={0} onChange={jest.fn()} />);
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Auto');
  rerender(<LevelSlider names={names} selectedIndex={2} onChange={jest.fn()} />);
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Ultra');
});
