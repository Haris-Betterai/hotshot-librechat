import type { IntelligenceAuto, IntelligenceOption } from './intelligence';
import {
  ESCALATION_PATTERNS,
  getIntelligenceOptions,
  resolveAutoIntelligence,
  shouldEscalateIntelligence,
  getDefaultIntelligenceIndex,
  seedAutoLevels,
  getSupportedReasoningEfforts,
  normalizeReasoningEffort,
  groupIntelligenceModels,
  isObsoleteIntelligenceModel,
} from './intelligence';

const intelligence = {
  heading: 'Intelligence',
  levels: [
    { label: 'fast', model: 'gpt-5.6-luna' },
    { label: 'smart', model: 'gpt-5.6-terra' },
    { label: 'smarter', model: 'gpt-5.6' },
  ],
};

const auto: IntelligenceAuto = {
  label: 'Auto',
  base: 'fast',
  escalate: 'smarter:high',
  description: 'Picks the right level for each question automatically.',
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

  it('carries per-level description, instructions and recursion limit through', () => {
    const configured = {
      levels: [
        { label: 'Everyday', model: 'a', description: 'Quick answers', recursion_limit: 6 },
        { label: 'Careful', model: 'b', instructions: 'Cite the dosage chart.' },
      ],
    };
    expect(getIntelligenceOptions(configured, 'openAI')).toEqual(configured.levels);
  });
});

