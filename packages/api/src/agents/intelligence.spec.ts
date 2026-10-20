import type { AgentIntelligence } from './intelligence';
import {
  parseIntelligence,
  responsesApiOverride,
  resolveIntelligenceModel,
  resolveIntelligenceParameters,
} from './intelligence';

const asAgent = (intelligence: AgentIntelligence | null, provider = 'openAI') => ({
  provider,
  intelligence: intelligence ?? undefined,
});

describe('admin-configured intelligence', () => {
  it('round-trips ten saved levels and an explicit default', () => {
    const efforts = ['none', 'low', 'medium', 'high', 'max'] as const;
    const levels = Array.from({ length: 10 }, (_, index) => ({
      label: `Level ${index + 1}`,
      model: 'gpt-5.6-sol',
      reasoning_effort: efforts[index % efforts.length],
    }));
    const intelligence = parseIntelligence({
      heading: 'Thinking',
      levels,
      default_level: 'Level 8',
    });
    expect(intelligence?.levels).toEqual(levels);
    expect(intelligence?.default_level).toBe('Level 8');
    const configured = asAgent(intelligence);
    expect(resolveIntelligenceParameters(configured, 'Level 10')).toEqual({
      label: 'Level 10',
      modelOptions: {
        model: 'gpt-5.6-sol',
        reasoning_effort: 'max',
        reasoning_summary: 'auto',
      },
    });
    expect(resolveIntelligenceParameters(configured, 'Level 1')).toEqual({
      label: 'Level 1',
      modelOptions: { model: 'gpt-5.6-sol', reasoning_effort: 'none' },
    });
    expect(responsesApiOverride({ model: 'gpt-5.6-sol', tools: ['lookup'] })).toEqual({
      useResponsesApi: true,
    });
  });

  it('strips invalid efforts and ignores duplicate labels', () => {
    expect(
      parseIntelligence({
        levels: [
          { label: 'Custom', model: 'gpt-5.6', reasoning_effort: 'ultra' },
          { label: 'Custom', model: 'other', reasoning_effort: 'max' },
        ],
      })?.levels,
    ).toEqual([{ label: 'Custom', model: 'gpt-5.6' }]);
  });

  it('drops a default that does not match a saved level', () => {
    expect(
      parseIntelligence({
        levels: [{ label: 'Balanced', model: 'gpt-5.6-terra' }],
        default_level: 'Removed',
      }),
    ).toEqual({
      heading: 'Intelligence',
      levels: [{ label: 'Balanced', model: 'gpt-5.6-terra' }],
    });
  });

  it('rejects input that is not a level-carrying object', () => {
    expect(parseIntelligence(null)).toBeNull();
    expect(parseIntelligence('levels')).toBeNull();
    expect(parseIntelligence([{ label: 'Fast', model: 'gpt-5.6-luna' }])).toBeNull();
    expect(parseIntelligence({ levels: [] })).toBeNull();
    expect(parseIntelligence({ levels: [{ label: 'Fast' }, { model: 'gpt-5.6' }, 7, null] })).toBe(
      null,
    );
  });
});

