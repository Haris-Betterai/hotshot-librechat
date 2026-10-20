import { render, screen, fireEvent } from '@testing-library/react';
import type { IntelligenceAuto } from 'librechat-data-provider';
import { useGetAgentByIdQuery } from '~/data-provider';
import Intelligence from '../Intelligence';

let mockPreset = false;
let mockLabel: string | undefined = 'Smart';
let mockDefaultLevel: string | undefined;
let mockAuto: IntelligenceAuto | undefined;
const mockSetConversation = jest.fn();

jest.mock('~/data-provider', () => ({
  useGetAgentByIdQuery: jest.fn(() => ({
    data: {
      provider: 'openAI',
      intelligence: {
        heading: 'Intelligence',
        default_level: mockDefaultLevel,
        auto: mockAuto,
        levels: mockPreset
          ? [
              { label: 'fast', model: 'gpt-5.6-luna' },
              { label: 'smart', model: 'gpt-5.6-terra' },
              { label: 'smarter', model: 'gpt-5.6' },
            ]
          : [
              { label: 'Fast', model: 'fast-model' },
              { label: 'Smart', model: 'smart-model' },
              { label: 'Smarter', model: 'smarter-model' },
            ],
      },
    },
  })),
}));
jest.mock('~/Providers', () => ({
  useChatContext: () => ({
    conversation: { agent_id: 'agent_test', modelLabel: mockLabel },
    setConversation: mockSetConversation,
  }),
}));
jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('~/utils', () => ({
  isEmbedWidget: () => false,
  cn: (...values: string[]) => values.join(' '),
}));

beforeEach(() => {
  mockPreset = false;
  mockLabel = 'Smart';
  mockDefaultLevel = undefined;
  mockAuto = undefined;
  mockSetConversation.mockClear();
});

it('reads configured levels from agent details, preserving the selected label', () => {
  render(<Intelligence />);
  expect(useGetAgentByIdQuery).toHaveBeenCalledWith('agent_test');
  expect(screen.getByRole('button', { name: 'Intelligence Smart' })).toBeEnabled();
});

it('shows five localized stops and sends the stable server label when increasing effort', () => {
  mockPreset = true;
  mockLabel = 'smarter:medium';
  render(<Intelligence />);
  fireEvent.click(screen.getByRole('button', { name: 'Intelligence com_ui_intelligence_deeper' }));
  const slider = screen.getByRole('slider', { name: 'Intelligence' });
  expect(slider).toHaveAttribute('aria-valuenow', '3');
  expect(slider).toHaveAttribute('aria-valuemax', '4');
  fireEvent.keyDown(slider, { key: 'End' });
  const update = mockSetConversation.mock.calls[0][0];
  expect(update({ agent_id: 'agent_test', modelLabel: mockLabel })).toEqual({
    agent_id: 'agent_test',
    modelLabel: 'smarter:high',
  });
});

it('starts a new chat on the explicitly configured default level', () => {
  mockLabel = undefined;
  mockDefaultLevel = 'Smarter';
  render(<Intelligence />);
  const update = mockSetConversation.mock.calls[0][0];
  expect(update({ agent_id: 'agent_test' })).toEqual({
    agent_id: 'agent_test',
    modelLabel: 'Smarter',
  });
});

it('falls back to the default level when a saved label no longer exists', () => {
  mockLabel = 'Retired level';
  mockDefaultLevel = 'Smarter';
  render(<Intelligence />);
  expect(screen.getByRole('button', { name: 'Intelligence Smarter' })).toBeInTheDocument();
});

it('explains each preset level to the customer', () => {
  mockPreset = true;
  mockLabel = 'smart';
  render(<Intelligence />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Intelligence com_ui_intelligence_balanced' }),
  );
  expect(screen.getByText('com_ui_intelligence_balanced_purpose')).toBeInTheDocument();
});

it('offers Auto first, starts there, and explains what it does', () => {
  mockLabel = undefined;
  mockAuto = { label: 'Auto', base: 'Fast', escalate: 'Smarter' };
  render(<Intelligence />);
  const update = mockSetConversation.mock.calls[0][0];
  expect(update({ agent_id: 'agent_test' })).toEqual({
    agent_id: 'agent_test',
    modelLabel: 'Auto',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Intelligence Auto' }));
  expect(screen.getByRole('slider', { name: 'Intelligence' })).toHaveAttribute(
    'aria-valuemax',
    '3',
  );
  expect(screen.getByText('com_ui_intelligence_auto_purpose')).toBeInTheDocument();
});

it('prefers a staff-authored Auto description over the built-in one', () => {
  mockLabel = 'Auto';
  mockAuto = {
    label: 'Auto',
    base: 'Fast',
    escalate: 'Smarter',
    description: 'We pick the right level for you.',
  };
  render(<Intelligence />);
  fireEvent.click(screen.getByRole('button', { name: 'Intelligence Auto' }));
  expect(screen.getByText('We pick the right level for you.')).toBeInTheDocument();
  expect(screen.queryByText('com_ui_intelligence_auto_purpose')).not.toBeInTheDocument();
});
