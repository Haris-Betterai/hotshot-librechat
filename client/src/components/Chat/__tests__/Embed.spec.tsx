import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TEmbedWidgetSettings } from 'librechat-data-provider';
import { DEFAULT_EMBED_WIDGET_SETTINGS } from 'librechat-data-provider';
import EmbedHeader from '../EmbedHeader';
import EmbedLanding from '../EmbedLanding';

let mockSettings: TEmbedWidgetSettings = DEFAULT_EMBED_WIDGET_SETTINGS;
const mockSubmit = jest.fn();
const mockNewConvo = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
    setQueryData: jest.fn(),
  }),
}));
jest.mock('~/hooks/useEmbedWidgetSettings', () => ({
  __esModule: true,
  default: () => ({ settings: mockSettings, iconUrl: '/icon.png', isEmbed: true }),
}));
jest.mock('~/Providers', () => ({
  useChatContext: () => ({ conversation: { agent_id: 'ag', conversationId: 'c' } }),
  useAgentsMapContext: () => ({ ag: { name: 'Agent Name' } }),
}));
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useNewConvo: () => ({ newConversation: mockNewConvo }),
  useSubmitMessage: () => ({ submitMessage: mockSubmit }),
}));
jest.mock('~/utils', () => ({ clearMessagesCache: jest.fn() }));
jest.mock('~/components/Chat/Input/ConversationStarters', () => ({
  __esModule: true,
  default: () => <div data-testid="spec-starters" />,
}));

let parentPost: jest.SpyInstance;
beforeEach(() => {
  mockSettings = DEFAULT_EMBED_WIDGET_SETTINGS;
  mockSubmit.mockClear();
  mockNewConvo.mockClear();
  parentPost = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
});
afterEach(() => parentPost.mockRestore());

describe('EmbedHeader', () => {
  it('renders title and subtitle, falls back to agent name', () => {
    mockSettings = {
      ...DEFAULT_EMBED_WIDGET_SETTINGS,
      title: 'Support',
      subtitle: 'We reply fast',
    };
    const { unmount } = render(<EmbedHeader />);
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('We reply fast')).toBeInTheDocument();
    unmount();
    mockSettings = DEFAULT_EMBED_WIDGET_SETTINGS;
    render(<EmbedHeader />);
    expect(screen.getByText('Agent Name')).toBeInTheDocument();
  });

  it('close button posts the close message and is at least 40px', () => {
    render(<EmbedHeader />);
    const close = screen.getByRole('button', { name: 'com_ui_embed_close' });
    expect(close.className).toMatch(/h-10/);
    expect(close.className).toMatch(/w-10/);
    fireEvent.click(close);
    expect(parentPost).toHaveBeenCalledWith({ type: 'hotshot-embed-close' }, '*');
  });

  it('Escape closes when no overlay is open', () => {
    render(<EmbedHeader />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(parentPost).toHaveBeenCalledWith({ type: 'hotshot-embed-close' }, '*');
  });

  it('Escape does not close while a dialog or menu is open', () => {
    render(
      <>
        <div role="menu" />
        <EmbedHeader />
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(parentPost).not.toHaveBeenCalled();
  });

  it('new chat starts a conversation for the same agent', () => {
    render(<EmbedHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_embed_new_chat' }));
    expect(mockNewConvo).toHaveBeenCalledWith({
      template: expect.objectContaining({ agent_id: 'ag' }),
    });
  });
});

describe('EmbedLanding', () => {
  it('shows welcome message and starters; a click submits the text', () => {
    mockSettings = {
      ...DEFAULT_EMBED_WIDGET_SETTINGS,
      welcomeMessage: 'Welcome!',
      starters: ['Pricing?', 'Hours?'],
    };
    render(<EmbedLanding />);
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hours?'));
    expect(mockSubmit).toHaveBeenCalledWith({ text: 'Hours?' });
    expect(screen.queryByTestId('spec-starters')).toBeNull();
  });

  it('falls back to spec starters when none configured', () => {
    render(<EmbedLanding />);
    expect(screen.getByTestId('spec-starters')).toBeInTheDocument();
  });
});
