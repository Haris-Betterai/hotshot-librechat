import { parseToolName } from './toolLabels';
import type { TranslationKeys } from '~/hooks';

type Localize = (key: TranslationKeys, values?: Record<string, string | number>) => string;
type StepArgs = Record<string, unknown>;
type Detail = (args: StepArgs) => string | undefined;

export interface ToolStep {
  name: string;
  args?: string | StepArgs | null;
  done: boolean;
}

export interface StepLabel {
  id: string;
  label: string;
  done: boolean;
}

interface StepSpec {
  detail?: Detail;
  done: string;
  active: string;
  doneBare?: string;
  activeBare?: string;
}

const MAX_DETAIL = 60;
const WEB_SEARCH = /^web_search/;

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > MAX_DETAIL ? `${trimmed.slice(0, MAX_DETAIL - 1)}…` : trimmed;
};

const firstText = (args: StepArgs, keys: string[]): string | undefined =>
  keys.map((key) => text(args[key])).find((value) => value != null);

const hostOf = (value: string): string | undefined => {
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(
      /^www\./,
      '',
    );
  } catch {
    return undefined;
  }
};

const webDomain: Detail = (args) => {
  const listed = [args.domains, args.allowed_domains].find(Array.isArray) as unknown[] | undefined;
  const candidate = text(listed?.[0]) ?? firstText(args, ['url', 'domain', 'site']);
  return candidate ? hostOf(candidate) : undefined;
};

const DOCUMENT_KINDS: Record<string, string> = {
  sds: 'safety data sheet',
  tech: 'tech data sheet',
};

/** "Gasoline Extreme safety data sheet"; a missing or "any" kind reads as "product sheets". */
const documentDetail: Detail = (args) => {
  const product = text(args.product);
  if (!product) {
    return undefined;
  }
  const kind = typeof args.document === 'string' ? DOCUMENT_KINDS[args.document] : undefined;
  return `${product} ${kind ?? 'product sheets'}`;
};

/** English copy is the fallback until the keys exist in translation.json. */
const SPECS: Record<string, StepSpec> = {
  products: {
    detail: (a) => firstText(a, ['partial_name', 'name', 'query']),
    done: 'Looked up {{0}}',
    active: 'Looking up {{0}}…',
    doneBare: 'Looked up products',
    activeBare: 'Looking up products…',
  },
  symptoms: {
    detail: (a) => firstText(a, ['engine', 'vehicle', 'symptom']),
    done: 'Checked symptoms for {{0}}',
    active: 'Checking symptoms for {{0}}…',
    doneBare: 'Checked symptoms',
    activeBare: 'Checking symptoms…',
  },
  symptom_details: {
    done: 'Read the diagnosis guide',
    active: 'Reading the diagnosis guide…',
  },
  faqs: { done: 'Checked FAQs', active: 'Checking FAQs…' },
  fluid_capacity: {
    detail: (a) => firstText(a, ['vehicle', 'engine']),
    done: 'Checked fluid capacity for {{0}}',
    active: 'Checking fluid capacity for {{0}}…',
    doneBare: 'Checked fluid capacity',
    activeBare: 'Checking fluid capacity…',
  },
  product_page: { done: 'Read the product page', active: 'Reading the product page…' },
  category: {
    detail: (a) => firstText(a, ['category']),
    done: 'Browsed {{0}}',
    active: 'Browsing {{0}}…',
    doneBare: 'Browsed products',
    activeBare: 'Browsing products…',
  },
  videos: { done: 'Found related videos', active: 'Finding related videos…' },
  documents: {
    detail: documentDetail,
    done: 'Read the {{0}}',
    active: 'Reading the {{0}}…',
    doneBare: 'Read the product sheets',
    activeBare: 'Reading the product sheets…',
  },
  web: {
    detail: webDomain,
    done: 'Searched {{0}}',
    active: 'Searching {{0}}…',
    doneBare: 'Searched the web',
    activeBare: 'Searching the web…',
  },
};