describe('parseIntelligence per-level copy and limits', () => {
  it('trims a description and caps it at 200 characters', () => {
    const level = parseIntelligence({
      levels: [
        { label: 'Fast', model: 'gpt-5.6-luna', description: '  Everyday product questions  ' },
      ],
    })?.levels[0];
    expect(level?.description).toBe('Everyday product questions');

    const long = parseIntelligence({
      levels: [{ label: 'Fast', model: 'gpt-5.6-luna', description: 'd'.repeat(400) }],
    })?.levels[0];
    expect(long?.description).toHaveLength(200);
  });

  it('trims level instructions and caps them at 2000 characters', () => {
    const level = parseIntelligence({
      levels: [
        { label: 'Deep', model: 'gpt-5.6', instructions: '\n Always quote the treat rate. \n' },
      ],
    })?.levels[0];
    expect(level?.instructions).toBe('Always quote the treat rate.');

    const long = parseIntelligence({
      levels: [{ label: 'Deep', model: 'gpt-5.6', instructions: 'i'.repeat(5000) }],
    })?.levels[0];
    expect(long?.instructions).toHaveLength(2000);
  });

  it('omits blank description and instructions rather than storing empty strings', () => {
    const level = parseIntelligence({
      levels: [{ label: 'Fast', model: 'gpt-5.6-luna', description: '   ', instructions: '' }],
    })?.levels[0];
    expect(level).toEqual({ label: 'Fast', model: 'gpt-5.6-luna' });
  });

  it.each([
    { input: 12, expected: 12 },
    { input: 200, expected: 200 },
    { input: 500, expected: 200 },
    { input: 12.9, expected: 12 },
    { input: '25', expected: 25 },
  ])('keeps recursion_limit $input as $expected', ({ input, expected }) => {
    expect(
      parseIntelligence({
        levels: [{ label: 'Deep', model: 'gpt-5.6', recursion_limit: input }],
      })?.levels[0]?.recursion_limit,
    ).toBe(expected);
  });

  it.each([0, -5, 0.4, Number.NaN, Number.POSITIVE_INFINITY, 'lots', null, true])(
    'drops recursion_limit %p',
    (input) => {
      expect(
        parseIntelligence({
          levels: [{ label: 'Deep', model: 'gpt-5.6', recursion_limit: input }],
        })?.levels[0],
      ).toEqual({ label: 'Deep', model: 'gpt-5.6' });
    },
  );
});

describe('parseIntelligence auto routing config', () => {
  const levels = [
    { label: 'Fast', model: 'gpt-5.6-luna' },
    { label: 'Deep', model: 'gpt-5.6', reasoning_effort: 'high' },
  ];

  it('keeps an auto block whose base and escalate both name saved levels', () => {
    expect(
      parseIntelligence({
        levels,
        auto: {
          label: '  Auto  ',
          base: 'Fast',
          escalate: 'Deep',
          description: '  Picks for you  ',
          triggers: [' Stiction Eliminator ', '', '   ', 'lx4'],
        },
      })?.auto,
    ).toEqual({
      label: 'Auto',
      base: 'Fast',
      escalate: 'Deep',
      description: 'Picks for you',
      triggers: ['Stiction Eliminator', 'lx4'],
    });
  });

  it('defaults the auto label when staff leave it blank', () => {
    expect(
      parseIntelligence({ levels, auto: { label: '   ', base: 'Fast', escalate: 'Deep' } })?.auto
        ?.label,
    ).toBe('Auto');
  });

  it.each([
    { name: 'an unknown base', auto: { label: 'Auto', base: 'Ghost', escalate: 'Deep' } },
    { name: 'an unknown escalate', auto: { label: 'Auto', base: 'Fast', escalate: 'Ghost' } },
    { name: 'a missing base', auto: { label: 'Auto', escalate: 'Deep' } },
    { name: 'a renamed level', auto: { label: 'Auto', base: 'fast', escalate: 'Deep' } },
    { name: 'a non-object', auto: 'Fast -> Deep' },
    { name: 'an array', auto: ['Fast', 'Deep'] },
  ])('drops auto with $name', ({ auto }) => {
    expect(parseIntelligence({ levels, auto })?.auto).toBeUndefined();
  });

  it('caps triggers at twenty entries of sixty characters', () => {
    const auto = parseIntelligence({
      levels,
      auto: {
        label: 'Auto',
        base: 'Fast',
        escalate: 'Deep',
        triggers: [
          't'.repeat(120),
          ...Array.from({ length: 25 }, (_, index) => `trigger-${index}`),
        ],
      },
    })?.auto;
    expect(auto?.triggers).toHaveLength(20);
    expect(auto?.triggers?.[0]).toHaveLength(60);
    expect(auto?.triggers?.[19]).toBe('trigger-18');
  });

  it('keeps Auto as the saved default — the exact shape the staff editor writes', () => {
    const saved = parseIntelligence({
      heading: 'Intelligence',
      levels,
      default_level: 'Auto',
      auto: { label: 'Auto', base: 'Fast', escalate: 'Deep' },
    });
    expect(saved?.default_level).toBe('Auto');
    expect(resolveIntelligenceParameters(asAgent(saved), null, 'do you ship to Canada?')).toEqual({
      selectionLabel: 'Auto',
      label: 'Fast',
      modelOptions: { model: 'gpt-5.6-luna' },
      autoEscalated: false,
    });
  });

  it('drops a default that names neither a saved level nor Auto', () => {
    expect(
      parseIntelligence({
        levels,
        default_level: 'Ghost',
        auto: { label: 'Auto', base: 'Fast', escalate: 'Deep' },
      })?.default_level,
    ).toBeUndefined();
  });

  it('drops a default naming an Auto block that was itself dropped', () => {
    expect(
      parseIntelligence({
        levels,
        default_level: 'Auto',
        auto: { label: 'Auto', base: 'Fast', escalate: 'Ghost' },
      })?.default_level,
    ).toBeUndefined();
  });
});

