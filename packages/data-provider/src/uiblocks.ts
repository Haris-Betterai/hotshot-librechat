/**
 * Interactive answer blocks ("intelligent UI"). The model writes a fenced code block whose
 * language is {@link UI_BLOCK_LANGUAGE} containing one JSON object; the chat renders it as a
 * native component. Everything here treats that JSON as untrusted model output.
 */
export const UI_BLOCK_LANGUAGE = 'hotshot-ui';

export const MAX_UI_SIZES = 8;
export const MAX_UI_COMPARE_PRODUCTS = 3;
export const MAX_UI_COMPARE_ROWS = 8;
export const MAX_UI_QUICK_REPLIES = 6;

export type TUiProductSize = { label: string; price?: string };

export type TUiProductCard = {
  type: 'product_card';
  name: string;
  url: string;
  image?: string;
  price?: string;
  sizes?: TUiProductSize[];
  /** One or two sentences on why it fits. */
  summary?: string;
  /** Short dose line, e.g. "16 oz treats 40 gal". */
  dose?: string;
};

export type TUiComparisonProduct = { name: string; url?: string; image?: string; price?: string };
export type TUiComparisonRow = { label: string; values: string[] };

export type TUiComparison = {
  type: 'comparison';
  title?: string;
  products: TUiComparisonProduct[];
  rows: TUiComparisonRow[];
  /** One-line recommendation shown under the table. */
  verdict?: string;
};

export type TUiVolumeUnit = 'oz' | 'ml';
export type TUiCapacityUnit = 'quart' | 'gallon' | 'liter';

export type TUiDoseCalculator = {
  type: 'dose_calculator';
  product: string;
  url?: string;
  /** Treat ratio: `amount` `unit` per `per` `perUnit`, e.g. 1.5 oz per 1 quart. */
  ratio: { amount: number; unit: TUiVolumeUnit; per: number; perUnit: TUiCapacityUnit };
  /** Verified capacity to pre-fill; the customer can change it. */
  capacity?: number;
  capacityLabel?: string;
  note?: string;
};

export type TUiQuickReplies = {
  type: 'quick_replies';
  prompt?: string;
  /** Each option is sent as the customer's next message when tapped. */
  options: string[];
};

export type TUiVehicleField = 'year' | 'make' | 'model' | 'engine';

export type TUiVehiclePicker = {
  type: 'vehicle_picker';
  prompt?: string;
  fields: TUiVehicleField[];
};

export type TUiVideo = {
  type: 'video';
  /** 11-character YouTube video id, taken from `url`. */
  videoId: string;
  /** Canonical watch URL rebuilt from the id. */
  url: string;
  title?: string;
  summary?: string;
  /** Start offset in seconds. */
  start?: number;
};

export type TUiBlock =
  | TUiProductCard
  | TUiComparison
  | TUiDoseCalculator
  | TUiQuickReplies
  | TUiVehiclePicker
  | TUiVideo;

type JsonObject = { [key: string]: unknown };

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const trimmed = String(value).trim().slice(0, max);
  return trimmed === '' ? undefined : trimmed;
};

/** Only absolute https URLs survive, so a block can never inject `javascript:` or data URIs. */
export const safeUiUrl = (value: unknown): string | undefined => {
  const candidate = text(value, 2048);
  if (!candidate) {
    return undefined;
  }
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const positive = (value: unknown): number | undefined => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num > 0 && num < 100000 ? num : undefined;
};

const list = <T>(value: unknown, max: number, map: (item: unknown) => T | undefined): T[] =>
  Array.isArray(value)
    ? value
        .map(map)
        .filter((item): item is T => item !== undefined)
        .slice(0, max)
    : [];

const withOptional = <T extends Record<string, unknown>>(
  base: T,
  extras: Record<string, unknown>,
): T => {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(extras)) {
    if (value !== undefined && !(Array.isArray(value) && value.length === 0)) {
      out[key] = value;
    }
  }
  return out as T;
};

function productCard(raw: JsonObject): TUiProductCard | null {
  const name = text(raw.name, 120);
  const url = safeUiUrl(raw.url);
  if (!name || !url) {
    return null;
  }
  const sizes = list(raw.sizes, MAX_UI_SIZES, (item) => {
    if (!isObject(item)) {
      return undefined;
    }
    const label = text(item.label, 40);
    return label
      ? withOptional<TUiProductSize>({ label }, { price: text(item.price, 40) })
      : undefined;
  });
  return withOptional<TUiProductCard>(
    { type: 'product_card', name, url },
    {
      image: safeUiUrl(raw.image),
      price: text(raw.price, 40),
      sizes,
      summary: text(raw.summary, 400),
      dose: text(raw.dose, 160),
    },
  );
}

function comparison(raw: JsonObject): TUiComparison | null {
  const products = list(raw.products, MAX_UI_COMPARE_PRODUCTS, (item) => {
    if (!isObject(item)) {
      return undefined;
    }
    const name = text(item.name, 120);
    return name
      ? withOptional<TUiComparisonProduct>(
          { name },
          { url: safeUiUrl(item.url), image: safeUiUrl(item.image), price: text(item.price, 40) },
        )
      : undefined;
  });
  if (products.length < 2) {
    return null;
  }
  const rows = list(raw.rows, MAX_UI_COMPARE_ROWS, (item) => {
    if (!isObject(item)) {
      return undefined;
    }
    const label = text(item.label, 60);
    const cells = item.values;
    if (!label || !Array.isArray(cells)) {
      return undefined;
    }
    const values = products.map((_, index) => text(cells[index], 200) ?? '—');
    return { label, values };
  });
  if (rows.length === 0) {
    return null;
  }
  return withOptional<TUiComparison>(
    { type: 'comparison', products, rows },
    { title: text(raw.title, 120), verdict: text(raw.verdict, 300) },
  );
}

