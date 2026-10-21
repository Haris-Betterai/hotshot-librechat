/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { RecoilRoot } from 'recoil';
import { render, screen } from '@testing-library/react';
import type { TMessage } from 'librechat-data-provider';
import type { TMessageChatContext } from '~/common';
import ContentRender from '../ContentRender';

jest.mock('~/components/Chat/Messages/ui/MessageTimestamp', () => ({
  __esModule: true,
  default: () => <time data-testid="timestamp" />,
}));
jest.mock('~/components/Chat/Messages/ui/MessageModelBadge', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/components/Chat/Messages/Content/ContentParts', () => ({
  __esModule: true,
  default: () => <div data-testid="content">hello</div>,
}));
jest.mock('~/components/Chat/Messages/ui/PlaceholderRow', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/components/Chat/Messages/SiblingSwitch', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~/components/Chat/Messages/HoverButtons', () => ({
  __esModule: true,
  default: () => <div data-testid="hover-buttons" />,
}));
jest.mock('~/components/Chat/Messages/MessageIcon', () => ({
  __esModule: true,
  default: () => <div data-testid="message-icon" />,
}));
jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({
    data: { modelSpecs: { list: [{ name: 'spec', label: 'Hotshot Secret AI' }] } },
  }),
}));
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useAttachments: () => ({ attachments: [], searchResults: undefined }),
  useContentMetadata: () => ({ hasParallelContent: false }),
  useMessageActions: () => ({
    edit: false,
    index: 0,
    enterEdit: jest.fn(),
    conversation: { conversationId: 'c1', spec: 'spec' },
    messageLabel: 'Guest',
    handleContinue: jest.fn(),
    handleFeedback: jest.fn(),
    latestMessageId: 'm2',
    copyToClipboard: jest.fn(),
    regenerateMessage: jest.fn(),
    latestMessageDepth: 1,
  }),
}));

const chatContext = { isSubmitting: false } as TMessageChatContext;

const renderMessage = (message: Partial<TMessage>) =>
  render(
    <RecoilRoot>
      <ContentRender
        message={{ messageId: 'm1', depth: 0, ...message } as TMessage}
        chatContext={chatContext}
        siblingIdx={0}
        siblingCount={1}
        setSiblingIdx={jest.fn()}
        currentEditId={-1}
        setCurrentEditId={jest.fn()}
      />
    </RecoilRoot>,
  );

describe('ContentRender modern layout', () => {
  it('renders user messages as right-aligned bubbles without avatar or visible name', () => {
    const { container } = renderMessage({ isCreatedByUser: true });
    expect(screen.queryByTestId('message-icon')).not.toBeInTheDocument();
    expect(container.querySelector('.message-render')?.className).toContain('justify-end');
    expect(container.querySelector('.user-bubble')?.className).toContain('bg-neutral-100');
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.className).toContain('sr-only');
    expect(heading).toHaveTextContent('com_ui_prompt');
    expect(screen.getByTestId('hover-buttons')).toBeInTheDocument();
  });

  it('renders assistant messages with the avatar and the spec label', () => {
    const { container } = renderMessage({ isCreatedByUser: false });
    expect(screen.getByTestId('message-icon')).toBeInTheDocument();
    expect(container.querySelector('.user-bubble')).toBeNull();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Hotshot Secret AI');
    expect(heading.className).not.toContain('sr-only');
  });
});
