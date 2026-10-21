import React from 'react';
import { RecoilRoot } from 'recoil';
import { Tools, Constants, ContentTypes } from 'librechat-data-provider';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TAttachment, TMessageContentParts } from 'librechat-data-provider';
import { scheduleMessageContentLayoutReconcile } from '~/hooks';
import ToolCallGroup from '../ToolCallGroup';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, values?: Record<string | number, string>) => {
    if (key === 'com_ui_tools') {
      return 'Tools';
    }
    if (key === 'com_ui_used_n_tools') {
      return `Used ${values?.[0]} tools`;
    }
    if (key === 'com_ui_asked_n_questions') {
      return `Asked ${values?.[0]} questions`;
    }
    if (key === 'com_ui_asking_n_questions') {
      return `Asking ${values?.[0]} questions`;
    }
    if (key === 'com_ui_via_server') {
      return `via ${values?.[0]}`;
    }
    return key;
  },
  useExpandCollapse: (isExpanded: boolean) => ({
    style: {
      display: 'grid',
      gridTemplateRows: isExpanded ? '1fr' : '0fr',
    },
    ref: { current: null },
  }),
  scheduleMessageContentLayoutReconcile: jest.fn(() => jest.fn()),
}));

let mockShowDetail = true;
jest.mock('~/hooks/useReasoningDetail', () => ({
  __esModule: true,
  default: () => mockShowDetail,
}));

jest.mock('~/hooks/MCP', () => ({
  useMCPIconMap: () => new Map(),
}));

jest.mock('../ToolOutput', () => ({
  StackedToolIcons: ({ toolNames }: { toolNames: string[] }) => (
    <span data-testid="stacked-icons" data-tool-names={toolNames.join(',')} />
  ),
  getMCPServerName: () => '',
}));

jest.mock('lucide-react', () => ({
  Check: () => <span>{'check'}</span>,
  ChevronDown: () => <span>{'chevron'}</span>,
  Users: () => <span>{'users'}</span>,
  MessageCircleQuestion: () => <span data-testid="question-icon">{'question'}</span>,
}));

jest.mock('~/utils/approval', () => ({
  ASK_USER_QUESTION: 'ask_user_question',
}));

jest.mock('~/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
  getToolDisplayLabel: (name: string) =>
    ['execute_code', 'bash_tool', 'run_tools_with_code', 'run_tools_with_bash'].includes(name)
      ? 'Code'
      : name,
}));

jest.mock('../Parts', () => ({
  AttachmentGroup: ({ attachments }: { attachments?: TAttachment[] }) => (
    <div data-testid="attachment-group" data-count={attachments?.length ?? 0} />
  ),
}));

const makePart = (
  id: string,
  output = 'done',
  name = 'fetch_image',
  args: string | Record<string, unknown> = '{}',
): TMessageContentParts =>
  ({
    type: ContentTypes.TOOL_CALL,
    [ContentTypes.TOOL_CALL]: {
      id,
      name,
      args,
      output,
    },
  }) as unknown as TMessageContentParts;

const imageAttachment: TAttachment = {
  filename: 'foo.png',
  filepath: '/files/foo.png',
  width: 128,
  height: 128,
  messageId: 'm1',
  toolCallId: 't1',
  conversationId: 'c1',
} as unknown as TAttachment;

const fileAttachment: TAttachment = {
  filename: 'bar.pdf',
  filepath: '/files/bar.pdf',
  messageId: 'm1',
  toolCallId: 't2',
  conversationId: 'c1',
} as unknown as TAttachment;

const renderGroup = (props: React.ComponentProps<typeof ToolCallGroup>) =>
  render(
    <RecoilRoot>
      <ToolCallGroup {...props} />
    </RecoilRoot>,
  );

const mockScheduleMessageContentLayoutReconcile =
  scheduleMessageContentLayoutReconcile as jest.Mock;