const agent = {
  provider: 'openAI',
  intelligence: {
    heading: 'Intelligence',
    levels: [
      { label: 'fast', model: 'gpt-5.6-luna' },
      { label: 'smart', model: 'gpt-5.6-terra' },
      { label: 'smarter', model: 'gpt-5.6' },
    ],
  },
};

describe('resolveIntelligenceParameters', () => {
  it.each([
    { label: 'fast', expected: { model: 'gpt-5.6-luna' } },
    { label: 'smart', expected: { model: 'gpt-5.6-terra' } },
    {
      label: 'smarter',
      expected: { model: 'gpt-5.6', reasoning_effort: 'low', reasoning_summary: 'auto' },
    },
    {
      label: 'smarter:medium',
      expected: { model: 'gpt-5.6', reasoning_effort: 'medium', reasoning_summary: 'auto' },
    },
    {
      label: 'smarter:high',
      expected: { model: 'gpt-5.6', reasoning_effort: 'high', reasoning_summary: 'auto' },
    },
  ])('resolves the server-approved setting for $label', ({ label, expected }) => {
    expect(resolveIntelligenceParameters(agent, label)).toEqual({ label, modelOptions: expected });
  });

  it('requests a reasoning summary whenever a level reasons, not just for non-reasoning tiers', () => {
    const result = resolveIntelligenceParameters(agent, 'smarter:high');
    expect(result?.modelOptions.reasoning_summary).toBe('auto');
  });

  it('omits reasoning_summary for a tier with no reasoning_effort', () => {
    const result = resolveIntelligenceParameters(agent, 'fast');
    expect(result?.modelOptions).not.toHaveProperty('reasoning_summary');
  });

  it('keeps custom labels and models unchanged', () => {
    const custom = asAgent(parseIntelligence({ levels: [{ label: 'Custom', model: 'custom' }] }));
    expect(resolveIntelligenceParameters(custom, 'Custom')).toEqual({
      label: 'Custom',
      modelOptions: { model: 'custom' },
    });
  });

  it('returns undefined for an agent with no usable levels', () => {
    expect(resolveIntelligenceParameters({ provider: 'openAI' }, 'fast')).toBeUndefined();
    expect(
      resolveIntelligenceParameters({ provider: 'openAI', intelligence: {} }, 'fast'),
    ).toBeUndefined();
    expect(
      resolveIntelligenceParameters({ provider: 'openAI', intelligence: { levels: [] } }, null),
    ).toBeUndefined();
    expect(
      resolveIntelligenceParameters(
        { provider: 'openAI', intelligence: { levels: [{ label: '', model: '' }] } },
        undefined,
      ),
    ).toBeUndefined();
  });
});

