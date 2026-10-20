import {
  isIntelligenceEffort,
  normalizeReasoningEffort,
  getIntelligenceOptions,
  resolveAutoIntelligence,
  MAX_INTELLIGENCE_LEVELS,
  getDefaultIntelligenceIndex,
} from 'librechat-data-provider';
import type { Agent, IntelligenceAuto, IntelligenceOption } from 'librechat-data-provider';

export type AgentIntelligenceLevel = import('librechat-data-provider').IntelligenceLevel;

export type AgentIntelligence = {
  heading: string;
  levels: AgentIntelligenceLevel[];
  default_level?: string;
  auto?: IntelligenceAuto;
};

export type ResolvedIntelligence = {
  /** Selected slider/default option, including the synthetic Auto label. */
  selectionLabel?: string;
  /** Concrete level that ran — the routed level, never the synthetic Auto option. */
  label: string;
  /** The only part of a level that may reach the provider request. */
  modelOptions: Pick<IntelligenceOption, 'model' | 'reasoning_effort' | 'reasoning_summary'>;
  instructions?: string;
  recursion_limit?: number;
  autoEscalated?: boolean;
};

const MAX_LABEL = 40;
const MAX_HEADING = 80;
const MAX_MODEL = 120;
const MAX_DESCRIPTION = 200;
const MAX_INSTRUCTIONS = 2000;
const MAX_TRIGGER = 60;
const MAX_TRIGGERS = 20;
const MAX_RECURSION_LIMIT = 200;

function parseText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseRecursionLimit(value: unknown): number | undefined {
  const numeric = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
    return;
  }
  const limit = Math.floor(numeric);
  if (limit <= 0) {
    return;
  }
  return Math.min(limit, MAX_RECURSION_LIMIT);
}

function parseTriggers(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const triggers: string[] = [];
  for (const entry of value) {
    const trigger = parseText(entry, MAX_TRIGGER);
    if (!trigger || triggers.includes(trigger)) {
      continue;
    }
    triggers.push(trigger);
    if (triggers.length === MAX_TRIGGERS) {
      break;
    }
  }
  return triggers;
}

function parseLevels(value: unknown): AgentIntelligenceLevel[] {
  const rawLevels = Array.isArray(value) ? value : [];
  const levels: AgentIntelligenceLevel[] = [];
  for (const item of rawLevels.slice(0, MAX_INTELLIGENCE_LEVELS)) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    const label = parseText(row.label, MAX_LABEL);
    const model = parseText(row.model, MAX_MODEL);
    if (!label || !model) {
      continue;
    }
    if (levels.some((level) => level.label === label)) {
      continue;
    }
    const reasoning_effort = isIntelligenceEffort(row.reasoning_effort)
      ? normalizeReasoningEffort(model, row.reasoning_effort)
      : undefined;
    const description = parseText(row.description, MAX_DESCRIPTION);
    const instructions = parseText(row.instructions, MAX_INSTRUCTIONS);
    const recursion_limit = parseRecursionLimit(row.recursion_limit);
    levels.push({
      label,
      model,
      ...(reasoning_effort ? { reasoning_effort } : {}),
      ...(description ? { description } : {}),
      ...(instructions ? { instructions } : {}),
      ...(recursion_limit ? { recursion_limit } : {}),
    });
  }
  return levels;
}

/** Auto is meaningless without both of its endpoints, so an unmatched label drops it whole. */
function parseAuto(value: unknown, levels: AgentIntelligenceLevel[]): IntelligenceAuto | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }
  const raw = value as Record<string, unknown>;
  const base = parseText(raw.base, MAX_LABEL);
  const escalate = parseText(raw.escalate, MAX_LABEL);
  const known = new Set(levels.map((level) => level.label));
  if (!known.has(base) || !known.has(escalate)) {
    return;
  }
  const description = parseText(raw.description, MAX_DESCRIPTION);
  const triggers = parseTriggers(raw.triggers);
  return {
    label: parseText(raw.label, MAX_LABEL) || 'Auto',
    base,
    escalate,
    ...(description ? { description } : {}),
    ...(triggers.length ? { triggers } : {}),
  };
}

/** Auto is selectable as the default even though it is not a stored level. */
function isKnownDefault(
  defaultLevel: string,
  levels: AgentIntelligenceLevel[],
  auto?: IntelligenceAuto,
): boolean {
  if (!defaultLevel) {
    return false;
  }
  return auto?.label === defaultLevel || levels.some((level) => level.label === defaultLevel);
}

