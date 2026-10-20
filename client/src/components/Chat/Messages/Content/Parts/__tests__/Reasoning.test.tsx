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

let mockShowDetail = true;

jest.mock('~/hooks/useReasoningDetail', () => ({
  __esModule: true,
  default: () => mockShowDetail,
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

describe('Reasoning (customer view)', () => {
  const body =
    '**Considering product details**\n\nI need to figure out the causes. Maybe ask mileage?';

  beforeEach(() => {
    mockShowDetail = false;
    mockMessageContext = { isSubmitting: true, isLatestMessage: true, nextType: undefined };
  });

  afterAll(() => {
    mockShowDetail = true;
  });

  it('shows only the heading as a live status, never the reasoning body', () => {
    render(<Reasoning reasoning={body} isLast={true} />);
    expect(screen.getByRole('status')).toHaveTextContent('Considering product details');
    expect(screen.queryByText(/Maybe ask mileage/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing once the reply has finished', () => {
    mockMessageContext = { isSubmitting: false, isLatestMessage: true };
    const { container } = render(<Reasoning reasoning={body} isLast={true} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Reasoning (staff view)', () => {
  it('keeps the full thinking block with copy control', () => {
    mockShowDetail = true;
    mockMessageContext = { isSubmitting: false, isLatestMessage: true };
    render(<Reasoning reasoning={'**Heading**\n\nSecret body text.'} isLast={true} />);
    expect(screen.getByText(/Secret body text/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('com_ui_copy_thoughts_to_clipboard').length).toBeGreaterThan(0);
  });
});

describe('Reasoning', () => {
  beforeEach(() => {
    mockShowDetail = true;
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

  it('keeps the heading as the label once generation is no longer live', () => {
    mockMessageContext = { isSubmitting: false, isLatestMessage: true };
    render(<Reasoning reasoning={'**Planning engine maintenance**\n\nDone.'} isLast={true} />);
    expect(screen.getByText('Planning engine maintenance')).toBeInTheDocument();
    expect(screen.queryByText('com_ui_thoughts')).not.toBeInTheDocument();
  });

  it('keeps the heading for an earlier reasoning block that is no longer the last one', () => {
    mockMessageContext = { isSubmitting: true, isLatestMessage: true };
    render(<Reasoning reasoning={'**Planning engine maintenance**\n\nDone.'} isLast={false} />);
    expect(screen.getByText('Planning engine maintenance')).toBeInTheDocument();
  });

  it('falls back to "thoughts" for a finished block that never got a heading', () => {
    mockMessageContext = { isSubmitting: false, isLatestMessage: true };
    render(<Reasoning reasoning="Just plain reasoning text, no bold heading." isLast={true} />);
    expect(screen.getByText('com_ui_thoughts')).toBeInTheDocument();
  });
});
