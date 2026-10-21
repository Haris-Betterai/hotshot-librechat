export type TEmbedWidgetPosition = 'right' | 'left';
export type TEmbedWidgetTheme = 'light' | 'dark' | 'auto';

/** Staff-controlled look and behaviour of an embed widget, applied live by `embed.js` and the iframe chat. */
export type TEmbedWidgetSettings = {
  /** Brand colour as `#rrggbb`; launcher, header accent, send button. */
  color: string;
  theme: TEmbedWidgetTheme;
  /** Header title; empty falls back to the agent name. */
  title: string;
  /** Short line under the header title. */
  subtitle: string;
  position: TEmbedWidgetPosition;
  /** Distance from the side edge in px. */
  offsetX: number;
  /** Distance from the bottom edge in px. */
  offsetY: number;
  /** Panel width in px (capped to the viewport by the loader). */
  width: number;
  /** Panel height in px (capped to the viewport by the loader). */
  height: number;
  /** Open full-screen on viewports narrower than 640px. */
  mobileFullscreen: boolean;
  /** First assistant-style message shown before the customer types; empty shows none. */
  welcomeMessage: string;
  /** Teaser bubble next to the closed launcher; empty shows none. */
  teaserText: string;
  /** Seconds before the teaser appears. */
  teaserDelay: number;
  /** Up to {@link MAX_EMBED_STARTERS} tappable starter questions. */
  starters: string[];
  /** Open the panel automatically after N seconds; 0 disables. */
  autoOpenSeconds: number;
  showIntelligence: boolean;
  allowVoice: boolean;
  allowFileUpload: boolean;
  showPoweredBy: boolean;
};

export const MAX_EMBED_STARTERS = 4;
const MAX_TEXT = 200;
const MAX_WELCOME = 600;

export const DEFAULT_EMBED_WIDGET_SETTINGS: TEmbedWidgetSettings = {
  color: '#2563eb',
  theme: 'light',
  title: '',
  subtitle: '',
  position: 'right',
  offsetX: 20,
  offsetY: 20,
  width: 380,
  height: 600,
  mobileFullscreen: true,
  welcomeMessage: '',
  teaserText: '',
  teaserDelay: 3,
  starters: [],
  autoOpenSeconds: 0,
  showIntelligence: false,
  allowVoice: true,
  allowFileUpload: false,
  showPoweredBy: false,
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(num)));
};

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const pickBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const pickEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/**
 * Normalises untrusted input (an API body, a stored document, a query response) into complete,
 * safe widget settings. Unknown keys are dropped and every field falls back to its default.
 */
export function normalizeEmbedWidgetSettings(
  input?: Partial<TEmbedWidgetSettings> | null,
): TEmbedWidgetSettings {
  const d = DEFAULT_EMBED_WIDGET_SETTINGS;
  const source = input ?? {};
  const color = typeof source.color === 'string' ? source.color.trim().toLowerCase() : '';
  const starters = Array.isArray(source.starters)
    ? source.starters
        .map((starter) => cleanText(starter, MAX_TEXT))
        .filter(Boolean)
        .slice(0, MAX_EMBED_STARTERS)
    : d.starters;

  return {
    color: HEX_COLOR.test(color) ? color : d.color,
    theme: pickEnum(source.theme, ['light', 'dark', 'auto'] as const, d.theme),
    title: cleanText(source.title, 80),
    subtitle: cleanText(source.subtitle, 120),
    position: pickEnum(source.position, ['right', 'left'] as const, d.position),
    offsetX: clampNumber(source.offsetX, 0, 200, d.offsetX),
    offsetY: clampNumber(source.offsetY, 0, 200, d.offsetY),
    width: clampNumber(source.width, 300, 640, d.width),
    height: clampNumber(source.height, 400, 900, d.height),
    mobileFullscreen: pickBoolean(source.mobileFullscreen, d.mobileFullscreen),
    welcomeMessage: cleanText(source.welcomeMessage, MAX_WELCOME),
    teaserText: cleanText(source.teaserText, MAX_TEXT),
    teaserDelay: clampNumber(source.teaserDelay, 0, 120, d.teaserDelay),
    starters,
    autoOpenSeconds: clampNumber(source.autoOpenSeconds, 0, 600, d.autoOpenSeconds),
    showIntelligence: pickBoolean(source.showIntelligence, d.showIntelligence),
    allowVoice: pickBoolean(source.allowVoice, d.allowVoice),
    allowFileUpload: pickBoolean(source.allowFileUpload, d.allowFileUpload),
    showPoweredBy: pickBoolean(source.showPoweredBy, d.showPoweredBy),
  };
}
