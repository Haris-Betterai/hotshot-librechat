import { render, screen } from '@testing-library/react';
import type { TMessage } from 'librechat-data-provider';
import MessageModelBadge, { getRespondingModel } from '../MessageModelBadge';

function makeMessage(metadata?: Record<string, unknown>): TMessage {
  return { metadata } as unknown as TMessage;
}

describe('getRespondingModel', () => {
  it('reads the model captured per response', () => {
    expect(getRespondingModel(makeMessage({ respondingModel: 'gpt-5.6-luna' }))).toBe(
      'gpt-5.6-luna',
    );
  });

  it('returns undefined for a message with no metadata (older messages, user turns)', () => {
    expect(getRespondingModel(makeMessage(undefined))).toBeUndefined();
    expect(getRespondingModel(undefined)).toBeUndefined();
    expect(getRespondingModel(null)).toBeUndefined();
  });

  it('returns undefined for a non-string or empty value rather than surfacing garbage', () => {
    expect(getRespondingModel(makeMessage({ respondingModel: 42 }))).toBeUndefined();
    expect(getRespondingModel(makeMessage({ respondingModel: '' }))).toBeUndefined();
  });
});

describe('MessageModelBadge', () => {
  it('renders the model name when present', () => {
    render(<MessageModelBadge message={makeMessage({ respondingModel: 'gpt-5.6' })} />);
    expect(screen.getByText('gpt-5.6')).toBeInTheDocument();
  });

  it('renders nothing when the message carries no responding model', () => {
    const { container } = render(<MessageModelBadge message={makeMessage(undefined)} />);
    expect(container).toBeEmptyDOMElement();
  });
});
