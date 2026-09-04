import { render, screen, fireEvent } from '@testing-library/react';
import { useGetAgentByIdQuery } from '~/data-provider';
import Intelligence from '../Intelligence';

let mockPreset = false;
let mockLabel = 'Smart';
const mockSetConversation = jest.fn();

jest.mock('~/data-provider', () => ({
  useGetAgentByIdQuery: jest.fn(() => ({
    data: {
      provider: 'openAI',
      intelligence: {
        heading: 'Intelligence',
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
