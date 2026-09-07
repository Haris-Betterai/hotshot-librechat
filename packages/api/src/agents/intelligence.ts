import {
  getIntelligenceOptions,
  isIntelligenceEffort,
  MAX_INTELLIGENCE_LEVELS,
} from 'librechat-data-provider';
import type { Agent, IntelligenceOption } from 'librechat-data-provider';

export type AgentIntelligenceLevel = import('librechat-data-provider').IntelligenceLevel;

export type AgentIntelligence = {
  heading: string;
  levels: AgentIntelligenceLevel[];
  default_level?: string;
};

const MAX_LABEL = 40;
const MAX_HEADING = 80;
const MAX_MODEL = 120;

export function parseIntelligence(input: unknown): AgentIntelligence | null {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const heading = typeof raw.heading === 'string' ? raw.heading.trim().slice(0, MAX_HEADING) : '';
  const rawLevels = Array.isArray(raw.levels) ? raw.levels : [];

  const levels: AgentIntelligenceLevel[] = [];
  for (const item of rawLevels.slice(0, MAX_INTELLIGENCE_LEVELS)) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    const label = typeof row.label === 'string' ? row.label.trim().slice(0, MAX_LABEL) : '';
    const model = typeof row.model === 'string' ? row.model.trim().slice(0, MAX_MODEL) : '';
    if (!label || !model) {
      continue;
    }
    if (levels.some((level) => level.label === label)) {
      continue;
    }
    const reasoning_effort = isIntelligenceEffort(row.reasoning_effort)
      ? row.reasoning_effort
      : undefined;
    levels.push({ label, model, ...(reasoning_effort ? { reasoning_effort } : {}) });
  }

  if (levels.length === 0) {
    return null;
  }

  const defaultLevel =
    typeof raw.default_level === 'string' ? raw.default_level.trim().slice(0, MAX_LABEL) : '';

  return {
    heading: heading || 'Intelligence',
    levels,
    ...(levels.some((level) => level.label === defaultLevel)
      ? { default_level: defaultLevel }
      : {}),
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

export function resolveIntelligenceParameters(
  agent: Pick<Agent, 'intelligence' | 'provider'>,
  modelLabel: string | null | undefined,
): Pick<IntelligenceOption, 'model' | 'reasoning_effort' | 'reasoning_summary'> | undefined {
  if (!modelLabel) {
    return;
  }
  const option = getIntelligenceOptions(agent.intelligence, agent.provider).find(
    (level) => level.label === modelLabel,
  );
  if (!option) {
    return;
  }
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

/** GPT-5.6 models reason by default, and OpenAI rejects function tools with
 *  reasoning on `/v1/chat/completions` ("400 Function tools with
 *  reasoning_effort are not supported ... use /v1/responses"). */
const RESPONSES_API_MODEL_PATTERN = /\bgpt-5\.6\b/;

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
