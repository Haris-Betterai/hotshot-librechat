import type { Agent } from './types/assistants';

export const intelligenceEfforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type IntelligenceEffort = (typeof intelligenceEfforts)[number];
export const MAX_INTELLIGENCE_LEVELS = 10;
export function isIntelligenceEffort(value: unknown): value is IntelligenceEffort {
  return intelligenceEfforts.some((effort) => effort === value);
}

/** GPT-6 Astra and Sol have no "none" effort; OpenAI rejects it with a 400. */
const NO_NONE_EFFORT_MODEL = /^gpt-6(?:\.\d+)?-(?:astra|sol)$/;

/** Efforts a model accepts, ordered lowest to highest. Unknown models accept every effort. */
export function getSupportedReasoningEfforts(model?: string | null): IntelligenceEffort[] {
  const name = model?.trim().toLowerCase() ?? '';
  return NO_NONE_EFFORT_MODEL.test(name)
    ? intelligenceEfforts.filter((effort) => effort !== 'none')
    : [...intelligenceEfforts];
}

/** Keeps `effort` when the model supports it, otherwise the nearest supported one (none becomes low). */
export function normalizeReasoningEffort(
  model: string | null | undefined,
  effort: IntelligenceEffort | undefined,
): IntelligenceEffort | undefined {
  if (effort === undefined) {
    return undefined;
  }
  const supported = getSupportedReasoningEfforts(model);
  if (supported.includes(effort)) {
    return effort;
  }
  const wanted = intelligenceEfforts.indexOf(effort);
  return supported.reduce((nearest, candidate) =>
    Math.abs(intelligenceEfforts.indexOf(candidate) - wanted) <
    Math.abs(intelligenceEfforts.indexOf(nearest) - wanted)
      ? candidate
      : nearest,
  );
}

const OBSOLETE_MODEL = /^(?:gpt-3\.5|gpt-4-vision|chatgpt-4o-latest)|-instruct(?:-|$)/i;

/** Whether a model is clearly outdated and should not be offered for a new level. */
export function isObsoleteIntelligenceModel(model: string): boolean {
  return OBSOLETE_MODEL.test(model);
}

function modelFamily(model: string): IntelligenceModelGroup['id'] {
  if (/^gpt-6/i.test(model)) {
    return 'gpt6';
  }
  return /^gpt-5/i.test(model) ? 'gpt5' : 'other';
}

export type IntelligenceModelGroup = { id: 'gpt6' | 'gpt5' | 'other'; models: string[] };

/**
 * Models offered by the level editor: current families first, obsolete ones hidden.
 * Models in `keep` (already saved on a level) always stay listed so they remain selectable.
 */
export function groupIntelligenceModels(
  models: string[],
  keep: string[] = [],
): IntelligenceModelGroup[] {
  const kept = new Set(keep);
  const groups: Record<IntelligenceModelGroup['id'], string[]> = { gpt6: [], gpt5: [], other: [] };
  const seen = new Set<string>();
  for (const model of [...models, ...keep]) {
    if (!model || seen.has(model) || (isObsoleteIntelligenceModel(model) && !kept.has(model))) {
      continue;
    }
    seen.add(model);
    groups[modelFamily(model)].push(model);
  }
  return (['gpt6', 'gpt5', 'other'] as const)
    .map((id) => ({ id, models: groups[id] }))
    .filter((group) => group.models.length > 0);
}

export type IntelligenceLevel = {
  label: string;
  model: string;
  reasoning_effort?: IntelligenceEffort;
  /** Staff-authored purpose text, shown to staff and to customers. */
  description?: string;
  /** Appended to the agent's instructions only while this level is active. */
  instructions?: string;
  /** Caps tool/graph steps while this level is active. */
  recursion_limit?: number;
};

/** Routes each request to `base` or `escalate` instead of asking the customer to choose. */
export type IntelligenceAuto = {
  label: string;
  base: string;
  escalate: string;
  /** Extra case-insensitive substrings that force the escalation level. */
  triggers?: string[];
  description?: string;
};

export type IntelligenceOption = IntelligenceLevel & {
  /** Requests a human-readable summary of the model's reasoning from the
   *  Responses API — OpenAI never exposes the raw reasoning tokens, only
   *  this optional summary. Derived alongside `reasoning_effort` rather than
   *  stored per level; see `resolveIntelligenceParameters`. */
  reasoning_summary?: 'auto' | 'concise' | 'detailed';
  preset?: 'fast' | 'balanced' | 'deep' | 'deeper' | 'deepest';
  /** Set only on the synthetic Auto option. */
  auto?: IntelligenceAuto;
};

