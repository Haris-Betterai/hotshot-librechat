import React from 'react';
import { dataService } from 'librechat-data-provider';
import { render, screen, fireEvent, waitFor } from 'test/layout-test-utils';
import type { TEmbedWidget } from 'librechat-data-provider';
import EmbedWidget from '../Widget';

const mockShowToast = jest.fn();

jest.mock('@librechat/client', () => ({
  Spinner: () => <span data-testid="spinner" />,
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('librechat-data-provider', () => ({
  ...jest.requireActual('librechat-data-provider'),
  dataService: {
    listEmbedWidgets: jest.fn(),
    updateEmbedWidgetLink: jest.fn(),
    createEmbedWidgetLink: jest.fn(),
    uploadEmbedWidgetIcon: jest.fn(),
  },
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

const baseWidget: TEmbedWidget = {
  embedId: 'emb_1',
  agentId: 'agent_1',
  allowedOrigins: ['https://example.com'],
  settings: {
    color: '#ff0000',
    theme: 'light',
    title: 'Support',
    subtitle: 'We reply fast',
    position: 'left',
    offsetX: 20,
    offsetY: 20,
    width: 380,
    height: 600,
    mobileFullscreen: true,
    welcomeMessage: 'Hello there',
    teaserText: 'Need help?',
    teaserDelay: 3,
    starters: ['Pricing?'],
    autoOpenSeconds: 0,
    showIntelligence: false,
    allowVoice: true,
    allowFileUpload: false,
    showPoweredBy: false,
  },
};

const openWidget = async () => {
  (dataService.listEmbedWidgets as jest.Mock).mockResolvedValue({ widgets: [baseWidget] });
  render(<EmbedWidget agentId="agent_1" agentName="Aria" />);
  fireEvent.click(screen.getByRole('button', { name: 'com_ui_embed_widget' }));
  await screen.findByText('com_ui_embed_settings_save');
};

describe('EmbedWidget settings', () => {
  beforeEach(() => {
    mockShowToast.mockClear();
  });

  it('initialises the form and preview from saved settings', async () => {
    await openWidget();
    expect(screen.getByLabelText('com_ui_embed_color')).toHaveValue('#ff0000');
    expect(screen.getByDisplayValue('Support')).toBeInTheDocument();
    expect(screen.getByTestId('embed-preview-header')).toHaveTextContent('Support');
    expect(screen.getByTestId('embed-preview-welcome')).toHaveTextContent('Hello there');
    expect(screen.getByText('com_ui_embed_settings_save').closest('button')).toBeDisabled();
  });

  it('updates the preview as the title is edited and shows a dirty indicator', async () => {
    await openWidget();
    fireEvent.change(screen.getByDisplayValue('Support'), { target: { value: 'Sales' } });
    expect(screen.getByTestId('embed-preview-header')).toHaveTextContent('Sales');
    expect(screen.getByRole('status')).toHaveTextContent('com_ui_embed_unsaved');
  });

  it('saves only the changed settings', async () => {
    const update = dataService.updateEmbedWidgetLink as jest.Mock;
    update.mockResolvedValue({ ...baseWidget });
    await openWidget();
    fireEvent.change(screen.getByDisplayValue('Support'), { target: { value: '  Sales  ' } });
    fireEvent.click(screen.getByText('com_ui_embed_settings_save'));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('emb_1', { settings: { title: 'Sales' } }),
    );
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' })),
    );
  });

  it('caps starters at four', async () => {
    await openWidget();
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_embed_group_greeting' }));
    const add = screen.getByText('com_ui_embed_starter_add').closest('button') as HTMLElement;
    [1, 2, 3].forEach(() => fireEvent.click(add));
    expect(add).toBeDisabled();
    expect(screen.getAllByLabelText(/com_ui_embed_starter \d/)).toHaveLength(4);
  });

  it('blocks saving an invalid hex colour', async () => {
    await openWidget();
    fireEvent.change(screen.getByLabelText('com_ui_embed_color'), { target: { value: '#12' } });
    expect(screen.getByRole('alert')).toHaveTextContent('com_ui_embed_color_invalid');
    fireEvent.change(screen.getByDisplayValue('Support'), { target: { value: 'Sales' } });
    expect(screen.getByText('com_ui_embed_settings_save').closest('button')).toBeDisabled();
  });

  it('links to the demo page for the embed id', async () => {
    await openWidget();
    const link = screen.getByText('com_ui_embed_open_demo');
    expect(link).toHaveAttribute('href', `${window.location.origin}/widget-demo.html?id=emb_1`);
    expect(link).toHaveAttribute('target', '_blank');
  });
});
