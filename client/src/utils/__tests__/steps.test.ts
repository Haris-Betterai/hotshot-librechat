import { describeStep, describeSteps, resolveStepId, isFriendlyTool } from '../steps';
import type { ToolStep } from '../steps';

const identity = (key: string): string => key;
const SUFFIX = '_mcp_hotshot-secret-mcp';
const done = (name: string, args?: ToolStep['args']): ToolStep => ({ name, args, done: true });
const active = (name: string, args?: ToolStep['args']): ToolStep => ({ name, args, done: false });

describe('describeStep', () => {
  it.each([
    [
      done(`search_products_by_name${SUFFIX}`, { partial_name: 'Diesel Extreme' }),
      'Looked up Diesel Extreme',
    ],
    [
      active(`search_products_by_name${SUFFIX}`, '{"partial_name":"Diesel Extreme"}'),
      'Looking up Diesel Extreme…',
    ],
    [done(`search_products_by_name${SUFFIX}`, {}), 'Looked up products'],
    [
      done(`get_all_symptoms${SUFFIX}`, {
        symptom: 'no start',
        vehicle: '2021 F-250',
        engine: '6.7 Powerstroke',
      }),
      'Checked symptoms for 6.7 Powerstroke',
    ],
    [done(`get_symptom_details${SUFFIX}`), 'Read the diagnosis guide'],
    [done(`search_faqs${SUFFIX}`), 'Checked FAQs'],
    [active(`search_faqs${SUFFIX}`), 'Checking FAQs…'],
    [
      done(`get_all_fluid_capacities${SUFFIX}`, { vehicle: '2021 F-250', engine: '6.7' }),
      'Checked fluid capacity for 2021 F-250',
    ],
    [done(`get_product_by_url${SUFFIX}`, { url: 'https://x.com/p' }), 'Read the product page'],
    [
      done(`list_products_by_category${SUFFIX}`, { category: 'Fuel additives' }),
      'Browsed Fuel additives',
    ],
    [done(`recommend_youtube_video${SUFFIX}`), 'Found related videos'],
    [done('web_search', { url: 'https://www.hotshotsecret.com/x' }), 'Searched hotshotsecret.com'],
    [done('web_search'), 'Searched the web'],
    [done(`get_order_status${SUFFIX}`), 'Get order status'],
    [active('some_new_tool'), 'Some new tool…'],
  ])('labels %#', (step, expected) => {
    expect(describeStep(step, identity)).toBe(expected);
  });

  it('prefers a translation when the key exists', () => {
    const localize = (key: string): string =>
      key === 'com_ui_step_faqs_done' ? 'Revisé FAQ' : key;
    expect(describeStep(done(`search_faqs${SUFFIX}`), localize)).toBe('Revisé FAQ');
  });

  it('never leaks the internal suffix or snake_case', () => {
    const label = describeStep(done(`unknown_thing${SUFFIX}`), identity);
    expect(label).not.toMatch(/_mcp_|hotshot|_/);
  });
});

describe('describeSteps', () => {
  it('merges consecutive runs of the same tool and joins their details', () => {
    const labels = describeSteps(
      [
        done(`search_products_by_name${SUFFIX}`, { partial_name: 'Diesel Extreme' }),
        done(`search_products_by_name${SUFFIX}`, { partial_name: 'Everyday Diesel Treatment' }),
      ],
      identity,
    );
    expect(labels.map((l) => l.label)).toEqual([
      'Looked up Diesel Extreme and Everyday Diesel Treatment',
    ]);
  });

  it('dedupes identical labels and repeated details', () => {
    const labels = describeSteps(
      [
        done(`search_faqs${SUFFIX}`),
        done(`search_faqs${SUFFIX}`),
        done(`search_products_by_name${SUFFIX}`, { partial_name: 'Diesel Extreme' }),
        done(`search_products_by_name${SUFFIX}`, { partial_name: 'diesel extreme' }),
      ],
      identity,
    );
    expect(labels.map((l) => l.label)).toEqual(['Checked FAQs', 'Looked up Diesel Extreme']);
  });

  it('keeps different tools apart and reports in-progress runs as active', () => {
    const labels = describeSteps(
      [done(`search_faqs${SUFFIX}`), active(`get_all_symptoms${SUFFIX}`, { engine: '6.7' })],
      identity,
    );
    expect(labels.map((l) => [l.label, l.done])).toEqual([
      ['Checked FAQs', true],
      ['Checking symptoms for 6.7…', false],
    ]);
  });
});

describe('tool id helpers', () => {
  it('strips the server suffix when resolving ids', () => {
    expect(resolveStepId(`search_faqs${SUFFIX}`)).toBe('faqs');
    expect(resolveStepId('web_search_preview')).toBe('web');
  });

  it('flags MCP tools and web search as friendly', () => {
    expect(isFriendlyTool(`search_faqs${SUFFIX}`)).toBe(true);
    expect(isFriendlyTool('web_search')).toBe(true);
    expect(isFriendlyTool('execute_code')).toBe(false);
  });
});
