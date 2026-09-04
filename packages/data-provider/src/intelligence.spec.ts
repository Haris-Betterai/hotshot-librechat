import { getIntelligenceOptions } from './intelligence';

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