const TOOL_SPEC_IDS: Record<string, string> = {
  search_products_by_name: 'products',
  get_all_symptoms: 'symptoms',
  get_symptom_details: 'symptom_details',
  search_faqs: 'faqs',
  get_all_fluid_capacities: 'fluid_capacity',
  get_product_by_url: 'product_page',
  list_products_by_category: 'category',
  recommend_youtube_video: 'videos',
  get_product_document: 'documents',
};

const keyFor = (id: string, variant: string): TranslationKeys =>
  `com_ui_step_${id}_${variant}` as TranslationKeys;

const interpolate = (template: string, value?: string): string =>
  value == null ? template : template.replace('{{0}}', value);

/** Falls back to the English copy while the translation key is missing. */
const translate = (
  localize: Localize,
  id: string,
  variant: string,
  fallback: string,
  detail?: string,
): string => {
  const key = keyFor(id, variant);
  const out = localize(key, detail == null ? undefined : { 0: detail });
  return out === key ? interpolate(fallback, detail) : out;
};

export const parseArgs = (args: ToolStep['args']): StepArgs => {
  if (args == null) {
    return {};
  }
  if (typeof args !== 'string') {
    return args;
  }
  try {
    const parsed: unknown = JSON.parse(args);
    return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as StepArgs)
      : {};
  } catch {
    return {};
  }
};

/** Resolves a raw tool id to its friendly spec id, stripping any `_mcp_<server>` suffix. */
export const resolveStepId = (rawName: string): string => {
  const base = parseToolName(rawName).toolName;
  if (WEB_SEARCH.test(base)) {
    return 'web';
  }
  return TOOL_SPEC_IDS[base] ?? `other:${base}`;
};

export const sentenceCase = (raw: string): string => {
  const words = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
};

const joinDetails = (details: string[]): string =>
  new Intl.ListFormat(undefined, { style: 'long', type: 'conjunction' }).format(details);

const uniqueDetails = (details: string[]): string[] => {
  const seen = new Set<string>();
  return details.filter((detail) => {
    const key = detail.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const render = (
  id: string,
  rawName: string,
  details: string[],
  done: boolean,
  localize: Localize,
): string => {
  const spec = SPECS[id];
  if (!spec) {
    const name = sentenceCase(parseToolName(rawName).toolName);
    return done ? name : `${name}…`;
  }
  const variant = done ? 'done' : 'active';
  if (details.length === 0 && spec.doneBare) {
    return translate(
      localize,
      id,
      `${variant}_bare`,
      (done ? spec.doneBare : spec.activeBare) ?? spec.done,
    );
  }
  const detail = details.length > 0 ? joinDetails(details) : undefined;
  return translate(localize, id, variant, done ? spec.done : spec.active, detail);
};

/**
 * Friendly step list: one label per run of consecutive identical tools, with
 * their details merged ("Looked up Diesel Extreme and Everyday Diesel Treatment").
 */
export function describeSteps(steps: ToolStep[], localize: Localize): StepLabel[] {
  const merged = steps.reduce<
    Array<{ id: string; name: string; details: string[]; done: boolean }>
  >((acc, step) => {
    const id = resolveStepId(step.name);
    const detail = SPECS[id]?.detail?.(parseArgs(step.args));
    const last = acc[acc.length - 1];
    if (last && last.id === id) {
      last.done = last.done && step.done;
      if (detail) {
        last.details.push(detail);
      }
      return acc;
    }
    acc.push({ id, name: step.name, details: detail ? [detail] : [], done: step.done });
    return acc;
  }, []);

  return merged.map(({ id, name, details, done }) => ({
    id,
    done,
    label: render(id, name, uniqueDetails(details), done, localize),
  }));
}

export const describeStep = (step: ToolStep, localize: Localize): string =>
  describeSteps([step], localize)[0]?.label ?? '';

/** True when the tool has a friendly label (MCP tools and web search). */
export const isFriendlyTool = (rawName: string): boolean =>
  parseToolName(rawName).mcpServer !== '' || WEB_SEARCH.test(rawName);
