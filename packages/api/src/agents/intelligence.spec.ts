import { resolveIntelligenceParameters } from './intelligence';

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
    { label: 'smarter', expected: { model: 'gpt-5.6', reasoning_effort: 'low' } },
    { label: 'smarter:medium', expected: { model: 'gpt-5.6', reasoning_effort: 'medium' } },
    { label: 'smarter:high', expected: { model: 'gpt-5.6', reasoning_effort: 'high' } },
  ])('resolves the server-approved setting for $label', ({ label, expected }) => {
    expect(resolveIntelligenceParameters(agent, label)).toEqual(expected);
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
