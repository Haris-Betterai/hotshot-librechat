import {
  parseIntelligence,
  resolveIntelligenceParameters,
  responsesApiOverride,
} from './intelligence';

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
    const configured = { provider: 'openAI', intelligence: intelligence ?? undefined };
    expect(resolveIntelligenceParameters(configured, 'Level 10')).toEqual({
      model: 'gpt-5.6-sol',
      reasoning_effort: 'max',
      reasoning_summary: 'auto',
    });
    expect(resolveIntelligenceParameters(configured, 'Level 1')).toEqual({
      model: 'gpt-5.6-sol',
      reasoning_effort: 'none',
    });
    expect(resolveIntelligenceParameters(configured, 'unconfigured')).toBeUndefined();
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
    expect(resolveIntelligenceParameters(agent, label)).toEqual(expected);
  });

  it('requests a reasoning summary whenever a level reasons, not just for non-reasoning tiers', () => {
    const result = resolveIntelligenceParameters(agent, 'smarter:high');
    expect(result?.reasoning_summary).toBe('auto');
  });

  it('omits reasoning_summary for a tier with no reasoning_effort', () => {
    const result = resolveIntelligenceParameters(agent, 'fast');
    expect(result).not.toHaveProperty('reasoning_summary');
  });

  it.each([null, undefined, '', 'smarter:ultra', 'arbitrary-model'])('rejects %s', (label) => {
    expect(resolveIntelligenceParameters(agent, label)).toBeUndefined();
  });

  it('keeps custom labels and models unchanged', () => {
    const custom = {
      provider: 'openAI',
      intelligence: { levels: [{ label: 'Custom', model: 'custom' }] },
    };
    expect(resolveIntelligenceParameters(custom, 'Custom')).toEqual({ model: 'custom' });
    expect(resolveIntelligenceParameters(custom, 'smarter:high')).toBeUndefined();
  });
});

describe('responsesApiOverride', () => {
  const tools = ['search_products_by_name_mcp_hotshot-secret-mcp'];

  it.each(['gpt-5.6', 'gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol'])(
    'forces the Responses API for %s when the agent carries tools',
    (model) => {
      expect(responsesApiOverride({ model, tools })).toEqual({ useResponsesApi: true });
    },
  );

  it('leaves a tool-less run on Chat Completions', () => {
    expect(responsesApiOverride({ model: 'gpt-5.6-luna', tools: [] })).toBeUndefined();
    expect(responsesApiOverride({ model: 'gpt-5.6-luna', tools: undefined })).toBeUndefined();
  });

  it('does not touch models outside the GPT-5.6 family', () => {
    expect(responsesApiOverride({ model: 'gpt-5.4-mini', tools })).toBeUndefined();
    expect(responsesApiOverride({ model: 'gpt-4o', tools })).toBeUndefined();
  });

  it('handles a missing model', () => {
    expect(responsesApiOverride({ model: undefined, tools })).toBeUndefined();
    expect(responsesApiOverride({ model: null, tools })).toBeUndefined();
  });
});
