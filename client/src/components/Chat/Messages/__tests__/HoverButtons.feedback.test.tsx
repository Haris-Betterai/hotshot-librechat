import React from 'react';
import { RecoilRoot } from 'recoil';
import { render, screen } from '@testing-library/react';
import type { TConversation, TMessage } from 'librechat-data-provider';
import HoverButtons from '../HoverButtons';

jest.mock('@librechat/client', () => {
  const Icon = () => <svg />;
  return {
    EditIcon: Icon,
    Clipboard: Icon,
    CheckMark: Icon,
    RegenerateIcon: Icon,
    ThumbUpIcon: Icon,
    ThumbDownIcon: Icon,
    Button: () => null,
    OGDialog: () => null,
    OGDialogContent: () => null,
    OGDialogTitle: () => null,
  };
});
jest.mock('../MessageAudio', () => ({ __esModule: true, default: () => null }));
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useGenerationsByLatest: () => ({
    hideEditButton: false,
    regenerateEnabled: true,
    isEditableEndpoint: true,
  }),
}));

const conversation = { conversationId: 'c1', endpoint: 'agents' } as TConversation;
const baseProps = {
  index: 0,
  isEditing: false,
  enterEdit: jest.fn(),
  copyToClipboard: jest.fn(),
  conversation,
  isSubmitting: false,
  regenerate: jest.fn(),
  handleContinue: jest.fn(),
  latestMessageId: 'm1',
  isLast: true,
  handleFeedback: jest.fn(),
};

const renderButtons = (message: Partial<TMessage>) =>
  render(
    <RecoilRoot>
      <HoverButtons {...baseProps} message={{ messageId: 'm1', ...message } as TMessage} />
    </RecoilRoot>,
  );

describe('HoverButtons feedback and regenerate', () => {
  it('shows thumbs up, thumbs down, copy and regenerate on the latest answer', () => {
    renderButtons({ isCreatedByUser: false });
    expect(screen.getByTitle('com_ui_feedback_positive')).toBeInTheDocument();
    expect(screen.getByTitle('com_ui_feedback_negative')).toBeInTheDocument();
    expect(screen.getByTitle('com_ui_copy_to_clipboard')).toBeInTheDocument();
    expect(screen.getByTitle('com_ui_regenerate')).toBeInTheDocument();
  });

  it('does not show feedback or regenerate on user messages', () => {
    renderButtons({ isCreatedByUser: true });
    expect(screen.queryByTitle('com_ui_feedback_positive')).not.toBeInTheDocument();
    expect(screen.queryByTitle('com_ui_regenerate')).not.toBeInTheDocument();
    expect(screen.getByTitle('com_ui_edit')).toBeInTheDocument();
  });
});
