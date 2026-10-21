import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createSessionMethods, REFRESH_TOKEN_ROTATION_GRACE_MS } from './session';
import { createModels } from '../models';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let mongoServer: MongoMemoryServer;
let methods: ReturnType<typeof createSessionMethods>;
const userId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  createModels(mongoose);
  methods = createSessionMethods(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await mongoose.models.Session.deleteMany({});
  jest.useRealTimers();
});

async function rotate(refreshToken: string): Promise<string> {
  const session = await methods.findSession({ userId, refreshToken }, { lean: false });
  if (!session) {
    throw new Error('session not found');
  }
  return methods.generateRefreshToken(session);
}

describe('refresh token rotation grace', () => {
  it('finds the session with the current token', async () => {
    const { refreshToken } = await methods.createSession(userId);
    expect(await methods.findSession({ userId, refreshToken })).not.toBeNull();
  });

  it('still accepts the previous token right after a rotation', async () => {
    const { refreshToken: first } = await methods.createSession(userId);
    const second = await rotate(first);

    expect(second).not.toBe(first);
    expect(await methods.findSession({ userId, refreshToken: first })).not.toBeNull();
    expect(await methods.findSession({ userId, refreshToken: second })).not.toBeNull();
  });

  it('rejects the previous token once the grace window has passed', async () => {
    const { refreshToken: first } = await methods.createSession(userId);
    await rotate(first);
    await mongoose.models.Session.updateMany(
      {},
      { rotatedAt: new Date(Date.now() - REFRESH_TOKEN_ROTATION_GRACE_MS - 1000) },
    );

    expect(await methods.findSession({ userId, refreshToken: first })).toBeNull();
  });

  it('only keeps one previous token, so a token two rotations old is rejected', async () => {
    const { refreshToken: first } = await methods.createSession(userId);
    const second = await rotate(first);
    await rotate(second);

    expect(await methods.findSession({ userId, refreshToken: first })).toBeNull();
    expect(await methods.findSession({ userId, refreshToken: second })).not.toBeNull();
  });

  it('never matches another user’s session', async () => {
    const { refreshToken } = await methods.createSession(userId);
    await rotate(refreshToken);
    const otherUser = new mongoose.Types.ObjectId().toString();

    expect(await methods.findSession({ userId: otherUser, refreshToken })).toBeNull();
  });
});
