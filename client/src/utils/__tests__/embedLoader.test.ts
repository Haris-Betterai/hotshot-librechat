import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '../../../public/embed.js'), 'utf8');
const ORIGIN = 'http://localhost';
const WIDGET = '#hotshot-embed-widget';

type LauncherConfig = { iconUrl: string | null; settings?: Record<string, unknown> };

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

const mockFetch = (config: LauncherConfig | null): void => {
  (window as unknown as { fetch: unknown }).fetch = config
    ? jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(config) }))
    : jest.fn(() => Promise.reject(new Error('network')));
};

const load = async (attrs: Record<string, string> = {}): Promise<void> => {
  const el = document.createElement('script');
  el.setAttribute('src', `${ORIGIN}/embed.js`);
  el.setAttribute('data-embed-id', 'abc');
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.head.appendChild(el);
  new Function(source)();
  await flush();
};

const root = (): HTMLElement | null => document.querySelector(WIDGET);
const launcher = (): HTMLButtonElement =>
  document.querySelector(`${WIDGET} .hse-launcher`) as HTMLButtonElement;
const teaser = (): HTMLElement | null => document.querySelector(`${WIDGET} .hse-teaser`);
const iframes = (): NodeListOf<HTMLIFrameElement> => document.querySelectorAll(`${WIDGET} iframe`);
const css = (): string =>
  Array.from(document.head.querySelectorAll('style'))
    .map((s) => s.textContent)
    .join('');

describe('embed.js loader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.sessionStorage.clear();
    delete (window as unknown as Record<string, unknown>).__hotshotEmbedLoaded;
    delete (window as unknown as Record<string, unknown>).HotshotWidget;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies colour and position from settings', async () => {
    mockFetch({ iconUrl: null, settings: { color: '#ffee00', position: 'left', offsetX: 33 } });
    await load();
    expect(root()).not.toBeNull();
    const styles = css();
    expect(styles).toContain('left:33px');
    expect(styles).toContain('background:#ffee00');
    expect(styles).toContain('color:#111827');
  });

  it('uses defaults when the launcher fetch fails', async () => {
    mockFetch(null);
    await load();
    expect(root()).not.toBeNull();
    const styles = css();
    expect(styles).toContain('right:20px');
    expect(styles).toContain('background:#2563eb');
    expect(launcher().getAttribute('aria-expanded')).toBe('false');
  });

  it('shows the teaser after the delay and keeps it dismissed', async () => {
    mockFetch({ iconUrl: null, settings: { teaserText: 'Need help?', teaserDelay: 2 } });
    await load();
    expect(teaser()?.classList.contains('hse-show')).toBe(false);
    jest.advanceTimersByTime(2100);
    expect(teaser()?.classList.contains('hse-show')).toBe(true);
    (document.querySelector(`${WIDGET} .hse-teaser-x`) as HTMLElement).click();
    expect(teaser()?.classList.contains('hse-show')).toBe(false);

    root()?.remove();
    document.head.innerHTML = '';
    delete (window as unknown as Record<string, unknown>).__hotshotEmbedLoaded;
    await load();
    jest.advanceTimersByTime(5000);
    expect(teaser()?.classList.contains('hse-show')).toBe(false);
  });

  it('auto-opens once and creates the iframe lazily', async () => {
    mockFetch({ iconUrl: null, settings: { autoOpenSeconds: 4 } });
    await load();
    expect(iframes().length).toBe(0);
    jest.advanceTimersByTime(4100);
    expect(root()?.classList.contains('hse-open')).toBe(true);
    expect(iframes().length).toBe(1);
    expect(iframes()[0].src).toBe(`${ORIGIN}/embed/abc`);

    launcher().click();
    expect(root()?.classList.contains('hse-open')).toBe(false);

    root()?.remove();
    document.head.innerHTML = '';
    delete (window as unknown as Record<string, unknown>).__hotshotEmbedLoaded;
    await load();
    jest.advanceTimersByTime(10000);
    expect(root()?.classList.contains('hse-open')).toBe(false);
  });

  it('creates the iframe on first manual open only', async () => {
    mockFetch({ iconUrl: null, settings: {} });
    await load();
    expect(iframes().length).toBe(0);
    launcher().click();
    launcher().click();
    launcher().click();
    expect(iframes().length).toBe(1);
  });

  it('closes on hotshot-embed-close from the widget origin only', async () => {
    mockFetch({ iconUrl: null, settings: {} });
    await load();
    launcher().click();
    expect(root()?.classList.contains('hse-open')).toBe(true);
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.test',
        data: { type: 'hotshot-embed-close' },
      }),
    );
    expect(root()?.classList.contains('hse-open')).toBe(true);
    window.dispatchEvent(
      new MessageEvent('message', { origin: ORIGIN, data: { type: 'hotshot-embed-close' } }),
    );
    expect(root()?.classList.contains('hse-open')).toBe(false);
  });

  it('mounts once when loaded twice', async () => {
    mockFetch({ iconUrl: null, settings: {} });
    await load();
    await load();
    expect(document.querySelectorAll(WIDGET).length).toBe(1);
  });

  it('exposes HotshotWidget and honours data-open', async () => {
    mockFetch({ iconUrl: null, settings: {} });
    await load({ 'data-open': '1' });
    const api = (window as unknown as { HotshotWidget: { close: () => void; toggle: () => void } })
      .HotshotWidget;
    expect(root()?.classList.contains('hse-open')).toBe(true);
    api.close();
    expect(root()?.classList.contains('hse-open')).toBe(false);
    api.toggle();
    expect(root()?.classList.contains('hse-open')).toBe(true);
  });
});
