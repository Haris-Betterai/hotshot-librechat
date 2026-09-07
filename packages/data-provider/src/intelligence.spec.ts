import { getIntelligenceOptions, getDefaultIntelligenceIndex } from './intelligence';

const intelligence = {
  heading: 'Intelligence',
  levels: [
    { label: 'fast', model: 'gpt-5.6-luna' },
    { label: 'smart', model: 'gpt-5.6-terra' },
    { label: 'smarter', model: 'gpt-5.6' },
  ],
};

describe('Hotshot intelligence options', () => {
  it('provides five distinct model/effort combinations without changing stored settings', () => {
    const original = structuredClone(intelligence);
    const options = getIntelligenceOptions(intelligence, 'openAI');
    expect(options.map(({ preset }) => preset)).toEqual([
      'fast',
      'balanced',
      'deep',
      'deeper',
      'deepest',
    ]);
    expect(options.map(({ model, reasoning_effort }) => [model, reasoning_effort])).toEqual([
      ['gpt-5.6-luna', undefined],
      ['gpt-5.6-terra', undefined],
      ['gpt-5.6', 'low'],
      ['gpt-5.6', 'medium'],
      ['gpt-5.6', 'high'],
    ]);
    expect(options.slice(0, 3).map(({ label }) => label)).toEqual(['fast', 'smart', 'smarter']);
    expect(intelligence).toEqual(original);
  });

  it('does not invent choices for unconfigured agents', () => {
    expect(getIntelligenceOptions(undefined, 'openAI')).toEqual([]);
    expect(getIntelligenceOptions({ levels: [] }, 'openAI')).toEqual([]);
  });

  it('preserves custom model mappings and other providers', () => {
    const custom = { levels: [{ label: 'Fast', model: 'custom-model' }] };
    expect(getIntelligenceOptions(custom, 'openAI')).toEqual(custom.levels);
    expect(getIntelligenceOptions(intelligence, 'custom')).toEqual(intelligence.levels);
    const renamed = { levels: intelligence.levels.map((level) => ({ ...level, label: 'Custom' })) };
    expect(getIntelligenceOptions(renamed, 'openAI')).toEqual(renamed.levels);
  });
});

describe('getDefaultIntelligenceIndex', () => {
  it('starts on the balanced level when the agent defines one', () => {
    const levels = [
      { label: 'Fast', model: 'gpt-5.6-luna' },
      { label: 'Balanced', model: 'gpt-5.6-terra' },
      { label: 'Deep', model: 'gpt-5.6' },
    ];
    expect(getDefaultIntelligenceIndex(levels)).toBe(1);
  });

  it('matches the balanced preset regardless of the label text', () => {
    const levels = [
      { label: 'Quick', model: 'a', preset: 'fast' as const },
      { label: 'Standard', model: 'b', preset: 'balanced' as const },
    ];
    expect(getDefaultIntelligenceIndex(levels)).toBe(1);
  });

  it('falls back to the first level when there is no balanced level', () => {
    expect(getDefaultIntelligenceIndex([{ label: 'Only', model: 'a' }])).toBe(0);
    expect(getDefaultIntelligenceIndex([])).toBe(0);
  });
});