const VOLUME_UNITS: readonly TUiVolumeUnit[] = ['oz', 'ml'];
const CAPACITY_UNITS: readonly TUiCapacityUnit[] = ['quart', 'gallon', 'liter'];

function doseCalculator(raw: JsonObject): TUiDoseCalculator | null {
  /** Models sometimes reuse the product card's `name` key here. */
  const product = text(raw.product ?? raw.name, 120);
  const ratio = isObject(raw.ratio) ? raw.ratio : null;
  if (!product || !ratio) {
    return null;
  }
  const amount = positive(ratio.amount);
  const per = positive(ratio.per) ?? 1;
  const unit = VOLUME_UNITS.find((u) => u === ratio.unit);
  const perUnit = CAPACITY_UNITS.find((u) => u === ratio.perUnit);
  if (amount === undefined || !unit || !perUnit) {
    return null;
  }
  return withOptional<TUiDoseCalculator>(
    { type: 'dose_calculator', product, ratio: { amount, unit, per, perUnit } },
    {
      url: safeUiUrl(raw.url),
      capacity: positive(raw.capacity),
      capacityLabel: text(raw.capacityLabel, 80),
      note: text(raw.note, 240),
    },
  );
}

function quickReplies(raw: JsonObject): TUiQuickReplies | null {
  const options = list(raw.options, MAX_UI_QUICK_REPLIES, (item) => text(item, 80));
  if (options.length === 0) {
    return null;
  }
  return withOptional<TUiQuickReplies>(
    {
      type: 'quick_replies',
      options: options.filter((option, index) => options.indexOf(option) === index),
    },
    { prompt: text(raw.prompt, 160) },
  );
}

const VEHICLE_FIELDS: readonly TUiVehicleField[] = ['year', 'make', 'model', 'engine'];

function vehiclePicker(raw: JsonObject): TUiVehiclePicker | null {
  const requested = list(raw.fields, VEHICLE_FIELDS.length, (item) =>
    VEHICLE_FIELDS.find((field) => field === item),
  );
  const fields =
    requested.length > 0
      ? requested.filter((field, index) => requested.indexOf(field) === index)
      : [...VEHICLE_FIELDS];
  return withOptional<TUiVehiclePicker>(
    { type: 'vehicle_picker', fields },
    { prompt: text(raw.prompt, 160) },
  );
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
]);

/** Seconds from a `t`/`start` value such as "90", "90s" or "1m30s". */
const startSeconds = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(value);
  if (!match) {
    return undefined;
  }
  const [, h = '0', m = '0', sec = '0'] = match;
  const total = Number(h) * 3600 + Number(m) * 60 + Number(sec);
  return total > 0 ? total : undefined;
};

/** Video id and start offset from any common YouTube URL shape; null for anything else. */
export function parseYouTubeUrl(value: unknown): { id: string; start?: number } | null {
  const href = safeUiUrl(value);
  if (!href) {
    return null;
  }
  const url = new URL(href);
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }
  const path = url.pathname.split('/').filter(Boolean);
  let candidate = url.searchParams.get('v');
  if (url.hostname === 'youtu.be') {
    candidate = path[0];
  } else if (['shorts', 'embed', 'live'].includes(path[0])) {
    candidate = path[1];
  }
  if (!candidate || !YOUTUBE_ID.test(candidate)) {
    return null;
  }
  const start = startSeconds(url.searchParams.get('t') ?? url.searchParams.get('start'));
  return start ? { id: candidate, start } : { id: candidate };
}

function video(raw: JsonObject): TUiVideo | null {
  const parsed = parseYouTubeUrl(raw.url);
  if (!parsed) {
    return null;
  }
  return withOptional<TUiVideo>(
    {
      type: 'video',
      videoId: parsed.id,
      url: `https://www.youtube.com/watch?v=${parsed.id}`,
    },
    {
      title: text(raw.title, 160),
      summary: text(raw.summary, 300),
      start: positive(raw.start) ?? parsed.start,
    },
  );
}

const BUILDERS: Record<TUiBlock['type'], (raw: JsonObject) => TUiBlock | null> = {
  product_card: productCard,
  comparison,
  dose_calculator: doseCalculator,
  quick_replies: quickReplies,
  vehicle_picker: vehiclePicker,
  video,
};

/**
 * Parses and sanitises one block's JSON. Returns null for anything incomplete or invalid
 * (including JSON still streaming in), so callers can show a placeholder or fall back to text.
 */
export function parseUiBlock(source: string): TUiBlock | null {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return null;
  }
  if (!isObject(raw) || typeof raw.type !== 'string') {
    return null;
  }
  const build = BUILDERS[raw.type as TUiBlock['type']];
  return build ? build(raw) : null;
}

/** Dose for a capacity, rounded to 0.1, in the ratio's own volume unit. */
export function calculateDose(ratio: TUiDoseCalculator['ratio'], capacity: number): number {
  return Math.round(((ratio.amount * capacity) / ratio.per) * 10) / 10;
}
