import type { Agent } from './types/assistants';

export type IntelligenceOption = {
  label: string;
  model: string;
  reasoning_effort?: 'low' | 'medium' | 'high';
  preset?: 'fast' | 'balanced' | 'deep' | 'deeper' | 'deepest';
};

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