export function parseIntelligence(input: unknown): AgentIntelligence | null {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const levels = parseLevels(raw.levels);
  if (levels.length === 0) {
    return null;
  }

  const heading = parseText(raw.heading, MAX_HEADING);
  const defaultLevel = parseText(raw.default_level, MAX_LABEL);
  const auto = parseAuto(raw.auto, levels);

  return {
    heading: heading || 'Intelligence',
    levels,
    ...(isKnownDefault(defaultLevel, levels, auto) ? { default_level: defaultLevel } : {}),
    ...(auto ? { auto } : {}),
  };
}

export function resolveIntelligenceModel(
  intelligence: AgentIntelligence | null | undefined,
  modelLabel: string | null | undefined,
): string | null {
  if (!intelligence?.levels?.length || !modelLabel) {
    return null;
  }

  const match = intelligence.levels.find((level) => level.label === modelLabel);
  return match?.model ?? null;
}

function toModelOptions(
  source: IntelligenceOption,
): Pick<IntelligenceOption, 'model' | 'reasoning_effort' | 'reasoning_summary'> {
  /** Levels saved before a model's supported efforts were known must not 400 the provider. */
  const reasoning_effort = normalizeReasoningEffort(source.model, source.reasoning_effort);
  const option = { ...source, reasoning_effort };
  if (option.reasoning_effort === 'none') {
    return { model: option.model, reasoning_effort: 'none' };
  }
  /** A level that reasons at all should also surface a summary of that
   *  reasoning — otherwise a customer watching "Deepest" think for several
   *  seconds sees nothing but a static dot the whole time. 'auto' lets
   *  OpenAI decide the summary's length; it's the only value guaranteed
   *  supported across reasoning models (unlike 'concise'/'detailed'). */
  return option.reasoning_effort
    ? { model: option.model, reasoning_effort: option.reasoning_effort, reasoning_summary: 'auto' }
    : { model: option.model };
}

/**
 * Resolve the level a request runs on, server-side.
 *
 * A request that carries no level — embeds, the API, an SDK caller — still gets
 * the admin-configured default rather than the agent's fallback model, and an
 * Auto level is routed here from the request text so the routing cannot be
 * skipped by any client. Only `modelOptions` is safe to spread into the
 * provider payload; `instructions` and `recursion_limit` configure the run.
 */
export function resolveIntelligenceParameters(
  agent: Pick<Agent, 'intelligence' | 'provider'>,
  modelLabel: string | null | undefined,
  text?: string | null,
  previousResolvedLabel?: string | null,
  previousSelectionLabel?: string | null,
): ResolvedIntelligence | undefined {
  const options = getIntelligenceOptions(agent.intelligence, agent.provider);
  if (options.length === 0) {
    return;
  }

  const selected =
    (modelLabel ? options.find((option) => option.label === modelLabel) : undefined) ??
    options[getDefaultIntelligenceIndex(options, agent.intelligence?.default_level)];

  const stickyLabel =
    previousSelectionLabel == null || previousSelectionLabel === selected.label
      ? previousResolvedLabel
      : undefined;
  const option = selected.auto
    ? resolveAutoIntelligence(options, selected.auto, text, stickyLabel)
    : selected;
  if (!option) {
    return;
  }

  return {
    ...(selected.auto ? { selectionLabel: selected.label } : {}),
    label: option.label,
    modelOptions: toModelOptions(option),
    ...(option.instructions ? { instructions: option.instructions } : {}),
    ...(option.recursion_limit ? { recursion_limit: option.recursion_limit } : {}),
    ...(selected.auto ? { autoEscalated: option.label === selected.auto.escalate } : {}),
  };
}

/** GPT-5.6 and GPT-6 models reason by default, and OpenAI rejects function tools with
 *  reasoning on `/v1/chat/completions` ("400 Function tools with
 *  reasoning_effort are not supported ... use /v1/responses"). */
const RESPONSES_API_MODEL_PATTERN = /\bgpt-(?:5\.6|6(?:\.\d+)?)\b/;

/**
 * Force the Responses API for a tool-carrying agent on a GPT-5.6 model.
 *
 * `getOpenAILLMConfig` already switches to the Responses API for these models,
 * but only when a reasoning effort was explicitly requested — tools are bound
 * after config time, so it cannot see them. An agent whose level maps to a
 * GPT-5.6 model with no effort set (the "fast" tier) therefore stays on Chat
 * Completions and every tool-using reply fails. Setting the flag here wins
 * over that inference, which only applies when the value is absent.
 */
export function responsesApiOverride({
  model,
  tools,
}: {
  model?: string | null;
  tools?: unknown[] | null;
}): { useResponsesApi: true } | undefined {
  if (typeof model !== 'string' || !RESPONSES_API_MODEL_PATTERN.test(model)) {
    return;
  }
  if (!tools?.length) {
    return;
  }
  return { useResponsesApi: true };
}
