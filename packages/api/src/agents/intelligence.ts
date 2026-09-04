import { getIntelligenceOptions } from 'librechat-data-provider';
import type { Agent, IntelligenceOption } from 'librechat-data-provider';

export type AgentIntelligenceLevel = {
  label: string;
  model: string;
};

export type AgentIntelligence = {
  heading: string;
  levels: AgentIntelligenceLevel[];
};

const MAX_LEVELS = 4;
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
  for (const item of rawLevels.slice(0, MAX_LEVELS)) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    const label = typeof row.label === 'string' ? row.label.trim().slice(0, MAX_LABEL) : '';
    const model = typeof row.model === 'string' ? row.model.trim().slice(0, MAX_MODEL) : '';
    if (!label || !model) {
      continue;
    }
    levels.push({ label, model });
  }

  if (levels.length === 0) {
    return null;
  }

  return {
    heading: heading || 'Intelligence',
    levels,
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
): Pick<IntelligenceOption, 'model' | 'reasoning_effort'> | undefined {
  if (!modelLabel) {
    return;
  }
  const option = getIntelligenceOptions(agent.intelligence, agent.provider).find(
    (level) => level.label === modelLabel,
  );
  if (!option) {
    return;
  }
  return option.reasoning_effort
    ? { model: option.model, reasoning_effort: option.reasoning_effort }
    : { model: option.model };
}
