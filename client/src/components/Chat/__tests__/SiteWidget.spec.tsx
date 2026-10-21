import { render } from '@testing-library/react';
import SiteWidget from '../SiteWidget';

let mockEmbedId: string | undefined;

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { siteWidgetEmbedId: mockEmbedId } }),
}));

const loaderScripts = () => document.querySelectorAll('script#hotshot-site-widget');

describe('SiteWidget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads the embed script for the configured widget', () => {
    mockEmbedId = 'emb_site';
    render(<SiteWidget />);

    const script = loaderScripts()[0] as HTMLScriptElement;
    expect(script.getAttribute('src')).toBe('embed.js');
    expect(script.getAttribute('data-embed-id')).toBe('emb_site');
  });

  it('adds nothing when no site widget is configured', () => {
    mockEmbedId = undefined;
    render(<SiteWidget />);

    expect(loaderScripts()).toHaveLength(0);
  });

  it('loads the script only once and removes the widget on unmount', () => {
    mockEmbedId = 'emb_site';
    const first = render(<SiteWidget />);
    render(<SiteWidget />);
    expect(loaderScripts()).toHaveLength(1);

    const widget = document.createElement('div');
    widget.id = 'hotshot-embed-widget';
    document.body.appendChild(widget);

    first.unmount();
    expect(loaderScripts()).toHaveLength(0);
    expect(document.getElementById('hotshot-embed-widget')).toBeNull();
  });
});