describe('server-side default level (embed, API and SDK requests)', () => {
  it.each([null, undefined, '', 'smarter:ultra', 'arbitrary-model'])(
    'falls back to the balanced level for %p instead of the agent fallback model',
    (label) => {
      expect(resolveIntelligenceParameters(agent, label)).toEqual({
        label: 'smart',
        modelOptions: { model: 'gpt-5.6-terra' },
      });
    },
  );

  it('prefers the admin-configured default over balanced', () => {
    const configured = asAgent(
      parseIntelligence({
        levels: agent.intelligence.levels,
        default_level: 'smarter',
      }),
    );
    expect(resolveIntelligenceParameters(configured, null)).toEqual({
      label: 'smarter',
      modelOptions: { model: 'gpt-5.6', reasoning_effort: 'low', reasoning_summary: 'auto' },
    });
  });

  it('starts on the most capable level when nothing else applies', () => {
    const ladder = asAgent(
      parseIntelligence({
        levels: [
          { label: 'Quick', model: 'gpt-5.6-luna' },
          { label: 'Careful', model: 'gpt-5.6-terra' },
          { label: 'Thorough', model: 'gpt-5.6', reasoning_effort: 'high' },
        ],
      }),
    );
    expect(resolveIntelligenceParameters(ladder, undefined)).toEqual({
      label: 'Thorough',
      modelOptions: { model: 'gpt-5.6', reasoning_effort: 'high', reasoning_summary: 'auto' },
    });
  });

  it('prefers a level literally labelled Balanced over the most capable one', () => {
    const named = asAgent(
      parseIntelligence({
        levels: [
          { label: 'Quick', model: 'gpt-5.6-luna' },
          { label: 'Balanced', model: 'gpt-5.6-terra' },
          { label: 'Thorough', model: 'gpt-5.6', reasoning_effort: 'high' },
        ],
      }),
    );
    expect(resolveIntelligenceParameters(named, null)?.label).toBe('Balanced');
  });

  it('never returns the agent fallback model for a single-level agent', () => {
    const single = asAgent(parseIntelligence({ levels: [{ label: 'Only', model: 'custom' }] }));
    expect(resolveIntelligenceParameters(single, 'smarter:high')).toEqual({
      label: 'Only',
      modelOptions: { model: 'custom' },
    });
  });
});

describe('auto level routing', () => {
  const autoAgent = asAgent(
    parseIntelligence({
      levels: agent.intelligence.levels,
      auto: {
        label: 'Auto',
        base: 'fast',
        escalate: 'smarter',
        triggers: ['stiction eliminator'],
      },
    }),
  );

  const base = {
    selectionLabel: 'Auto',
    label: 'fast',
    modelOptions: { model: 'gpt-5.6-luna' },
    autoEscalated: false,
  };
  const escalated = {
    selectionLabel: 'Auto',
    label: 'smarter',
    modelOptions: { model: 'gpt-5.6', reasoning_effort: 'low', reasoning_summary: 'auto' },
    autoEscalated: true,
  };

  it('is the level a request with no explicit label lands on', () => {
    expect(resolveIntelligenceParameters(autoAgent, null, 'Where do you ship from?')).toEqual(base);
  });

  it.each([
    'How much Stiction Eliminator do I need for a 12 quart oil capacity?',
    'How many ounces per gallon of diesel?',
    'What is the treat rate for a 6.7 Cummins?',
    'My truck started blowing white smoke after the last oil change.',
    'The check engine light came on and it went into limp mode.',
    'Can I mix this with the oil already in the crankcase?',
    'I want a refund, the bottle arrived damaged.',
    'What is the difference between LX4 and Diesel Extreme?',
    'My DPF will not finish a regen.',
  ])('escalates %j', (text) => {
    expect(resolveIntelligenceParameters(autoAgent, null, text)).toEqual(escalated);
  });

  it.each([
    'Do you ship to Canada?',
    'What are your customer service hours?',
    'Thanks, that answered my question!',
    'Where is the nearest retailer?',
    '',
    '   ',
  ])('stays on the everyday level for %j', (text) => {
    expect(resolveIntelligenceParameters(autoAgent, null, text)).toEqual(base);
  });

  it('routes to the everyday level when the request carries no text at all', () => {
    expect(resolveIntelligenceParameters(autoAgent, null)).toEqual(base);
    expect(resolveIntelligenceParameters(autoAgent, null, null)).toEqual(base);
  });

  it('escalates on a staff-authored trigger, case-insensitively', () => {
    expect(
      resolveIntelligenceParameters(autoAgent, null, 'I ordered STICTION ELIMINATOR yesterday'),
    ).toEqual(escalated);
  });

  it('keeps Auto escalated when the conversation previously ran on the escalation level', () => {
    expect(
      resolveIntelligenceParameters(
        autoAgent,
        null,
        'just tell me the strongest product',
        'smarter',
      ),
    ).toEqual(escalated);
  });

  it('does not carry sticky escalation across a different selected mode', () => {
    expect(
      resolveIntelligenceParameters(
        autoAgent,
        null,
        'just tell me the strongest product',
        'smarter',
        'smart',
      ),
    ).toEqual(base);
  });

  it('reports the concrete level that ran, never the Auto label', () => {
    expect(resolveIntelligenceParameters(autoAgent, null, 'how much per gallon?')?.label).toBe(
      'smarter',
    );
    expect(resolveIntelligenceParameters(autoAgent, null, 'hello there')?.label).toBe('fast');
  });

  it('honours an explicitly selected level instead of routing', () => {
    expect(resolveIntelligenceParameters(autoAgent, 'smart', 'how many ounces?')).toEqual({
      label: 'smart',
      modelOptions: { model: 'gpt-5.6-terra' },
    });
  });

  it('lets an admin-configured default win over Auto', () => {
    const defaulted = asAgent(
      parseIntelligence({
        levels: agent.intelligence.levels,
        default_level: 'smart',
        auto: { label: 'Auto', base: 'fast', escalate: 'smarter' },
      }),
    );
    expect(resolveIntelligenceParameters(defaulted, null, 'how many ounces?')).toEqual({
      label: 'smart',
      modelOptions: { model: 'gpt-5.6-terra' },
    });
  });

  it('routes across explicitly saved levels too, not just the legacy preset ladder', () => {
    const custom = asAgent(
      parseIntelligence({
        levels: [
          { label: 'Everyday', model: 'gpt-5.6-luna' },
          { label: 'Technical', model: 'gpt-5.6', reasoning_effort: 'high' },
        ],
        auto: { label: 'Auto', base: 'Everyday', escalate: 'Technical' },
      }),
    );
    expect(resolveIntelligenceParameters(custom, null, 'do you have a catalog?')).toEqual({
      selectionLabel: 'Auto',
      label: 'Everyday',
      modelOptions: { model: 'gpt-5.6-luna' },
      autoEscalated: false,
    });
    expect(resolveIntelligenceParameters(custom, null, 'can I double the dose?')).toEqual({
      selectionLabel: 'Auto',
      label: 'Technical',
      modelOptions: { model: 'gpt-5.6', reasoning_effort: 'high', reasoning_summary: 'auto' },
      autoEscalated: true,
    });
  });
});

