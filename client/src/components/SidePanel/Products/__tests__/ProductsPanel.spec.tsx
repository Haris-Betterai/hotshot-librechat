import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { CatalogProduct } from 'librechat-data-provider';
import ProductsPanel from '../ProductsPanel';

const DE = 'https://www.hotshotsecret.com/products/diesel-extreme';
const FR3 = 'https://www.hotshotsecret.com/products/fr3';

const product = (title: string, url: string, category: string): CatalogProduct => ({
  title,
  url,
  category,
  image: null,
  price: '$17.99',
  price_options: null,
  sku: null,
});

const mockShowToast = jest.fn();
const mockNewConversation = jest.fn();
const mockSetPinnedProduct = jest.fn();
const mockToggleStar = jest.fn();
let mockCatalog: { data?: { products: CatalogProduct[] }; isLoading: boolean; isError: boolean };
let mockIsStaff = true;
let mockPinned: string | null = null;
let mockStarred = new Set<string>();

jest.mock('@librechat/client', () => ({
  Spinner: () => <div data-testid="spinner" />,
  TooltipAnchor: ({ render }: { render: React.ReactNode }) => <>{render}</>,
  FilterInput: ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    label: string;
  }) => <input aria-label={label} value={value} onChange={onChange} />,
  Dropdown: ({
    value,
    onChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    ariaLabel: string;
  }) => (
    <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { isStaff: mockIsStaff } }),
  useProductCatalogQuery: () => mockCatalog,
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useNewConvo: () => ({ newConversation: mockNewConversation }),
  usePinnedProduct: () => ({
    productUrl: mockPinned,
    setPinnedProduct: mockSetPinnedProduct,
    isSaving: false,
  }),
  useStarredProducts: () => ({ starred: mockStarred, toggleStar: mockToggleStar }),
}));

const titles = () => screen.queryAllByRole('listitem').map((item) => item.textContent ?? '');

beforeEach(() => {
  jest.clearAllMocks();
  mockIsStaff = true;
  mockPinned = null;
  mockStarred = new Set();
  mockCatalog = {
    data: {
      products: [product('DIESEL EXTREME', DE, 'Diesel'), product('FR3', FR3, 'Oil Additives')],
    },
    isLoading: false,
    isError: false,
  };
});

describe('ProductsPanel', () => {
  it('shows a spinner while loading and a message when the list is unavailable', () => {
    mockCatalog = { isLoading: true, isError: false };
    const { rerender } = render(<ProductsPanel />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();

    mockCatalog = { isLoading: false, isError: true };
    rerender(<ProductsPanel />);
    expect(screen.getByText('com_ui_products_unavailable')).toBeInTheDocument();
  });

  it('renders nothing for non-staff users', () => {
    mockIsStaff = false;
    const { container } = render(<ProductsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it('filters by search, group and starred products', () => {
    mockStarred = new Set([FR3]);
    render(<ProductsPanel />);
    expect(titles()).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('com_ui_products_filter'), {
      target: { value: 'diesel' },
    });
    expect(titles()).toEqual([expect.stringContaining('DIESEL EXTREME')]);

    fireEvent.change(screen.getByLabelText('com_ui_products_filter'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('com_ui_products_category'), {
      target: { value: '__starred__' },
    });
    expect(titles()).toEqual([expect.stringContaining('FR3')]);

    fireEvent.change(screen.getByLabelText('com_ui_products_category'), {
      target: { value: 'Diesel' },
    });
    expect(titles()).toEqual([expect.stringContaining('DIESEL EXTREME')]);
  });

  it('pins, unpins, stars and starts a new chat about a product', async () => {
    mockPinned = FR3;
    render(<ProductsPanel />);
    const [deRow, fr3Row] = screen.getAllByRole('listitem');

    fireEvent.click(deRow.querySelector('[aria-label="com_ui_products_pin"]') as Element);
    fireEvent.click(fr3Row.querySelector('[aria-label="com_ui_products_unpin"]') as Element);
    fireEvent.click(deRow.querySelector('[aria-label="com_ui_products_star"]') as Element);
    fireEvent.click(deRow.querySelector('[aria-label="com_ui_products_new_chat"]') as Element);

    await waitFor(() => expect(mockSetPinnedProduct).toHaveBeenCalledTimes(2));
    expect(mockSetPinnedProduct).toHaveBeenNthCalledWith(1, DE);
    expect(mockSetPinnedProduct).toHaveBeenNthCalledWith(2, null);
    expect(mockToggleStar).toHaveBeenCalledWith(DE);
    expect(mockNewConversation).toHaveBeenCalledWith({ template: { productUrl: DE } });
  });

  it('tells the user when a pin could not be saved', async () => {
    mockSetPinnedProduct.mockRejectedValueOnce(new Error('offline'));
    render(<ProductsPanel />);
    fireEvent.click(screen.getAllByLabelText('com_ui_products_pin')[0]);
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'com_ui_products_pin_failed',
        status: 'error',
      }),
    );
  });
});
