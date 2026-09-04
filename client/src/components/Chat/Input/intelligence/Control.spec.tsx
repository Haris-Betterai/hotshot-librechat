import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Control from './Control';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

const labels = ['Fast', 'Balanced', 'Deep', 'Deeper', 'Deepest'];

function Harness() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  return (
    <Control
      heading="Intelligence"
      labels={labels}
      selectedIndex={selectedIndex}
      onChange={setSelectedIndex}
    />
  );
}

describe('Intelligence control', () => {
  it('shows only the selected level in the compact trigger while retaining an accessible name', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Intelligence Fast' });
    expect(trigger.textContent).toBe('Fast');
    expect(trigger).toHaveAttribute('title', 'Intelligence: Fast');
    expect(trigger).not.toHaveClass('w-full');
  });

  it('opens a named slider and updates the selected level with the keyboard', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Intelligence Fast' }));
    const slider = screen.getByRole('slider', { name: 'Intelligence' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Fast');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Balanced');
    expect(screen.getByRole('button', { name: 'Intelligence Balanced' })).toBeInTheDocument();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Deep');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Deeper');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Deepest');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '4');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Fast');
  });

  it('keeps slider clicks from focusing the surrounding message composer', () => {
    const onComposerClick = jest.fn();
    render(
      <div role="presentation" onClick={onComposerClick}>
        <Harness />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Intelligence Fast' }));
    fireEvent.click(screen.getByRole('slider', { name: 'Intelligence' }));
    expect(onComposerClick).not.toHaveBeenCalled();
    expect(screen.getByRole('slider', { name: 'Intelligence' })).toBeInTheDocument();
  });

  it('closes on Escape without discarding the selected level', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Intelligence Fast' }));
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });
    fireEvent.keyDown(slider, { key: 'Escape' });
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intelligence Deepest' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('does not offer artificial choices for a single configured model', () => {
    render(
      <Control heading="Intelligence" labels={['Fast']} selectedIndex={0} onChange={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Intelligence Fast' })).toBeDisabled();
  });
});