describe('Auto intelligence option', () => {
  it('prepends a single Auto option resolved against the expanded presets', () => {
    const options = getIntelligenceOptions({ ...intelligence, auto }, 'openAI');
    expect(options).toHaveLength(6);
    expect(options[0]).toEqual({
      label: 'Auto',
      model: 'gpt-5.6-luna',
      description: 'Picks the right level for each question automatically.',
      auto,
    });
    expect(options.filter((option) => option.auto)).toHaveLength(1);
    expect(options.slice(1).map(({ preset }) => preset)).toEqual([
      'fast',
      'balanced',
      'deep',
      'deeper',
      'deepest',
    ]);
  });

  it('prepends Auto for explicitly saved levels too', () => {
    const configured = {
      levels: [
        { label: 'Everyday', model: 'a' },
        { label: 'Careful', model: 'b' },
      ],
      auto: { label: 'Auto', base: 'Everyday', escalate: 'Careful' },
    };
    const options = getIntelligenceOptions(configured, 'openAI');
    expect(options.map(({ label }) => label)).toEqual(['Auto', 'Everyday', 'Careful']);
    expect(options[0].model).toBe('a');
  });

  it('does not prepend Auto when base or escalate cannot be resolved', () => {
    const levels = [
      { label: 'Everyday', model: 'a' },
      { label: 'Careful', model: 'b' },
    ];
    const missingBase = { levels, auto: { label: 'Auto', base: 'Gone', escalate: 'Careful' } };
    const missingEscalate = { levels, auto: { label: 'Auto', base: 'Everyday', escalate: 'Gone' } };
    expect(getIntelligenceOptions(missingBase, 'openAI')).toEqual(levels);
    expect(getIntelligenceOptions(missingEscalate, 'openAI')).toEqual(levels);
  });

  it('does not prepend Auto when there are fewer than two levels', () => {
    const single = {
      levels: [{ label: 'Everyday', model: 'a' }],
      auto: { label: 'Auto', base: 'Everyday', escalate: 'Everyday' },
    };
    expect(getIntelligenceOptions(single, 'openAI')).toEqual(single.levels);
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

  it('uses the configured default level before every fallback', () => {
    const levels = getIntelligenceOptions({ ...intelligence, auto }, 'openAI');
    expect(getDefaultIntelligenceIndex(levels, 'smarter')).toBe(3);
    expect(
      getDefaultIntelligenceIndex(
        [
          { label: 'Fast', model: 'a' },
          { label: 'Balanced', model: 'b' },
          { label: 'Thorough', model: 'c' },
        ],
        'Thorough',
      ),
    ).toBe(2);
  });

  it('starts on Auto when no default is configured', () => {
    const levels = getIntelligenceOptions({ ...intelligence, auto }, 'openAI');
    expect(getDefaultIntelligenceIndex(levels)).toBe(0);
    expect(levels[0].auto).toEqual(auto);
  });

  it('prefers Auto over a balanced level', () => {
    const levels: IntelligenceOption[] = [
      { label: 'Fast', model: 'a' },
      { label: 'Balanced', model: 'b' },
      { label: 'Auto', model: 'a', auto: { label: 'Auto', base: 'Fast', escalate: 'Balanced' } },
    ];
    expect(getDefaultIntelligenceIndex(levels)).toBe(2);
  });

  it('falls back to balanced when the configured default is stale', () => {
    const levels = [
      { label: 'Fast', model: 'a' },
      { label: 'Balanced', model: 'b' },
    ];
    expect(getDefaultIntelligenceIndex(levels, 'Removed')).toBe(1);
  });

  it('falls back to the most capable level when nothing else matches', () => {
    const levels = [
      { label: 'Fast', model: 'a' },
      { label: 'Careful', model: 'b' },
      { label: 'Thorough', model: 'c' },
    ];
    expect(getDefaultIntelligenceIndex(levels)).toBe(2);
    expect(getDefaultIntelligenceIndex(levels, 'Removed')).toBe(2);
    expect(getDefaultIntelligenceIndex([{ label: 'Only', model: 'a' }])).toBe(0);
  });

  it('returns 0 for an empty list', () => {
    expect(getDefaultIntelligenceIndex([])).toBe(0);
  });
});

describe('shouldEscalateIntelligence', () => {
  it('ignores empty text', () => {
    expect(shouldEscalateIntelligence(undefined)).toBe(false);
    expect(shouldEscalateIntelligence(null)).toBe(false);
    expect(shouldEscalateIntelligence('   ')).toBe(false);
  });

  it.each([
    'How many ounces of Shift Restore for a 2019 Ram 1500?',
    'how much Diesel Extreme per gallon of fuel?',
    'What is the treat ratio for a 15 quart oil capacity?',
    'Do I need to top off after a refill?',
    "I'm getting blue smoke and knocking after 200 miles",
    'truck is in limp mode and the check engine light is on',
    'DPF regen keeps failing and the engine stalls',
    'the motor seized, is that covered under warranty?',
    'my order arrived damaged, I want a refund',
    'someone charged my credit card twice, filing a chargeback',
    'can I mix Diesel Extreme and FR3?',
    'Can I run Stiction Eliminator and LX4 at the same time?',
    'My diesel particulate filter light is on',
    'Can I use it anyway?',
    'Can I add both products all at once?',
    'Can they go in the same tank?',
    'I put the entire bottle into the fuel tank',
    'Is this fuel mixture safe?',
    'Is that combination safe?',
    'My Ram jerks when it changes gears',
    'The transmission is slipping and shudders under load',
    'It has a hard shift at 40 mph',
    'The owners manual says not to use additives',
    'Diesel Extreme versus Everyday Diesel Treatment',
    'what is the difference between LX4 and FR3?',
  ])('escalates %s', (text) => {
    expect(shouldEscalateIntelligence(text)).toBe(true);
  });

  it.each([
    'what does Diesel Extreme do?',
    'show me a picture of the bottle',
    'do you ship to Canada?',
    'where can I buy Hot Shots Secret near me?',
    'what are your business hours?',
  ])('leaves %s on the everyday level', (text) => {
    expect(shouldEscalateIntelligence(text)).toBe(false);
  });

  it('bounds short patterns so ordinary words do not escalate', () => {
    expect(shouldEscalateIntelligence('does it produce ozone in the cabin')).toBe(false);
    expect(shouldEscalateIntelligence('the vsync setting on my dashcam')).toBe(false);
    expect(shouldEscalateIntelligence('how many oz per quart?')).toBe(true);
    expect(shouldEscalateIntelligence('LX4 vs. FR3')).toBe(true);
  });

  it('accepts caller-supplied triggers case-insensitively', () => {
    expect(shouldEscalateIntelligence('Tell me about the ceramic coating')).toBe(false);
    expect(shouldEscalateIntelligence('Tell me about the ceramic coating', ['CERAMIC'])).toBe(true);
    expect(shouldEscalateIntelligence('Tell me about the coating', [' ', ''])).toBe(false);
  });

  it('exports flat, stateless patterns', () => {
    expect(Array.isArray(ESCALATION_PATTERNS)).toBe(true);
    expect(ESCALATION_PATTERNS.every((pattern) => pattern instanceof RegExp)).toBe(true);
    expect(ESCALATION_PATTERNS.some((pattern) => pattern.global)).toBe(false);
    expect(ESCALATION_PATTERNS.every((pattern) => pattern.ignoreCase)).toBe(true);
  });
});

describe('resolveAutoIntelligence', () => {
  const options = getIntelligenceOptions({ ...intelligence, auto }, 'openAI');

  it('routes ordinary questions to the base level', () => {
    expect(resolveAutoIntelligence(options, auto, 'what does Diesel Extreme do?')?.label).toBe(
      'fast',
    );
    expect(resolveAutoIntelligence(options, auto)?.label).toBe('fast');
  });

  it('routes risky questions to the escalation level', () => {
    const resolved = resolveAutoIntelligence(
      options,
      auto,
      'How many ounces of Shift Restore for a 2019 Ram 1500?',
    );
    expect(resolved?.label).toBe('smarter:high');
    expect(resolved?.reasoning_effort).toBe('high');
  });

  it('honours extra triggers configured by staff', () => {
    const withTriggers: IntelligenceAuto = { ...auto, triggers: ['shift restore'] };
    expect(
      resolveAutoIntelligence(options, withTriggers, 'is Shift Restore in stock?')?.label,
    ).toBe('smarter:high');
  });

  it('keeps a conversation escalated after a risky earlier turn', () => {
    expect(
      resolveAutoIntelligence(options, auto, 'just tell me the strongest product', 'smarter:high')
        ?.label,
    ).toBe('smarter:high');
  });

  it('never resolves to the synthetic Auto option', () => {
    const recursive: IntelligenceAuto = { label: 'Auto', base: 'Auto', escalate: 'smarter:high' };
    expect(resolveAutoIntelligence(options, recursive, 'hello')?.label).toBe('smarter:high');
  });

  it('returns undefined when neither label resolves', () => {
    const stale: IntelligenceAuto = { label: 'Auto', base: 'Gone', escalate: 'Also gone' };
    expect(resolveAutoIntelligence(options, stale, 'hello')).toBeUndefined();
  });
});

describe('seedAutoLevels — Fast is never the everyday tier', () => {
  const production = [
    { label: 'Fast', model: 'gpt-5.6-luna' },
    { label: 'Balanced', model: 'gpt-5.6-terra', reasoning_effort: 'low' as const },
    { label: 'Deep', model: 'gpt-5.6', reasoning_effort: 'medium' as const },
    { label: 'Deeper', model: 'gpt-5.6', reasoning_effort: 'high' as const },
    { label: 'Deepest', model: 'gpt-5.6', reasoning_effort: 'max' as const },
  ];

  it('seeds the live ladder to Balanced -> Deep, not Fast -> Deepest', () => {
    expect(seedAutoLevels(production, 'Balanced')).toEqual({ base: 'Balanced', escalate: 'Deep' });
  });

  it('never seeds the cheapest level as the everyday tier, even when it is the configured default', () => {
    expect(seedAutoLevels(production, 'Fast')).toEqual({ base: 'Balanced', escalate: 'Deep' });
  });

  it('escalates to the first reasoning level rather than the slowest one', () => {
    const ladder = [
      { label: 'Quick', model: 'gpt-5.6-luna' },
      { label: 'Normal', model: 'gpt-5.6-terra', reasoning_effort: 'low' as const },
      { label: 'Careful', model: 'gpt-5.6', reasoning_effort: 'high' as const },
      { label: 'Slowest', model: 'gpt-5.6', reasoning_effort: 'max' as const },
    ];
    expect(seedAutoLevels(ladder).escalate).toBe('Careful');
  });

  it('falls back to the level below the escalation tier when nothing is labelled Balanced', () => {
    const ladder = [
      { label: 'One', model: 'gpt-5.6-luna' },
      { label: 'Two', model: 'gpt-5.6-terra' },
      { label: 'Three', model: 'gpt-5.6', reasoning_effort: 'medium' as const },
    ];
    expect(seedAutoLevels(ladder)).toEqual({ base: 'Two', escalate: 'Three' });
  });

  it('uses the only pair available when there are exactly two levels', () => {
    const ladder = [
      { label: 'Fast', model: 'gpt-5.6-luna' },
      { label: 'Deep', model: 'gpt-5.6', reasoning_effort: 'medium' as const },
    ];
    expect(seedAutoLevels(ladder)).toEqual({ base: 'Fast', escalate: 'Deep' });
  });

  it('returns empty labels when there is nothing to route between', () => {
    expect(seedAutoLevels([{ label: 'Only', model: 'gpt-5.6' }])).toEqual({
      base: '',
      escalate: '',
    });
    expect(seedAutoLevels([])).toEqual({ base: '', escalate: '' });
  });

  it('ignores a synthetic Auto option already in the list', () => {
    const withAuto = [
      {
        label: 'Auto',
        model: 'gpt-5.6-terra',
        auto: { label: 'Auto', base: 'Balanced', escalate: 'Deep' },
      },
      ...production,
    ];
    expect(seedAutoLevels(withAuto, 'Balanced')).toEqual({ base: 'Balanced', escalate: 'Deep' });
  });
});

describe('reasoning effort support', () => {
  it('drops none for gpt-6-astra and gpt-6.1-sol', () => {
    const expected = ['low', 'medium', 'high', 'xhigh', 'max'];
    expect(getSupportedReasoningEfforts('gpt-6-astra')).toEqual(expected);
    expect(getSupportedReasoningEfforts('gpt-6.1-sol')).toEqual(expected);
  });

  it('keeps none for gpt-6-luna, gpt-5.6 and unknown models', () => {
    const all = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];
    expect(getSupportedReasoningEfforts('gpt-6-luna')).toEqual(all);
    expect(getSupportedReasoningEfforts('gpt-5.6-terra')).toEqual(all);
    expect(getSupportedReasoningEfforts('custom-model')).toEqual(all);
    expect(getSupportedReasoningEfforts(undefined)).toEqual(all);
  });

  it('moves an unsupported effort to the nearest supported one', () => {
    expect(normalizeReasoningEffort('gpt-6-astra', 'none')).toBe('low');
    expect(normalizeReasoningEffort('gpt-6-astra', 'high')).toBe('high');
    expect(normalizeReasoningEffort('gpt-6-luna', 'none')).toBe('none');
    expect(normalizeReasoningEffort('gpt-6-astra', undefined)).toBeUndefined();
  });
});

describe('level editor model list', () => {
  const models = ['gpt-5.6', 'gpt-6-astra', 'gpt-3.5-turbo-instruct', 'gpt-4o', 'gpt-6-luna'];

  it('hides obsolete models and groups current families first', () => {
    expect(groupIntelligenceModels(models)).toEqual([
      { id: 'gpt6', models: ['gpt-6-astra', 'gpt-6-luna'] },
      { id: 'gpt5', models: ['gpt-5.6'] },
      { id: 'other', models: ['gpt-4o'] },
    ]);
  });

  it('keeps an obsolete model that a saved level already uses', () => {
    const groups = groupIntelligenceModels(models, ['gpt-3.5-turbo-instruct', 'legacy-x']);
    const other = groups.find((group) => group.id === 'other');
    expect(other?.models).toEqual(['gpt-3.5-turbo-instruct', 'gpt-4o', 'legacy-x']);
  });

  it('flags obsolete model names', () => {
    expect(isObsoleteIntelligenceModel('gpt-4-vision-preview')).toBe(true);
    expect(isObsoleteIntelligenceModel('chatgpt-4o-latest')).toBe(true);
    expect(isObsoleteIntelligenceModel('gpt-5.4')).toBe(false);
  });
});
