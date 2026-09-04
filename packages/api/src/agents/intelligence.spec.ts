import { resolveIntelligenceParameters, responsesApiOverride } from './intelligence';

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
