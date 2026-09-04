import { render, screen } from '@testing-library/react';
import EmbedRoute from '../EmbedRoute';

const mockNavigate = jest.fn();
let mockParams: { embedId?: string } = { embedId: 'abc123' };
let mockQueryResult: { data?: { agentId: string; iconUrl?: string | null }; isError: boolean } = {
  data: undefined,
  isError: false,
};
const mockMarkEmbedWidget = jest.fn();

jest.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}));

jest.mock('@librechat/client', () => ({
  Spinner: () => <span data-testid="spinner" />,
}));

jest.mock('~/data-provider', () => ({
  useGetEmbedWidgetConfigQuery: () => mockQueryResult,
}));

jest.mock('~/utils/embed', () => ({
  markEmbedWidget: () => mockMarkEmbedWidget(),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => {
    const translations: Record<string, string> = {
      com_ui_embed_unavailable: 'Chat unavailable. Please reload the page.',
    };
    return translations[key] || key;
  },
}));

describe('EmbedRoute', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockMarkEmbedWidget.mockClear();
    mockParams = { embedId: 'abc123' };
    mockQueryResult = { data: undefined, isError: false };
  });

  it('shows a spinner while the config is loading', () => {
    render(<EmbedRoute />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('marks the embed widget and redirects to the resolved agent once config arrives', () => {
    mockQueryResult = { data: { agentId: 'agent_hotshot' }, isError: false };
    render(<EmbedRoute />);

    expect(mockMarkEmbedWidget).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/c/new?agent_id=agent_hotshot&embed=1', {
      replace: true,
    });
  });

  it('URL-encodes an agentId containing special characters', () => {
    mockQueryResult = { data: { agentId: 'agent/needs encoding' }, isError: false };
    render(<EmbedRoute />);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/c/new?agent_id=agent%2Fneeds%20encoding&embed=1',
      { replace: true },
    );
  });

  it('shows a friendly message instead of an infinite spinner when the embed is invalid or expired', () => {
    mockQueryResult = { data: undefined, isError: true };
    render(<EmbedRoute />);

    expect(screen.getByText('Chat unavailable. Please reload the page.')).toBeInTheDocument();
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not redirect a second time on re-render with the same data', () => {
    mockQueryResult = { data: { agentId: 'agent_hotshot' }, isError: false };
    const { rerender } = render(<EmbedRoute />);
    expect(mockNavigate).toHaveBeenCalledTimes(1);

    rerender(<EmbedRoute />);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
