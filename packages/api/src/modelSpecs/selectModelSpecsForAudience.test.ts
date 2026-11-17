import { EModelEndpoint } from 'librechat-data-provider';
import type { TModelSpec, TSpecsConfig } from 'librechat-data-provider';
import { selectModelSpecsForAudience } from './index';

const makeSpec = (name: string, extra: Partial<TModelSpec> = {}): TModelSpec => ({
  name,
  label: name,
  preset: { endpoint: EModelEndpoint.agents, agent_id: `agent_${name}` },
  ...extra,
});

const makeConfig = (): TSpecsConfig => ({
  list: [
    makeSpec('guest', { default: true }),
    makeSpec('staff', { audience: 'staff' }),
    makeSpec('other'),
  ],
});

describe('selectModelSpecsForAudience', () => {
  it('hides staff specs from non-employees and keeps their default', () => {
    const result = selectModelSpecsForAudience(makeConfig(), false);
    expect(result.list.map((spec) => spec.name)).toEqual(['guest', 'other']);
    expect(result.list[0].default).toBe(true);
  });

  it('lists staff specs for employees and makes the first one the default', () => {
    const result = selectModelSpecsForAudience(makeConfig(), true);
    expect(result.list.map((spec) => [spec.name, spec.default])).toEqual([
      ['guest', false],
      ['staff', true],
      ['other', undefined],
    ]);
  });

  it('leaves the list alone for employees when there is no staff spec', () => {
    const config: TSpecsConfig = { list: [makeSpec('guest', { default: true })] };
    expect(selectModelSpecsForAudience(config, true)).toBe(config);
  });

  it('does not mutate the input', () => {
    const config = makeConfig();
    selectModelSpecsForAudience(config, true);
    expect(config.list[0].default).toBe(true);
    expect(config.list[1].default).toBeUndefined();
  });

  it('passes through a config without a list', () => {
    expect(selectModelSpecsForAudience(undefined, true)).toBeUndefined();
    expect(selectModelSpecsForAudience(null, false)).toBeNull();
  });
});
