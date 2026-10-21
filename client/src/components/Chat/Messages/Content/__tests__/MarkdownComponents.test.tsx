/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { RecoilRoot } from 'recoil';
import { render, screen } from '@testing-library/react';
import { a as Anchor, img as Img } from '../MarkdownComponents';

jest.mock('@librechat/client', () => ({
  useToastContext: () => ({ showToast: jest.fn() }),
}));
jest.mock('~/data-provider', () => ({
  useFileDownload: () => ({ refetch: jest.fn() }),
}));
jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));
jest.mock('~/hooks/Roles/useHasAccess', () => ({ __esModule: true, default: () => false }));
jest.mock('~/Providers', () => ({ useCodeBlockContext: jest.fn() }));
jest.mock('~/components/Messages/Content/Mermaid', () => ({
  __esModule: true,
  default: () => null,
  MermaidErrorBoundary: () => null,
}));
jest.mock('~/components/Messages/Content/CodeBlock', () => ({
  __esModule: true,
  default: () => null,
}));

const renderInRoot = (ui: React.ReactElement) => render(<RecoilRoot>{ui}</RecoilRoot>);

describe('MarkdownAnchor source pill', () => {
  it('renders a host-only link as a pill without utm_source', () => {
    renderInRoot(
      <Anchor href="https://hotshotsecret.com/p?utm_source=openai">hotshotsecret.com</Anchor>,
    );
    const link = screen.getByRole('link', { name: 'hotshotsecret.com' });
    expect(link).toHaveAttribute('data-source-pill');
    expect(link).toHaveAttribute('href', 'https://hotshotsecret.com/p');
    expect(link.className).toContain('rounded-full');
    expect(link.className).toContain('text-xs');
  });

  it('treats a www host as the same source', () => {
    renderInRoot(<Anchor href="https://www.hotshotsecret.com/">hotshotsecret.com</Anchor>);
    expect(screen.getByRole('link')).toHaveAttribute('data-source-pill');
  });

  it('renders descriptive links as plain anchors', () => {
    renderInRoot(<Anchor href="https://hotshotsecret.com/p">Buy it here</Anchor>);
    expect(screen.getByRole('link', { name: 'Buy it here' })).not.toHaveAttribute(
      'data-source-pill',
    );
  });
});

describe('MarkdownImage', () => {
  it('renders a compact rounded thumbnail capped at 160px', () => {
    renderInRoot(<Img src="https://cdn.example.com/bottle.png" alt="Bottle" />);
    const image = screen.getByRole('img', { name: 'Bottle' });
    expect(image.className).toContain('max-h-40');
    expect(image.className).toContain('rounded-xl');
    expect(image.className).not.toContain('max-h-64');
    expect(image.className).not.toContain('object-contain');
  });

  it('lets consecutive images flow inline', () => {
    renderInRoot(
      <>
        <Img src="https://cdn.example.com/a.png" alt="A" />
        <Img src="https://cdn.example.com/b.png" alt="B" />
      </>,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link.className).toContain('inline-block'));
  });
});
