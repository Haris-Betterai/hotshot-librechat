import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels, runAsSystem } from '@librechat/data-schemas';
import type { PinProductInput } from 'librechat-data-provider';
import type { Response as ExpressResponse } from 'express';
import { getCatalogHandler, pinProductHandler } from './handlers';
import { resetCatalogCache } from './catalog';

const DIESEL_EXTREME = 'https://www.hotshotsecret.com/products/diesel-extreme';

let mongo: MongoMemoryServer;

const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown };
  const api = {
    status: (code: number) => {
      res.statusCode = code;
      return api;
    },
    json: (body: unknown) => {
      res.body = body;
      return api;
    },
  };
  return { res, api: api as unknown as ExpressResponse };
};

const pin = async (userId: string, body: Partial<PinProductInput>) => {
  const { res, api } = makeRes();
  await runAsSystem(() => pinProductHandler({ user: { id: userId }, body }, api));
  return res;
};

const storedPin = async (conversationId: string) =>
  runAsSystem(async () => {
    const { Conversation } = createModels(mongoose);
    const convo = await Conversation.findOne({ conversationId }).lean();
    return convo?.productUrl;
  });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  resetCatalogCache();
  const body = JSON.stringify({
    updated_at: 1_790_000_000,
    products: [{ title: 'DIESEL EXTREME', url: DIESEL_EXTREME, category: 'Diesel' }],
  });
  jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(body));
  await runAsSystem(async () => {
    const { Conversation } = createModels(mongoose);
    await Conversation.deleteMany({});
    await Conversation.create([
      { conversationId: 'mine', user: 'staff-1', endpoint: 'agents' },
      { conversationId: 'theirs', user: 'staff-2', endpoint: 'agents' },
    ]);
  });
});
afterEach(() => jest.restoreAllMocks());

describe('pinProductHandler', () => {
  it('pins a catalog product to the user own chat and unpins it with null', async () => {
    const pinned = await pin('staff-1', { conversationId: 'mine', productUrl: DIESEL_EXTREME });
    expect(pinned.statusCode).toBe(200);
    expect(await storedPin('mine')).toBe(DIESEL_EXTREME);

    const unpinned = await pin('staff-1', { conversationId: 'mine', productUrl: null });
    expect(unpinned.body).toEqual({ conversationId: 'mine', productUrl: null });
    expect(await storedPin('mine')).toBeUndefined();
  });

  it('keeps the chat where it is in the sidebar', async () => {
    const before = await runAsSystem(async () => {
      const { Conversation } = createModels(mongoose);
      return (await Conversation.findOne({ conversationId: 'mine' }).lean())?.updatedAt;
    });
    await pin('staff-1', { conversationId: 'mine', productUrl: DIESEL_EXTREME });
    const after = await runAsSystem(async () => {
      const { Conversation } = createModels(mongoose);
      return (await Conversation.findOne({ conversationId: 'mine' }).lean())?.updatedAt;
    });
    expect(after?.getTime()).toBe(before?.getTime());
  });

  it("does not touch another user's chat", async () => {
    const res = await pin('staff-1', { conversationId: 'theirs', productUrl: DIESEL_EXTREME });
    expect(res.statusCode).toBe(404);
    expect(await storedPin('theirs')).toBeUndefined();
  });

  it('rejects links that are not catalog products', async () => {
    const bad = await pin('staff-1', { conversationId: 'mine', productUrl: 'javascript:alert(1)' });
    const unknown = await pin('staff-1', {
      conversationId: 'mine',
      productUrl: 'https://www.hotshotsecret.com/products/unknown',
    });
    const missingId = await pin('staff-1', { productUrl: DIESEL_EXTREME });

    expect([bad.statusCode, unknown.statusCode, missingId.statusCode]).toEqual([400, 400, 400]);
    expect(await storedPin('mine')).toBeUndefined();
  });
});

describe('getCatalogHandler', () => {
  it('returns the cleaned catalog', async () => {
    const { res, api } = makeRes();
    await getCatalogHandler({ user: { id: 'staff-1' } }, api);
    expect(res.body).toMatchObject({ products: [{ title: 'DIESEL EXTREME', url: DIESEL_EXTREME }] });
  });

  it('answers 503 when the tool server is down', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    const { res, api } = makeRes();
    await getCatalogHandler({ user: { id: 'staff-1' } }, api);
    expect(res.statusCode).toBe(503);
  });
});
