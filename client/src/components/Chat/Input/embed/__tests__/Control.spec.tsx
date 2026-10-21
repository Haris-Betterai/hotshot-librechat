import { useEffect } from 'react';
import { render, screen, fireEvent, act } from 'test/layout-test-utils';
import type { TConversation } from 'librechat-data-provider';
import { normalizeEmbedWidgetSettings } from 'librechat-data-provider';
import EmbedLevelControl from '../index';

let mockConversation: Partial<TConversation>;
let mockSettings = normalizeEmbedWidgetSettings({ showIntelligence: true });
const mockSetConversation = jest.fn((update) => {
  mockConversation = typeof update === 'function' ? update(mockConversation) : update;
});

jest.mock('~/data-provider', () => ({
  ...jest.requireActual('~/data-provider'),
  useGetAgentByIdQuery: jest.fn(() => ({
    data: {
      provider: 'anthropic',
      intelligence: {
        auto: { label: 'Auto', base: 'Balanced', escalate: 'Deep' },
        levels: [
          { label: 'Fast', model: 'm1' },
          { label: 'Balanced', model: 'm2' },
          { label: 'Deep', model: 'm3' },
          { label: 'Ultra', model: 'm4' },
        ],
      },
    },
  })),
}));
jest.mock('~/Providers', () => ({
  useChatContext: () => ({
    conversation: mockConversation,
    setConversation: mockSetConversation,
  }),
}));
jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('~/hooks/useEmbedWidgetSettings', () => ({
  __esModule: true,
  default: () => ({ settings: mockSettings, isEmbed: true }),
}));

/** Mirrors the guard in EmbedHeader: Escape closes the widget unless an overlay is open. */
const OPEN_OVERLAY =
  '[role="dialog"], [role="menu"], [role="listbox"], [role="alertdialog"], [aria-expanded="true"]';

function HeaderEscape({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      if (document.querySelector(OPEN_OVERLAY) != null) {
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return null;
}

const setup = () => {
  const view = render(<EmbedLevelControl />);
  return view;
};

beforeEach(() => {
  mockConversation = { conversationId: 'c1', agent_id: 'agent_1' };
  mockSettings = normalizeEmbedWidgetSettings({ showIntelligence: true });
  mockSetConversation.mockClear();
});

it('defaults to the first stop and stamps its label on the conversation', () => {
  setup();
  expect(mockConversation.modelLabel).toBe('Auto');
  expect(
    screen.getByRole('button', { name: 'com_ui_embed_level_label: Auto' }),
  ).toBeInTheDocument();
});

it('submits the selected level label via the conversation', () => {
  const { rerender } = setup();
  fireEvent.click(screen.getByRole('button', { name: /com_ui_embed_level_label/ }));
  const slider = screen.getByRole('slider');
  expect(slider).toHaveAttribute('aria-valuetext', 'Auto');
  fireEvent.keyDown(slider, { key: 'End' });
  expect(mockConversation.modelLabel).toBe('Ultra');
  rerender(<EmbedLevelControl />);
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Ultra');
});

it('keeps a restored label that is one of the stops', () => {
  mockConversation.modelLabel = 'Deep';
  setup();
  expect(mockConversation.modelLabel).toBe('Deep');
  expect(
    screen.getByRole('button', { name: 'com_ui_embed_level_label: Deep' }),
  ).toBeInTheDocument();
});

it('is hidden with fewer than two stops the agent offers and clears the label', () => {
  mockSettings = normalizeEmbedWidgetSettings({ levels: ['Deep', 'Nonexistent'] });
  mockConversation.modelLabel = 'Deep';
  setup();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(mockConversation.modelLabel).toBeUndefined();
});

it('ignores stops the agent does not have', () => {
  mockSettings = normalizeEmbedWidgetSettings({ levels: ['Auto', 'Nope', 'Ultra'] });
  setup();
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '1');
});

it('Escape closes the popover without closing the widget', () => {
  const onClose = jest.fn();
  render(
    <>
      <HeaderEscape onClose={onClose} />
      <EmbedLevelControl />
    </>,
  );
  const gauge = screen.getByRole('button', { name: /com_ui_embed_level_label/ });
  fireEvent.click(gauge);
  expect(gauge).toHaveAttribute('aria-expanded', 'true');
  act(() => {
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'Escape' });
  });
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  act(() => {
    fireEvent.keyDown(document.body, { key: 'Escape' });
  });
  expect(onClose).toHaveBeenCalledTimes(1);
});
