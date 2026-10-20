import type { TModelSpec } from 'librechat-data-provider';
import { getSpecIconForAgent, pickDefaultAgentId } from '../defaults';

const spec = (overrides: Partial<TModelSpec> & { agent_id: string }): TModelSpec => {
  const { agent_id, ...rest } = overrides;
  return {
    name: 'spec',
    label: 'Spec',
    preset: { endpoint: 'agents', agent_id },
    ...rest,
  } as TModelSpec;
};

describe('pickDefaultAgentId', () => {
  const agents = [
    { id: 'old', updatedAt: new Date('2026-01-01') },
    { id: 'live', updatedAt: new Date('2026-03-01') },
    { id: 'newest', updatedAt: new Date('2026-09-01') },
  ];

  it('prefers the default model spec agent when the user can edit it', () => {
    const specs = [spec({ agent_id: 'live', default: true })];
    expect(pickDefaultAgentId(agents, specs)).toBe('live');
  });

  it('falls back to the most recently updated editable agent', () => {
    const specs = [spec({ agent_id: 'not-editable', default: true })];
    expect(pickDefaultAgentId(agents, specs)).toBe('newest');
    expect(pickDefaultAgentId(agents, undefined)).toBe('newest');
  });

  it('returns undefined when nothing is editable', () => {
    expect(pickDefaultAgentId([], [spec({ agent_id: 'live', default: true })])).toBeUndefined();
  });
});

describe('getSpecIconForAgent', () => {
  it('finds the icon of the spec targeting the agent', () => {
    const specs = [spec({ agent_id: 'live', iconURL: '/assets/live.webp' })];
    expect(getSpecIconForAgent('live', specs)).toBe('/assets/live.webp');
    expect(getSpecIconForAgent('other', specs)).toBeUndefined();
    expect(getSpecIconForAgent(undefined, specs)).toBeUndefined();
  });
});
