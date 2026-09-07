import type { Agent } from './types/assistants';

export const intelligenceEfforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type IntelligenceEffort = (typeof intelligenceEfforts)[number];
export const MAX_INTELLIGENCE_LEVELS = 10;
export function isIntelligenceEffort(value: unknown): value is IntelligenceEffort {
  return intelligenceEfforts.some((effort) => effort === value);
}

export type IntelligenceLevel = {
  label: string;
  model: string;
  reasoning_effort?: IntelligenceEffort;
};

export type IntelligenceOption = IntelligenceLevel & {
  /** Requests a human-readable summary of the model's reasoning from the
   *  Responses API — OpenAI never exposes the raw reasoning tokens, only
   *  this optional summary. Derived alongside `reasoning_effort` rather than
   *  stored per level; see `resolveIntelligenceParameters`. */
  reasoning_summary?: 'auto' | 'concise' | 'detailed';
  preset?: 'fast' | 'balanced' | 'deep' | 'deeper' | 'deepest';
};

/**
 * Which level a new chat starts on.
 *
 * Respect an admin-configured default first. Agents saved before that setting
 * existed continue to start on Balanced when available, then fall back to the
 * first level.
 */
export function getDefaultIntelligenceIndex(
  levels: IntelligenceOption[],
  defaultLevel?: string,
): number {
  const configured = defaultLevel ? levels.findIndex((level) => level.label === defaultLevel) : -1;
  if (configured >= 0) {
    return configured;
  }
  const balanced = levels.findIndex(
    (level) => level.preset === 'balanced' || level.label?.trim().toLowerCase() === 'balanced',
  );
  return balanced >= 0 ? balanced : 0;
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
    return levels;
  }

  return [
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
  ];
}