describe('per-level instructions and tool step limit', () => {
  const tiered = asAgent(
    parseIntelligence({
      levels: [
        {
          label: 'Everyday',
          model: 'gpt-5.6-luna',
          description: 'Quick answers about orders and shipping.',
          instructions: 'Answer in two sentences and offer to escalate.',
          recursion_limit: 4,
        },
        {
          label: 'Technical',
          model: 'gpt-5.6',
          reasoning_effort: 'high',
          instructions: 'Always cite the product page treat rate before answering.',
          recursion_limit: 500,
        },
      ],
    }),
  );

  it('returns the level instructions alongside the model options', () => {
    expect(resolveIntelligenceParameters(tiered, 'Everyday')).toEqual({
      label: 'Everyday',
      modelOptions: { model: 'gpt-5.6-luna' },
      instructions: 'Answer in two sentences and offer to escalate.',
      recursion_limit: 4,
    });
  });

  it('clamps a saved tool step limit and carries it through resolution', () => {
    expect(resolveIntelligenceParameters(tiered, 'Technical')?.recursion_limit).toBe(200);
  });

  it('never leaks run configuration into the provider payload', () => {
    for (const label of ['Everyday', 'Technical']) {
      const keys = Object.keys(resolveIntelligenceParameters(tiered, label)?.modelOptions ?? {});
      expect(keys).not.toContain('instructions');
      expect(keys).not.toContain('recursion_limit');
      expect(keys).not.toContain('label');
      expect(keys).not.toContain('description');
      expect(keys).not.toContain('preset');
      expect(keys).not.toContain('auto');
    }
  });

  it('omits instructions and recursion_limit for a level that sets neither', () => {
    const result = resolveIntelligenceParameters(agent, 'fast');
    expect(result).not.toHaveProperty('instructions');
    expect(result).not.toHaveProperty('recursion_limit');
  });

  it('applies the routed level configuration, not the Auto option', () => {
    const routed = asAgent(
      parseIntelligence({
        levels: [
          { label: 'Everyday', model: 'gpt-5.6-luna', recursion_limit: 3 },
          {
            label: 'Technical',
            model: 'gpt-5.6',
            reasoning_effort: 'high',
            instructions: 'Confirm the engine and oil capacity first.',
            recursion_limit: 40,
          },
        ],
        auto: { label: 'Auto', base: 'Everyday', escalate: 'Technical' },
      }),
    );
    expect(resolveIntelligenceParameters(routed, null, 'what is the oil capacity dose?')).toEqual({
      selectionLabel: 'Auto',
      label: 'Technical',
      modelOptions: { model: 'gpt-5.6', reasoning_effort: 'high', reasoning_summary: 'auto' },
      instructions: 'Confirm the engine and oil capacity first.',
      recursion_limit: 40,
      autoEscalated: true,
    });
    expect(resolveIntelligenceParameters(routed, null, 'hello')).toEqual({
      selectionLabel: 'Auto',
      label: 'Everyday',
      modelOptions: { model: 'gpt-5.6-luna' },
      recursion_limit: 3,
      autoEscalated: false,
    });
  });
});