describe('ToolCallGroup image hoisting', () => {
  const parts = [
    { part: makePart('t1'), idx: 0 },
    { part: makePart('t2'), idx: 1 },
  ];

  const baseProps = {
    parts,
    isSubmitting: false,
    isLast: false,
    lastContentIdx: 1,
    renderPart: (_p: TMessageContentParts, idx: number) => (
      <div data-testid={`inner-${idx}`} key={idx}>
        {'inner'}
      </div>
    ),
  } satisfies React.ComponentProps<typeof ToolCallGroup>;

  beforeEach(() => {
    mockScheduleMessageContentLayoutReconcile.mockClear();
  });

  it('renders an AttachmentGroup outside the collapsible container with all attachments', () => {
    renderGroup({
      ...baseProps,
      groupAttachments: [imageAttachment, fileAttachment],
    });

    const group = screen.getByTestId('attachment-group');
    expect(group).toBeInTheDocument();
    expect(group.getAttribute('data-count')).toBe('2');
  });

  it('hoists non-image attachments so they survive collapse', () => {
    renderGroup({
      ...baseProps,
      groupAttachments: [fileAttachment],
    });

    const group = screen.getByTestId('attachment-group');
    expect(group).toBeInTheDocument();
    expect(group.getAttribute('data-count')).toBe('1');
  });

  it('does not render an AttachmentGroup when there are no group attachments', () => {
    renderGroup(baseProps);
    expect(screen.queryByTestId('attachment-group')).not.toBeInTheDocument();
  });

  it('does not reconcile layout for an initially collapsed completed group', () => {
    renderGroup(baseProps);
    expect(mockScheduleMessageContentLayoutReconcile).not.toHaveBeenCalled();
  });

  it('does not render tool bodies for an initially collapsed large completed group', () => {
    const largeParts = Array.from({ length: 59 }, (_, idx) => ({
      part: makePart(`t${idx}`),
      idx,
    }));
    const renderPart = jest.fn((_p: TMessageContentParts, idx: number) => (
      <div data-testid={`inner-${idx}`} key={idx}>
        {'inner'}
      </div>
    ));

    renderGroup({
      ...baseProps,
      parts: largeParts,
      lastContentIdx: largeParts.length - 1,
      renderPart,
    });

    expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();
    expect(renderPart).not.toHaveBeenCalled();
    expect(screen.queryByTestId('inner-0')).not.toBeInTheDocument();
  });

  it('mounts tool bodies when a collapsed group is expanded', () => {
    renderGroup(baseProps);

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));

    expect(screen.getByTestId('inner-0')).toBeInTheDocument();
    expect(screen.getByTestId('inner-1')).toBeInTheDocument();
  });

  it('unmounts tool bodies after a collapsed group finishes transitioning', () => {
    renderGroup(baseProps);

    const button = screen.getByRole('button', { name: 'Tools' });
    const collapsible = button.nextElementSibling as HTMLElement;
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByTestId('inner-0')).toBeInTheDocument();

    fireEvent.transitionEnd(collapsible);

    expect(screen.queryByTestId('inner-0')).not.toBeInTheDocument();
  });

  it('reconciles layout after the group collapses from an expanded state', async () => {
    renderGroup(baseProps);

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    expect(mockScheduleMessageContentLayoutReconcile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));

    await waitFor(() => {
      expect(mockScheduleMessageContentLayoutReconcile).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the image AttachmentGroup as a sibling of the collapsible panel, not a child', () => {
    const { container } = renderGroup({
      ...baseProps,
      groupAttachments: [imageAttachment],
    });

    const outer = container.firstChild as HTMLElement;
    const attachmentGroup = screen.getByTestId('attachment-group');
    expect(attachmentGroup.parentElement).toBe(outer);

    const collapsible = outer.querySelector('[style]');
    expect(collapsible?.contains(attachmentGroup)).toBe(false);
  });

  it('summarizes mixed bash PTC and bash_tool calls as one Code tool family', () => {
    renderGroup({
      ...baseProps,
      parts: [
        {
          part: makePart('t1', 'ptc done', Constants.PROGRAMMATIC_TOOL_CALLING, {
            code: 'echo via ptc',
          }),
          idx: 0,
        },
        {
          part: makePart('t2', 'bash done', Tools.bash_tool, {
            command: 'echo via bash',
          }),
          idx: 1,
        },
      ],
    });

    expect(screen.getByText('— Code')).toBeInTheDocument();
    expect(screen.queryByText(/Code, bash_tool/)).not.toBeInTheDocument();
    expect(screen.getByTestId('stacked-icons')).toHaveAttribute(
      'data-tool-names',
      'bash_tool,bash_tool',
    );
  });

  it('labels a homogeneous ask_user_question group as its own category', () => {
    renderGroup({
      ...baseProps,
      parts: [
        { part: makePart('q1', 'blue', 'ask_user_question'), idx: 0 },
        { part: makePart('q2', 'staging', 'ask_user_question'), idx: 1 },
      ],
    });

    // Own verb, not "Used N tools"; question glyph instead of stacked wrenches;
    // raw-name summary suppressed (like subagent groups).
    expect(screen.getByRole('button', { name: 'Asked 2 questions' })).toBeInTheDocument();
    expect(screen.queryByText('Used 2 tools')).not.toBeInTheDocument();
    expect(screen.getByTestId('question-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('stacked-icons')).not.toBeInTheDocument();
    expect(screen.queryByText(/— ask_user_question/)).not.toBeInTheDocument();
  });

  it('uses the present tense while a multi-question turn is still streaming', () => {
    renderGroup({
      ...baseProps,
      isSubmitting: true,
      parts: [
        { part: makePart('q1', 'blue', 'ask_user_question'), idx: 0 },
        // Second question not yet answered (no output) — turn still in flight.
        { part: makePart('q2', '', 'ask_user_question'), idx: 1 },
      ],
    });

    expect(screen.getByRole('button', { name: 'Asking 2 questions' })).toBeInTheDocument();
  });

  it('keeps the generic "Tools" label for a mixed group containing a question', () => {
    renderGroup({
      ...baseProps,
      parts: [
        { part: makePart('t1', 'result', 'web_search'), idx: 0 },
        { part: makePart('q1', 'blue', 'ask_user_question'), idx: 1 },
      ],
    });

    expect(screen.getByRole('button', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByTestId('stacked-icons')).toBeInTheDocument();
  });
});

describe('ToolCallGroup customer view', () => {
  const SUFFIX = '_mcp_hotshot-secret-mcp';
  const mcp = (id: string, name: string, args: Record<string, unknown>, output = 'ok') =>
    makePart(id, output, `${name}${SUFFIX}`, args);
  const props = {
    parts: [
      { part: mcp('a', 'search_products_by_name', { partial_name: 'Diesel Extreme' }), idx: 0 },
      {
        part: mcp('b', 'search_products_by_name', { partial_name: 'Everyday Diesel Treatment' }),
        idx: 1,
      },
      { part: mcp('c', 'search_faqs', {}), idx: 2 },
    ],
    isSubmitting: false,
    isLast: false,
    lastContentIdx: 2,
    renderPart: (_p: TMessageContentParts, idx: number) => (
      <div data-testid={`inner-${idx}`} key={idx} />
    ),
  } satisfies React.ComponentProps<typeof ToolCallGroup>;

  beforeEach(() => {
    mockShowDetail = false;
  });
  afterEach(() => {
    mockShowDetail = true;
  });

  it('collapses to one calm chip with no stray glyph', () => {
    const { container } = renderGroup(props);
    const chip = screen.getByRole('button', { name: 'Checked 3 sources' });
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    expect(container.textContent).not.toMatch(/[└⌐┌┐┘⬤●]/);
    expect(screen.queryByText(/hotshot-secret-mcp/)).not.toBeInTheDocument();
  });

  it('expands to a deduped, friendly step list instead of raw rows', () => {
    const { container } = renderGroup(props);
    fireEvent.click(screen.getByRole('button', { name: 'Checked 3 sources' }));
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([
      'checkLooked up Diesel Extreme and Everyday Diesel Treatment',
      'checkChecked FAQs',
    ]);
    expect(screen.queryByTestId('inner-0')).not.toBeInTheDocument();
    expect(container.querySelector('.border-l')).toBeNull();
  });

  it('stays collapsed while tools run', () => {
    renderGroup({
      ...props,
      isSubmitting: true,
      parts: [...props.parts.slice(0, 2), { part: mcp('c', 'search_faqs', {}, ''), idx: 2 }],
    });
    expect(screen.getByRole('button', { name: 'com_ui_using_n_tools' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps raw per-call rows for staff', () => {
    mockShowDetail = true;
    renderGroup(props);
    fireEvent.click(screen.getByRole('button', { name: 'Checked 3 sources' }));
    expect(screen.getByTestId('inner-0')).toBeInTheDocument();
  });
});
