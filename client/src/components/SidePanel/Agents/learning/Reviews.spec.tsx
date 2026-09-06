import { fireEvent, render, screen } from '@testing-library/react';
import Reviews from './Reviews';

const mockMutate = jest.fn();
const mockUseAgentLearning = jest.fn();

jest.mock('~/data-provider', () => ({
  useAgentLearning: (...args: unknown[]) => mockUseAgentLearning(...args),
  useUpdateAgentLearning: () => ({ mutate: mockMutate, isLoading: false, isError: false }),
}));
jest.mock('~/hooks', () => ({
  useAuthContext: () => ({ user: { role: 'ADMIN' } }),
  useLocalize: () => (key: string, values?: Record<string, number>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const report = {
  enabled: false,
  rules: [],
  reviews: [
    {
      conversationId: 'chat-1',
      reviewedAt: '2026-09-06T10:00:00.000Z',
      request: 'Which treatment should I use?',
      response: 'Use the verified routine treatment.',
      replyCount: 1,
      toolCalls: 2,
      failedReplies: 0,
      negativeFeedback: 0,
      issues: ['questions'],
    },
  ],
  changes: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAgentLearning.mockReturnValue({ data: report, isLoading: false, isError: false });
});

it('loads only when opened and enables automatic improvement', () => {
  render(<Reviews agentId="agent-1" />);
  const details = screen.getByText('com_ui_learning_title').closest('details');
  expect(mockUseAgentLearning).toHaveBeenLastCalledWith('agent-1', false);
  fireEvent.click(screen.getByText('com_ui_learning_title'));
  fireEvent(details as HTMLDetailsElement, new Event('toggle'));
  expect(mockUseAgentLearning).toHaveBeenLastCalledWith('agent-1', true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(mockMutate).toHaveBeenCalledWith('enable');
});

it('shows review evidence and runs a manual review', () => {
  render(<Reviews agentId="agent-1" />);
  expect(screen.getByText('Which treatment should I use?')).toBeInTheDocument();
  expect(screen.getByText('com_ui_learning_questions')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'com_ui_learning_review' }));
  expect(mockMutate).toHaveBeenCalledWith('review');
});