/** Concrete intelligence tier recorded for a conversation or response. */
export type IntelligenceMetadata = {
  label: string;
  autoEscalated?: boolean;
};

/** Questions where a wrong answer costs money, a warranty, or an engine. */
export const ESCALATION_PATTERNS: RegExp[] = [
  /how much/i,
  /how many/i,
  /\bounces?\b/i,
  /\boz\b/i,
  /\bquarts?\b/i,
  /\bgallons?\b/i,
  /\bdos(?:e|es|ing|age)\b/i,
  /\bratios?\b/i,
  /\bcapacity\b/i,
  /\brefills?\b/i,
  /\btop(?:ping|ped)? off\b/i,
  /\btreat rate\b/i,
  /\bper quart\b/i,
  /\bper gallon\b/i,
  /\bsmok(?:e|es|ed|ing|y)\b/i,
  /\bknock(?:s|ed|ing)?\b/i,
  /\bmisfir(?:e|es|ed|ing)\b/i,
  /\blimp mode\b/i,
  /\bdpf\b/i,
  /\bdiesel particulate filters?\b/i,
  /\bregen(?:eration)?\b/i,
  /\bcheck engine\b/i,
  /\bwarning lights?\b/i,
  /\boverheat(?:s|ed|ing)?\b/i,
  /\bcompression\b/i,
  /\boil pressure\b/i,
  /\bstall(?:s|ed|ing)?\b/i,
  /\b(?:won'?t|wont|will not) start\b/i,
  /\bseiz(?:e|ed|es|ing|ure)\b/i,
  /\bblown\b/i,
  /\brefunds?\b/i,
  /\breturns?\b/i,
  /\bwarranty\b/i,
  /\bdamage(?:s|d)?\b/i,
  /\bcredit card\b/i,
  /\bcard number\b/i,
  /\bcharge ?backs?\b/i,
  /\bmix(?:es|ed|ing)?\b/i,
  /\bmixtures?\b/i,
  /\bcombin(?:e|es|ed|ing)\b/i,
  /\bcombinations?\b/i,
  /\bat the same time\b/i,
  /\ball at once\b/i,
  /\bin the same tank\b/i,
  /\buse (?:it|them) anyway\b/i,
  /\bentire bottle\b/i,
  /\btogether\b/i,
  /\binstead of\b/i,
  /\bcompatib(?:le|ility)\b/i,
  /owner'?s manual/i,
  /\bmanual says\b/i,
  /\bdouble the\b/i,
  /\boverdos(?:e|es|ed|ing|age)\b/i,
  /\bversus\b/i,
  /\bvs\b/i,
  /\bcompar(?:e|es|ed|ing|ison)\b/i,
  /\bdifference between\b/i,
  /\bjerk(?:s|ed|ing)?\b/i,
  /\bslip(?:s|ped|ping)?\b/i,
  /\bshudder(?:s|ed|ing)?\b/i,
  /\bhard shifts?\b/i,
  /\bchanges? gears?\b/i,
];

function findLevel(levels: IntelligenceOption[], label: string): IntelligenceOption | undefined {
  return levels.find((level) => !level.auto && level.label === label);
}

function matchesTrigger(text: string, triggers: string[]): boolean {
  const lowered = text.toLowerCase();
  return triggers.some((trigger) => {
    const needle = trigger.trim().toLowerCase();
    return needle.length > 0 && lowered.includes(needle);
  });
}

/** Whether a request needs the higher level: dosage, mechanical faults, money, or mixing. */
export function shouldEscalateIntelligence(
  text: string | null | undefined,
  triggers?: string[],
): boolean {
  const value = text?.trim();
  if (!value) {
    return false;
  }
  if (ESCALATION_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }
  if (!triggers?.length) {
    return false;
  }
  return matchesTrigger(value, triggers);
}

/** Concrete level an Auto option runs as for this request. */
export function resolveAutoIntelligence(
  options: IntelligenceOption[],
  auto: IntelligenceAuto,
  text?: string | null,
  previousResolvedLabel?: string | null,
): IntelligenceOption | undefined {
  const escalating =
    previousResolvedLabel === auto.escalate || shouldEscalateIntelligence(text, auto.triggers);
  const target = escalating ? auto.escalate : auto.base;
  const fallback = escalating ? auto.base : auto.escalate;
  return findLevel(options, target) ?? findLevel(options, fallback);
}

/**
 * Which level a new chat starts on.
 *
 * Respect an admin-configured default first, then Auto, then Balanced. Without
 * any of those, start on the most capable level — the ladder is ordered faster
 * to smarter, so the last entry is the safest answer for an unknown question.
 */
export function getDefaultIntelligenceIndex(
  levels: IntelligenceOption[],
  defaultLevel?: string,
): number {
  if (levels.length === 0) {
    return 0;
  }
  const configured = defaultLevel ? levels.findIndex((level) => level.label === defaultLevel) : -1;
  if (configured >= 0) {
    return configured;
  }
  const auto = levels.findIndex((level) => level.auto !== undefined);
  if (auto >= 0) {
    return auto;
  }
  const balanced = levels.findIndex(
    (level) => level.preset === 'balanced' || level.label?.trim().toLowerCase() === 'balanced',
  );
  return balanced >= 0 ? balanced : levels.length - 1;
}

const reasoningEfforts = new Set<IntelligenceEffort>(['medium', 'high', 'xhigh', 'max']);

function reasonsDeeply(level: IntelligenceOption): boolean {
  return level.reasoning_effort != null && reasoningEfforts.has(level.reasoning_effort);
}

/**
 * Seeds Auto's two ends when an admin first enables it.
 *
 * The everyday side never seeds to the cheapest level: a customer routed there
 * without choosing it should land on the tier the agent is actually verified
 * on, not on the throwaway one. The escalation side takes the FIRST level that
 * reasons rather than the slowest on the ladder — reasoning is where the
 * behaviour changes, and the top of the ladder only adds latency and cost.
 */
export function seedAutoLevels(
  levels: IntelligenceOption[],
  defaultLabel?: string,
): { base: string; escalate: string } {
  const usable = levels.filter((level) => level.label && level.model && level.auto === undefined);
  if (usable.length < 2) {
    return { base: '', escalate: '' };
  }
  const reasoning = usable.findIndex((level, index) => index > 0 && reasonsDeeply(level));
  const escalateIndex = reasoning > 0 ? reasoning : usable.length - 1;
  const balanced = usable.findIndex(
    (level) => level.preset === 'balanced' || level.label.trim().toLowerCase() === 'balanced',
  );
  const configured = defaultLabel ? usable.findIndex((level) => level.label === defaultLabel) : -1;
  const baseIndex = [balanced, configured, escalateIndex - 1].find(
    (index) => index > 0 && index < escalateIndex,
  );
  return {
    base: usable[baseIndex ?? 0].label,
    escalate: usable[escalateIndex].label,
  };
}

function withAutoOption(
  options: IntelligenceOption[],
  auto?: IntelligenceAuto,
): IntelligenceOption[] {
  if (!auto?.label || options.length < 2 || options.some((option) => option.auto)) {
    return options;
  }
  const base = findLevel(options, auto.base);
  const escalate = findLevel(options, auto.escalate);
  if (!base || !escalate) {
    return options;
  }
  return [
    { label: auto.label, model: base.model, description: auto.description, auto },
    ...options,
  ];
}

/** Expands the original Hotshot profile without rewriting shared agent documents. */
export function getIntelligenceOptions(
  intelligence: Agent['intelligence'],
  provider?: string,
): IntelligenceOption[] {
  const levels = (intelligence?.levels ?? []).filter((level) => level.label && level.model);
  const [fast, smart, smarter] = levels;
  if (
    provider !== 'openAI' ||
    levels.length !== 3 ||
    levels.some((level) => level.reasoning_effort !== undefined) ||
    fast.label.toLowerCase() !== 'fast' ||
    smart.label.toLowerCase() !== 'smart' ||
    smarter.label.toLowerCase() !== 'smarter' ||
    fast.model !== 'gpt-5.6-luna' ||
    smart.model !== 'gpt-5.6-terra' ||
    smarter.model !== 'gpt-5.6'
  ) {
    return withAutoOption(levels, intelligence?.auto);
  }

  return withAutoOption(
    [
      { ...fast, preset: 'fast' },
      { ...smart, preset: 'balanced' },
      { ...smarter, preset: 'deep', reasoning_effort: 'low' },
      {
        label: `${smarter.label}:medium`,
        model: smarter.model,
        preset: 'deeper',
        reasoning_effort: 'medium',
      },
      {
        label: `${smarter.label}:high`,
        model: smarter.model,
        preset: 'deepest',
        reasoning_effort: 'high',
      },
    ],
    intelligence?.auto,
  );
}
