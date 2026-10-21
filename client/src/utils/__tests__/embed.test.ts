import { isEmbedWidget, markEmbedWidget } from '../embed';

const realSelf = window.self;

function setFramed(framed: boolean) {
  Object.defineProperty(window, 'self', {
    configurable: true,
    get: () => (framed ? ({} as Window) : realSelf),
  });
}

describe('isEmbedWidget', () => {
  afterEach(() => {
    sessionStorage.clear();
    setFramed(false);
    window.history.replaceState({}, '', '/');
  });

  it('is never embed mode in a full-page tab, even after the widget marked the session', () => {
    markEmbedWidget('emb_1');
    window.history.replaceState({}, '', '/c/new?spec=hotshot-secret-ai&embed=1');
    setFramed(false);

    expect(isEmbedWidget()).toBe(false);
  });

  it('is embed mode inside a frame once the widget marked the session', () => {
    markEmbedWidget('emb_1');
    window.history.replaceState({}, '', '/c/new');
    setFramed(true);

    expect(isEmbedWidget()).toBe(true);
  });

  it('is embed mode inside a frame with the embed query flag', () => {
    window.history.replaceState({}, '', '/c/new?embed=1');
    setFramed(true);

    expect(isEmbedWidget()).toBe(true);
  });

  it('treats an /embed/:id address as embed mode even when opened directly', () => {
    window.history.replaceState({}, '', '/embed/emb_1');
    setFramed(false);

    expect(isEmbedWidget()).toBe(true);
  });

  it('is not embed mode inside a frame without any widget signal', () => {
    window.history.replaceState({}, '', '/c/new');
    setFramed(true);

    expect(isEmbedWidget()).toBe(false);
  });
});
