import { render, screen } from '@testing-library/react';
import Reasoning, { extractLatestHeading } from '../Reasoning';

let mockMessageContext: {
  isSubmitting?: boolean;
  isLatestMessage?: boolean;
  nextType?: string;
} = { isSubmitting: false, isLatestMessage: false, nextType: undefined };

jest.mock('~/Providers', () => ({
  useMessageContext: () => mockMessageContext,
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useExpandCollapse: () => ({ style: {}, ref: { current: null } }),
}));

describe('extractLatestHeading', () => {
  it('returns null when no heading has streamed in yet', () => {
    expect(extractLatestHeading('just some plain reasoning text')).toBeNull();
  });

  it('extracts a single complete heading', () => {
    expect(extractLatestHeading('**Planning engine maintenance**\n\nI need to...')).toBe(
      'Planning engine maintenance',
    );
  });

  it('returns the most recent heading when several stream in back to back with no separator', () => {
    const text =
      'Body text ending in a question.**Exploring product recommendations**\n\nMore body text.';
    expect(extractLatestHeading(`**Planning engine maintenance**\n\n${text}`)).toBe(
      'Exploring product recommendations',
    );
  });

  it('ignores a heading still streaming in with no closing "**" yet', () => {
    const text = '**Planning engine maintenance**\n\nBody text. **Half typed head';
    expect(extractLatestHeading(text)).toBe('Planning engine maintenance');
  });

  it('does not mistake a long emphasized sentence in the body for a heading', () => {
    const longBold = `**${'x'.repeat(90)}**`;
    expect(extractLatestHeading(`**Planning engine maintenance**\n\n${longBold}`)).toBe(
      'Planning engine maintenance',
    );
  });

  it('skips a blank bold span and keeps the last real heading', () => {
    expect(extractLatestHeading('**Planning engine maintenance**\n\nBody. ** **')).toBe(
      'Planning engine maintenance',
    );
  });
});

describe('Reasoning', () => {
  beforeEach(() => {
    mockMessageContext = { isSubmitting: false, isLatestMessage: false, nextType: undefined };
  });

  it('renders nothing when there is no reasoning text', () => {
    const { container } = render(<Reasoning reasoning="" isLast={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the generic "thinking" label before any heading has streamed in', () => {
    mockMessageContext = { isSubmitting: true, isLatestMessage: true };
    render(<Reasoning reasoning="Still warming up, no heading yet." isLast={true} />);
    expect(screen.getByText('com_ui_thinking')).toBeInTheDocument();
  });

  it('shows the live heading instead of "thinking" once one streams in', () => {
    mockMessageContext = { isSubmitting: true, isLatestMessage: true };
    render(
      <Reasoning
        reasoning={'**Planning engine maintenance**\n\nI need to create a plan.'}
        isLast={true}
      />,
    );
    expect(screen.getByText('Planning engine maintenance')).toBeInTheDocument();
    expect(screen.queryByText('com_ui_thinking')).not.toBeInTheDocument();
  });

  it('falls back to "thoughts" once generation is no longer live', () => {
    mockMessageContext = { isSubmitting: false, isLatestMessage: true };
    render(<Reasoning reasoning={'**Planning engine maintenance**\n\nDone.'} isLast={true} />);
    expect(screen.getByText('com_ui_thoughts')).toBeInTheDocument();
  });

  it('shows "thoughts" for an earlier reasoning block that is no longer the last one', () => {
    mockMessageContext = { isSubmitting: true, isLatestMessage: true };
    render(<Reasoning reasoning={'**Planning engine maintenance**\n\nDone.'} isLast={false} />);
    expect(screen.getByText('com_ui_thoughts')).toBeInTheDocument();
  });
});
