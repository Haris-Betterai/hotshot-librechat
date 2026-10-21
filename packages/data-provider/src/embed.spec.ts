import type { TEmbedWidgetSettings } from './embed';
import {
  MAX_EMBED_STARTERS,
  normalizeEmbedWidgetSettings,
  DEFAULT_EMBED_WIDGET_SETTINGS,
} from './embed';

describe('normalizeEmbedWidgetSettings', () => {
  it('returns the defaults for missing input', () => {
    expect(normalizeEmbedWidgetSettings()).toEqual(DEFAULT_EMBED_WIDGET_SETTINGS);
    expect(normalizeEmbedWidgetSettings(null)).toEqual(DEFAULT_EMBED_WIDGET_SETTINGS);
  });

  it('keeps valid values and lowercases the colour', () => {
    const result = normalizeEmbedWidgetSettings({
      color: '#FF6600',
      position: 'left',
      theme: 'dark',
      title: '  Hotshot help  ',
      autoOpenSeconds: 10,
    });
    expect(result).toMatchObject({
      color: '#ff6600',
      position: 'left',
      theme: 'dark',
      title: 'Hotshot help',
      autoOpenSeconds: 10,
    });
  });

  it('falls back on invalid colours, enums and numbers', () => {
    const result = normalizeEmbedWidgetSettings({
      color: 'red',
      position: 'top' as TEmbedWidgetSettings['position'],
      theme: 'neon' as TEmbedWidgetSettings['theme'],
      width: Number.NaN,
      showPoweredBy: 'yes' as unknown as boolean,
    });
    expect(result.color).toBe(DEFAULT_EMBED_WIDGET_SETTINGS.color);
    expect(result.position).toBe('right');
    expect(result.theme).toBe('light');
    expect(result.width).toBe(DEFAULT_EMBED_WIDGET_SETTINGS.width);
    expect(result.showPoweredBy).toBe(false);
  });

  it('clamps sizes and timings to their bounds', () => {
    const result = normalizeEmbedWidgetSettings({
      width: 5000,
      height: 10,
      offsetX: -5,
      teaserDelay: 999,
      autoOpenSeconds: 12.6,
    });
    expect(result).toMatchObject({
      width: 640,
      height: 400,
      offsetX: 0,
      teaserDelay: 120,
      autoOpenSeconds: 13,
    });
  });

  it('trims, drops blank and caps starters', () => {
    const result = normalizeEmbedWidgetSettings({
      starters: [' Which product fits? ', '', 'a', 'b', 'c', 'd'],
    });
    expect(result.starters).toEqual(['Which product fits?', 'a', 'b', 'c']);
    expect(result.starters).toHaveLength(MAX_EMBED_STARTERS);
  });

  it('drops unknown keys and caps long text', () => {
    const result = normalizeEmbedWidgetSettings({
      welcomeMessage: 'x'.repeat(2000),
      extra: true,
    } as Partial<TEmbedWidgetSettings>);
    expect(result.welcomeMessage).toHaveLength(600);
    expect(result).not.toHaveProperty('extra');
  });
});
