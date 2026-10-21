import { ContentTypes } from 'librechat-data-provider';
import { render, screen } from 'test/layout-test-utils';
import type { TMessageContentParts } from 'librechat-data-provider';
import StatusLine, { resolveStatus } from '../Status';

const SUFFIX = '_mcp_hotshot-secret-mcp';

const tool = (name: string, args: Record<string, unknown>, output = ''): TMessageContentParts =>
  ({
    type: ContentTypes.TOOL_CALL,
    [ContentTypes.TOOL_CALL]: { id: `${name}-${output}`, name: `${name}${SUFFIX}`, args, output },
  }) as unknown as TMessageContentParts;

const text = (value: string): TMessageContentParts =>
  ({ type: ContentTypes.TEXT, text: value }) as TMessageContentParts;

const think = (value: string): TMessageContentParts =>
  ({ type: ContentTypes.THINK, think: value }) as TMessageContentParts;

const finished = [
  tool('search_faqs', {}, 'ok'),
  tool('search_products_by_name', { partial_name: 'Diesel Extreme' }, 'ok'),
];

describe('resolveStatus', () => {
  it('is thinking before anything arrives, including an empty text part', () => {
    expect(resolveStatus(undefined)).toEqual({ kind: 'thinking' });
    expect(resolveStatus([text('')])).toEqual({ kind: 'thinking' });
  });

  it('reports the active tool of a tool group', () => {
    const status = resolveStatus([
      tool('search_faqs', {}, 'ok'),
      tool('search_products_by_name', { partial_name: 'Diesel Extreme' }),
    ]);
    expect(status).toMatchObject({ kind: 'tool', name: `search_products_by_name${SUFFIX}` });
  });

  it('is writing once the tools are done and no text has arrived', () => {
    expect(resolveStatus(finished)).toEqual({ kind: 'writing' });
    expect(resolveStatus([...finished, text('')])).toEqual({ kind: 'writing' });
  });

  it('disappears once answer text streams', () => {
    expect(resolveStatus([...finished, text('Use Diesel Extreme')])).toBeNull();
  });

  it('defers to the reasoning block and to a lone in-flight tool row', () => {
    expect(resolveStatus([think('**Planning**\n\nHmm')])).toBeNull();
    expect(resolveStatus([tool('search_faqs', {})])).toBeNull();
  });
});

describe('StatusLine', () => {
  it('shows a friendly label for the active tool', () => {
    render(
      <StatusLine
        isSubmitting
        content={[
          tool('search_faqs', {}, 'ok'),
          tool('search_products_by_name', { partial_name: 'Diesel Extreme' }),
        ]}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Looking up Diesel Extreme…');
  });

  it('shows the writing label and no lone dot placeholder', () => {
    const { container } = render(<StatusLine isSubmitting content={finished} />);
    expect(screen.getByRole('status')).toHaveTextContent('Writing the answer…');
    expect(container.querySelector('.result-thinking')).toBeNull();
  });

  it('shows thinking when empty', () => {
    render(<StatusLine isSubmitting content={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Thinking…');
  });

  it('renders nothing when idle or when text is streaming', () => {
    const { container, rerender } = render(<StatusLine isSubmitting={false} content={finished} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StatusLine isSubmitting content={[...finished, text('Hello')]} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
