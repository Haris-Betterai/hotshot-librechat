import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatContext, MessageContext } from '~/Providers';
import { localizeEnglish } from '../fixtures/english';
import UiBlock from '../index';

const mockSubmit = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => jest.requireActual('../fixtures/english').localizeEnglish,
  useSubmitMessage: () => ({ submitMessage: mockSubmit }),
}));

const chat = {} as React.ContextType<typeof ChatContext>;

type Ctx = { latest?: boolean; submitting?: boolean };

const renderBlock = (block: object | string, ctx: Ctx = {}, isStreaming = false) => {
  const source = typeof block === 'string' ? block : JSON.stringify(block);
  return render(
    <ChatContext.Provider value={chat}>
      <MessageContext.Provider
        value={{
          messageId: 'm1',
          isExpanded: true,
          isLatestMessage: ctx.latest ?? true,
          isSubmitting: ctx.submitting ?? false,
        }}
      >
        <UiBlock source={source} isStreaming={isStreaming} />
      </MessageContext.Provider>
    </ChatContext.Provider>,
  );
};

const product = {
  type: 'product_card',
  name: 'Hotshot Secret Stop Tick',
  url: 'https://example.com/p',
  image: 'https://example.com/i.png',
  price: '$20',
  summary: 'Quiets lifter tick.',
  dose: '16 oz treats 40 gal',
  sizes: [
    { label: '16 oz', price: '$20' },
    { label: '32 oz', price: '$35' },
  ],
};

beforeEach(() => mockSubmit.mockClear());

describe('UiBlock', () => {
  it('renders a product card and updates price from the size picker', () => {
    renderBlock(product);
    const link = screen.getByRole('link', { name: 'View product' });
    expect(link).toHaveAttribute('href', 'https://example.com/p');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByAltText('Hotshot Secret Stop Tick')).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText('$20')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '32 oz' }));
    expect(screen.getByText('$35')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '32 oz' })).toHaveAttribute('aria-checked', 'true');
  });

  it('renders a comparison table with verdict', () => {
    renderBlock({
      type: 'comparison',
      title: 'Which one?',
      products: [{ name: 'Alpha', price: '$10' }, { name: 'Beta' }],
      rows: [{ label: 'Best for', values: ['Diesel', 'Gas'] }],
      verdict: 'Pick Alpha for diesel.',
    });
    expect(screen.getByRole('columnheader', { name: /Alpha/ })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Best for' })).toBeInTheDocument();
    expect(screen.getByText('Gas')).toBeInTheDocument();
    expect(screen.getByText('Pick Alpha for diesel.')).toBeInTheDocument();
  });

  it('calculates a dose and guards invalid input', () => {
    renderBlock({
      type: 'dose_calculator',
      product: 'Diesel Treat',
      ratio: { amount: 1.5, unit: 'oz', per: 1, perUnit: 'quart' },
      capacity: 13,
      capacityLabel: 'Oil capacity',
      note: 'Add at oil change.',
    });
    expect(screen.getByText('19.5 oz')).toBeInTheDocument();
    expect(screen.getByText('13 qt × 1.5 oz per qt')).toBeInTheDocument();
    expect(screen.getByText('Add at oil change.')).toBeInTheDocument();
    const input = screen.getByLabelText('Oil capacity');
    fireEvent.change(input, { target: { value: '10' } });
    expect(screen.getByText('15 oz')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '-3' } });
    expect(screen.getByText('Enter a capacity greater than 0')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Enter your capacity to see the dose')).toBeInTheDocument();
  });

  it('submits a quick reply once and then disables the options', () => {
    renderBlock({ type: 'quick_replies', prompt: 'Which?', options: ['Diesel', 'Gas'] });
    fireEvent.click(screen.getByRole('button', { name: 'Diesel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gas' }));
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({ text: 'Diesel' });
  });

  it.each([
    ['not the latest message', { latest: false }],
    ['still submitting', { submitting: true }],
  ])('disables quick replies when %s', (_label, ctx) => {
    renderBlock({ type: 'quick_replies', options: ['Diesel'] }, ctx);
    const button = screen.getByRole('button', { name: 'Diesel' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('builds one message from the vehicle picker', () => {
    renderBlock({ type: 'vehicle_picker', fields: ['year', 'make', 'model', 'engine'] });
    const send = screen.getByRole('button', { name: /Send/ });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2018' } });
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'Ram' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText('Engine'), { target: { value: '6.7 Cummins' } });
    fireEvent.click(send);
    expect(mockSubmit).toHaveBeenCalledWith({ text: '2018 Ram 2500, 6.7 Cummins' });
  });

  it('rejects an out-of-range vehicle year and is inert on older messages', () => {
    const { unmount } = renderBlock({ type: 'vehicle_picker', fields: ['year'] });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1950' } });
    expect(screen.getByRole('button', { name: /Send/ })).toBeDisabled();
    unmount();
    renderBlock({ type: 'vehicle_picker', fields: ['year'] }, { latest: false });
    expect(screen.getByLabelText('Year')).toBeDisabled();
  });

  it('shows a skeleton while streaming and nothing once final', () => {
    const partial = '{"type":"product_card","name":"Hot';
    const streaming = renderBlock(partial, {}, true);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    streaming.unmount();
    const final = renderBlock(partial, {}, false);
    expect(final.container).toBeEmptyDOMElement();
    expect(localizeEnglish('com_ui_block_loading')).toBeTruthy();
  });
});