describe('resolveIntelligenceModel', () => {
  const intelligence = parseIntelligence({
    levels: [
      { label: 'Fast', model: 'gpt-5.6-luna' },
      { label: 'Deep', model: 'gpt-5.6' },
    ],
  });

  it('maps a saved label to its model', () => {
    expect(resolveIntelligenceModel(intelligence, 'Deep')).toBe('gpt-5.6');
  });

  it.each([null, undefined, '', 'Ghost'])('returns null for %p', (label) => {
    expect(resolveIntelligenceModel(intelligence, label)).toBeNull();
  });

  it('returns null without saved levels', () => {
    expect(resolveIntelligenceModel(null, 'Deep')).toBeNull();
    expect(resolveIntelligenceModel(undefined, 'Deep')).toBeNull();
  });
});

describe('responsesApiOverride', () => {
  const tools = ['search_products_by_name_mcp_hotshot-secret-mcp'];

  it.each([
    'gpt-5.6',
    'gpt-5.6-luna',
    'gpt-5.6-terra',
    'gpt-5.6-sol',
    'gpt-6-astra',
    'gpt-6.1-sol',
    'gpt-6-luna',
  ])('forces the Responses API for %s when the agent carries tools', (model) => {
    expect(responsesApiOverride({ model, tools })).toEqual({ useResponsesApi: true });
  });

  it('leaves a tool-less run on Chat Completions', () => {
    expect(responsesApiOverride({ model: 'gpt-5.6-luna', tools: [] })).toBeUndefined();
    expect(responsesApiOverride({ model: 'gpt-5.6-luna', tools: undefined })).toBeUndefined();
  });

  it('does not touch models outside the GPT-5.6 and GPT-6 families', () => {
    expect(responsesApiOverride({ model: 'gpt-5.4-mini', tools })).toBeUndefined();
    expect(responsesApiOverride({ model: 'gpt-4o', tools })).toBeUndefined();
  });

  it('handles a missing model', () => {
    expect(responsesApiOverride({ model: undefined, tools })).toBeUndefined();
    expect(responsesApiOverride({ model: null, tools })).toBeUndefined();
  });
});

describe('unsupported reasoning efforts', () => {
  it('normalises none to low when saving a gpt-6-astra level', () => {
    const parsed = parseIntelligence({
      heading: 'Intelligence',
      levels: [
        { label: 'Fast', model: 'gpt-6-astra', reasoning_effort: 'none' },
        { label: 'Luna', model: 'gpt-6-luna', reasoning_effort: 'none' },
      ],
    });
    expect(parsed?.levels.map((level) => level.reasoning_effort)).toEqual(['low', 'none']);
  });

  it('never sends none to a model that rejects it', () => {
    const stored = {
      heading: 'Intelligence',
      levels: [{ label: 'Fast', model: 'gpt-6.1-sol', reasoning_effort: 'none' as const }],
    };
    const resolved = resolveIntelligenceParameters(asAgent(stored), 'Fast');
    expect(resolved?.modelOptions.reasoning_effort).toBe('low');
  });
});
