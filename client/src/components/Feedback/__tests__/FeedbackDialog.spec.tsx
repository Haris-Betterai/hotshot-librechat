import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackDialog, { conversationIdFromPath } from '../FeedbackDialog';

const mockSubmit = jest.fn();

jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('librechat-data-provider', () => {
  const actual = jest.requireActual('librechat-data-provider');
  return {
    ...actual,
    dataService: {
      ...actual.dataService,
      submitFeedbackReport: (...args: unknown[]) => mockSubmit(...args),
    },
  };
});

function renderDialog(path = '/c/abc-123') {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <FeedbackDialog open={true} onOpenChange={jest.fn()} source="widget" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => mockSubmit.mockReset());

it('finds the open conversation in the path', () => {
  expect(conversationIdFromPath('/c/abc-123')).toBe('abc-123');
  expect(conversationIdFromPath('/staff/c/xyz')).toBe('xyz');
  expect(conversationIdFromPath('/c/new')).toBeUndefined();
  expect(conversationIdFromPath('/widget-demo.html')).toBeUndefined();
});

it('keeps Send disabled until there is a message', () => {
  renderDialog();
  expect(screen.getByRole('button', { name: 'com_ui_report_send' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('com_ui_report_message'), {
    target: { value: 'Wrong dose' },
  });
  expect(screen.getByRole('button', { name: 'com_ui_report_send' })).toBeEnabled();
});

it('sends the chosen type, message, source and conversation, then thanks the tester', async () => {
  mockSubmit.mockResolvedValue({
    id: '1',
    userId: 'u',
    userLabel: 'Guest',
    kind: 'bug',
    message: 'The calculator froze',
    source: 'widget',
    createdAt: new Date().toISOString(),
  });
  renderDialog();
  fireEvent.click(screen.getByRole('radio', { name: 'com_ui_report_kind_bug' }));
  fireEvent.change(screen.getByLabelText('com_ui_report_message'), {
    target: { value: 'The calculator froze' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'com_ui_report_send' }));

  await waitFor(() => expect(screen.getByText('com_ui_report_thanks')).toBeInTheDocument());
  expect(mockSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'bug',
      message: 'The calculator froze',
      source: 'widget',
      conversationId: 'abc-123',
    }),
  );
});

it('shows an error when saving fails', async () => {
  mockSubmit.mockRejectedValue(new Error('down'));
  renderDialog();
  fireEvent.change(screen.getByLabelText('com_ui_report_message'), {
    target: { value: 'Anything' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'com_ui_report_send' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('com_ui_report_error'));
});
