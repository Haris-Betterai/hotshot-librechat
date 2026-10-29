import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createMethods, createModels } from '@librechat/data-schemas';
import type { TGenUiResult } from 'librechat-data-provider';
import type { GenUiDeps } from './service';
import { getGenUi, getGenUiCatalog } from './service';
import { KIT_VERSION } from './author';

const USER = 'user-1';
const PRODUCT_URL = 'https://hotshotsecret.com/product/diesel-extreme/';
const COMPONENT_HTML =
  '<div id="list"></div><script>document.getElementById("list").textContent = hotshot.props.title;</script>';

type Routes = {
  decision: { choice: string; confidence: number; worth?: number; covers?: number };
  responses?: object[];
};

let mongoServer: MongoMemoryServer;
let deps: GenUiDeps;
let fetchSpy: jest.SpyInstance;
let calls: Array<{ path: string; body: Record<string, unknown> }>;

const json = (body: object) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** Stands in for the OpenAI HTTP API: Decisions answers, then queued Responses outputs. */
function mockOpenAI(routes: Routes) {
  const responses = [...(routes.responses ?? [])];
  fetchSpy.mockImplementation(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname.replace('/v1', '');
    calls.push({ path, body: JSON.parse(String(init.body)) });
    if (path === '/decisions') {
      return json({
        model: 'gpt-6-luna',
        answers: [
          {
            type: 'choice',
            name: 'ui',
            ...routes.decision,
            choice: routes.decision.choice,
            probabilities: [
              { value: 'none', probability: 1 - routes.decision.confidence },
              { value: routes.decision.choice, probability: routes.decision.confidence },
            ],
          },
          { type: 'predicate', name: 'worth', probability: routes.decision.worth ?? 0.9 },
          { type: 'predicate', name: 'covers', probability: routes.decision.covers ?? 0.2 },
        ],
      });
    }
    const next = responses.shift() ?? {};
    return json({
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(next) }] }],
    });
  });
}

async function saveTurn(messageId: string, answer: string, toolOutput = '') {
  const Message = mongoose.models.Message;
  await Message.create({
    messageId: `${messageId}-q`,
    conversationId: 'c1',
    user: USER,
    isCreatedByUser: true,
    text: 'My diesel truck lost power. What should I do?',
  });
  await Message.create({
    messageId,
    conversationId: 'c1',
    parentMessageId: `${messageId}-q`,
    user: USER,
    isCreatedByUser: false,
    text: answer,
    content: [
      ...(toolOutput
        ? [{ type: 'tool_call', tool_call: { name: 'search_products', output: toolOutput } }]
        : []),
      { type: 'text', text: answer },
    ],
  });
}

