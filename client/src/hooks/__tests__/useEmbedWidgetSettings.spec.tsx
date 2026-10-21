import { renderHook } from '@testing-library/react';
import { normalizeEmbedWidgetSettings } from 'librechat-data-provider';
import useEmbedWidgetSettings, {
  useEmbedAppearance,
  getEmbedComposerControls,
} from '../useEmbedWidgetSettings';

let mockEmbed = true;
let mockData: Record<string, unknown> | undefined;

jest.mock('~/data-provider', () => ({
  useGetEmbedWidgetConfigQuery: () => ({ data: mockData }),
}));
jest.mock('~/utils/embed', () => ({
  isEmbedWidget: () => mockEmbed,
  getEmbedWidgetId: () => 'abc',
}));

beforeEach(() => {
  mockEmbed = true;
  mockData = undefined;
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
});

describe('useEmbedWidgetSettings', () => {
  it('returns defaults while loading', () => {
    const { result } = renderHook(() => useEmbedWidgetSettings());
    expect(result.current.settings.color).toBe('#3b6cf6');
    expect(result.current.settings.showIntelligence).toBe(true);
    expect(result.current.isEmbed).toBe(true);
  });

  it('normalises loaded settings and exposes the icon', () => {
    mockData = {
      agentId: 'a',
      iconUrl: '/i.png',
      settings: { color: 'nope', title: '  Hi ', starters: ['a', '', 'b'], allowFileUpload: true },
    };
    const { result } = renderHook(() => useEmbedWidgetSettings());
    expect(result.current.settings).toMatchObject({
      color: '#3b6cf6',
      title: 'Hi',
      starters: ['a', 'b'],
      allowFileUpload: true,
    });
    expect(result.current.iconUrl).toBe('/i.png');
  });

  it('uses defaults when not embedded', () => {
    mockEmbed = false;
    mockData = { agentId: 'a', settings: { title: 'X' } };
    const { result } = renderHook(() => useEmbedWidgetSettings());
    expect(result.current.settings.title).toBe('');
  });
});

describe('useEmbedAppearance', () => {
  it('sets brand variable and theme class in embed mode', () => {
    mockData = { agentId: 'a', settings: { color: '#ff0000', theme: 'dark' } };
    renderHook(() => useEmbedAppearance());
    expect(document.documentElement.style.getPropertyValue('--embed-brand')).toBe('#ff0000');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does nothing outside embed mode', () => {
    mockEmbed = false;
    renderHook(() => useEmbedAppearance());
    expect(document.documentElement.style.getPropertyValue('--embed-brand')).toBe('');
  });
});

describe('getEmbedComposerControls', () => {
  const base = normalizeEmbedWidgetSettings();
  it('hides attach, shows voice, by default in embed', () => {
    expect(getEmbedComposerControls(base, true)).toEqual({
      intelligence: true,
      voice: true,
      attach: false,
      poweredBy: false,
    });
  });
  it('follows the settings', () => {
    const on = { ...base, showIntelligence: true, allowFileUpload: true, showPoweredBy: true };
    expect(getEmbedComposerControls(on, true)).toEqual({
      intelligence: true,
      voice: true,
      attach: true,
      poweredBy: true,
    });
    expect(getEmbedComposerControls({ ...base, allowVoice: false }, true).voice).toBe(false);
  });
  it('shows everything normal outside embed', () => {
    expect(getEmbedComposerControls(base, false)).toEqual({
      intelligence: true,
      voice: true,
      attach: true,
      poweredBy: false,
    });
  });
});