async function settle(messageId: string): Promise<TGenUiResult> {
  for (let i = 0; i < 100; i++) {
    const result = await getGenUi(deps, { user: USER, messageId });
    if (result.status !== 'pending') {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('still pending');
}

const LONG_ANSWER =
  'Start by checking the fuel filter and the air filter, then add a fuel treatment at your next fill-up. If power does not come back, have the injectors tested.';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  createModels(mongoose);
  deps = {
    ...createMethods(mongoose),
    getUserKeyValues: async () => ({ apiKey: 'sk-test' }),
  };
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  calls = [];
  fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('getGenUi', () => {
  it('returns nothing without run and does not claim the message', async () => {
    await saveTurn('m1', LONG_ANSWER);
    const result = await getGenUi(deps, { user: USER, messageId: 'm1' });
    expect(result).toEqual({ status: 'none' });
    expect(await deps.getGenUiRender('m1', USER)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('writes a new component when the decision is "new", saves it, and reuses it later', async () => {
    await saveTurn('m1', LONG_ANSWER);
    mockOpenAI({
      decision: { choice: 'new', confidence: 0.8, covers: 0.85 },
      responses: [
        {
          key: 'Power Loss Checklist',
          name: 'Power loss checklist',
          description: 'A tappable checklist of diagnostic steps for a symptom.',
          props_schema_json: JSON.stringify({
            type: 'object',
            properties: { title: { type: 'string' } },
          }),
          props_json: JSON.stringify({ title: 'Lost power' }),
          html: COMPONENT_HTML,
        },
      ],
    });

    expect((await getGenUi(deps, { user: USER, messageId: 'm1', run: true })).status).toBe(
      'pending',
    );
    const first = await settle('m1');

    expect(first).toMatchObject({
      status: 'ready',
      choice: 'new',
      created: true,
      component: {
        key: 'power_loss_checklist',
        name: 'Power loss checklist',
        html: COMPONENT_HTML,
      },
      props: { title: 'Lost power' },
      replacesText: true,
      decision: { covers: 0.85 },
    });
    expect(calls.map((call) => call.path)).toEqual(['/decisions', '/responses', '/decisions']);
    expect(calls[0].body.model).toBe('gpt-6-luna');

    const decisionChoices = () =>
      (
        (calls[0].body.questions as Array<{ choices?: Array<{ value: string }> }>)[0].choices ?? []
      ).map((choice) => choice.value);

    await saveTurn('m2', LONG_ANSWER);
    calls = [];
    mockOpenAI({
      decision: { choice: 'saved:power_loss_checklist', confidence: 0.7 },
      responses: [{ title: 'Still no power' }],
    });
    await getGenUi(deps, { user: USER, messageId: 'm2', run: true });
    const second = await settle('m2');

    expect(decisionChoices()).toContain('saved:power_loss_checklist');
    expect(second).toMatchObject({
      status: 'ready',
      choice: 'saved:power_loss_checklist',
      component: { key: 'power_loss_checklist' },
      props: { title: 'Still no power' },
    });
    expect(second.created).toBe(false);
    expect(second.replacesText).toBe(false);
    const fill = calls.find((call) => call.path === '/responses');
    expect(String(fill?.body.input)).toMatch(/json/i);
    const coversCall = calls.filter((call) => call.path === '/decisions')[1];
    expect(JSON.stringify(coversCall.body.input)).toContain('Still no power');
    const [saved] = await deps.listGenUiComponents();
    expect(saved.uses).toBe(2);
  });

  it('fills a built-in block and drops links the conversation never contained', async () => {
    await saveTurn(
      'm1',
      `${LONG_ANSWER} Diesel Extreme is the right pick: ${PRODUCT_URL}`,
      JSON.stringify({ name: 'Diesel Extreme', url: PRODUCT_URL, price: '$19.99' }),
    );
    mockOpenAI({
      decision: { choice: 'block:product_card', confidence: 0.9 },
      responses: [
        {
          name: 'Diesel Extreme',
          url: PRODUCT_URL,
          image: 'https://invented.example.com/photo.png',
          price: '$19.99',
        },
      ],
    });
    await getGenUi(deps, { user: USER, messageId: 'm1', run: true });
    const result = await settle('m1');

    expect(result.status).toBe('ready');
    expect(result.block).toMatchObject({
      type: 'product_card',
      name: 'Diesel Extreme',
      url: PRODUCT_URL,
    });
    expect(result.block).not.toHaveProperty('image');
    expect(result.decision).toMatchObject({ outcome: 'shown', buildModel: 'gpt-6-luna' });
  });

  it('skips the decision when the agent already put a visual block in the answer', async () => {
    const block = JSON.stringify({
      type: 'product_card',
      name: 'Diesel Extreme',
      url: PRODUCT_URL,
    });
    await saveTurn('m1', `${LONG_ANSWER}\n\`\`\`hotshot-ui\n${block}\n\`\`\``);
    mockOpenAI({ decision: { choice: 'new', confidence: 0.9 } });
    await getGenUi(deps, { user: USER, messageId: 'm1', run: true });

    expect(await settle('m1')).toMatchObject({ status: 'none' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shows nothing when the decision model is unsure or a new component is not worth it', async () => {
    await saveTurn('m1', LONG_ANSWER);
    mockOpenAI({ decision: { choice: 'new', confidence: 0.6, worth: 0.3 } });
    await getGenUi(deps, { user: USER, messageId: 'm1', run: true });

    expect(await settle('m1')).toMatchObject({
      status: 'none',
      decision: {
        model: 'gpt-6-luna',
        choice: 'new',
        confidence: 0.6,
        worth: 0.3,
        outcome: 'not worth a new component (worth < 0.5, confidence < 0.75)',
        options: [
          { value: 'new', probability: 0.6 },
          { value: 'none', probability: expect.closeTo(0.4) },
        ],
      },
    });
    expect(calls.map((call) => call.path)).toEqual(['/decisions']);
  });

  it('rejects generated code that reaches the network', async () => {
    await saveTurn('m1', LONG_ANSWER);
    mockOpenAI({
      decision: { choice: 'new', confidence: 0.8 },
      responses: [
        {
          key: 'leaky',
          name: 'Leaky',
          description: 'Bad.',
          props_schema_json: '{}',
          props_json: '{}',
          html: '<script>fetch("https://evil.example.com")</script>',
        },
      ],
    });
    await getGenUi(deps, { user: USER, messageId: 'm1', run: true });

    expect(await settle('m1')).toMatchObject({ status: 'error' });
    expect(await deps.listGenUiComponents()).toHaveLength(0);
  });

  it('decides a message only once when two requests race', async () => {
    await saveTurn('m1', LONG_ANSWER);
    mockOpenAI({ decision: { choice: 'none', confidence: 0.9 } });
    const results = await Promise.all([
      getGenUi(deps, { user: USER, messageId: 'm1', run: true }),
      getGenUi(deps, { user: USER, messageId: 'm1', run: true }),
    ]);
    await settle('m1');

    expect(results.map((result) => result.status)).toEqual(['pending', 'pending']);
    expect(calls.filter((call) => call.path === '/decisions')).toHaveLength(1);
  });

  it('lists every card the decision model can pick, saved ones included', async () => {
    await deps.saveGenUiComponent({
      key: 'winter_plan',
      name: 'Winter plan',
      description: 'Seasonal maintenance steps.',
      propsSchema: {},
      html: COMPONENT_HTML,
      authorModel: 'gpt-6.1-sol',
      kitVersion: KIT_VERSION,
    });
    const catalog = await getGenUiCatalog(deps);
    const values = catalog.entries.map((entry) => entry.value);

    expect(catalog).toMatchObject({ decisionModel: 'gpt-6-luna', minConfidence: 0.45 });
    expect(values[0]).toBe('none');
    expect(values).toContain('block:comparison');
    expect(values).toContain('saved:winter_plan');
    expect(values[values.length - 1]).toBe('new');
  });

  it('saves a new component under a fresh key when an older-kit component holds its key', async () => {
    await deps.saveGenUiComponent({
      key: 'power_loss_checklist',
      name: 'Old checklist',
      description: 'Written for an older UI kit.',
      propsSchema: {},
      html: '<p>old</p>',
      authorModel: 'gpt-6.1-sol',
      kitVersion: 1,
    });
    await saveTurn('m1', LONG_ANSWER);
    mockOpenAI({
      decision: { choice: 'new', confidence: 0.9 },
      responses: [
        {
          key: 'power_loss_checklist',
          name: 'Power loss checklist',
          description: 'A checklist of diagnostic steps.',
          props_schema_json: '{}',
          props_json: JSON.stringify({ title: 'Lost power' }),
          html: COMPONENT_HTML,
        },
      ],
    });
    await getGenUi(deps, { user: USER, messageId: 'm1', run: true });

    expect(await settle('m1')).toMatchObject({
      status: 'ready',
      component: { key: 'power_loss_checklist_2', html: COMPONENT_HTML },
    });
  });
});
