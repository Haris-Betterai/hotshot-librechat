import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ErrorTypes, SystemRoles } from 'librechat-data-provider';
import { createKeyMethods } from './key';
import groupSchema from '~/schema/group';
import userSchema from '~/schema/user';
import keySchema from '~/schema/key';

jest.mock('~/crypto', () => ({
  encrypt: jest.fn(async (value: string) => `enc:${value}`),
  decrypt: jest.fn(async (value: string) => value.replace(/^enc:/, '')),
}));

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

let mongoServer: MongoMemoryServer;
let methods: ReturnType<typeof createKeyMethods>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  for (const [name, schema] of [
    ['User', userSchema],
    ['Key', keySchema],
    ['Group', groupSchema],
  ] as const) {
    if (!mongoose.models[name]) {
      mongoose.model(name, schema);
    }
  }
  methods = createKeyMethods(mongoose);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('createKeyMethods guest admin fallback', () => {
  it('uses an admin-stored key when the requester is an anonymous guest', async () => {
    const admin = await mongoose.models.User.create({
      email: 'admin@test.com',
      name: 'Admin',
      provider: 'local',
      role: SystemRoles.ADMIN,
    });
    const guest = await mongoose.models.User.create({
      email: 'guest@anonymous.local',
      name: 'Guest',
      provider: 'anonymous',
      role: SystemRoles.USER,
    });

    await methods.updateUserKey({
      userId: admin._id.toString(),
      name: 'hotshot',
      value: JSON.stringify({ apiKey: 'sk-admin-key' }),
    });

    const values = await methods.getUserKeyValues({
      userId: guest._id.toString(),
      name: 'hotshot',
    });

    expect(values.apiKey).toBe('sk-admin-key');
  });

  it('lends the admin key to signed-in customers without a key of their own', async () => {
    const admin = await mongoose.models.User.create({
      email: 'admin@test.com',
      name: 'Admin',
      provider: 'local',
      role: SystemRoles.ADMIN,
    });
    const member = await mongoose.models.User.create({
      email: 'member@test.com',
      name: 'Member',
      provider: 'local',
      role: SystemRoles.USER,
    });

    await methods.updateUserKey({
      userId: admin._id.toString(),
      name: 'hotshot',
      value: JSON.stringify({ apiKey: 'sk-admin-key' }),
    });

    const values = await methods.getUserKeyValues({
      userId: member._id.toString(),
      name: 'hotshot',
    });

    expect(values.apiKey).toBe('sk-admin-key');
  });

  it("prefers the user's own key over the admin key", async () => {
    const admin = await mongoose.models.User.create({
      email: 'admin@test.com',
      name: 'Admin',
      provider: 'local',
      role: SystemRoles.ADMIN,
    });
    const member = await mongoose.models.User.create({
      email: 'member@test.com',
      name: 'Member',
      provider: 'local',
      role: SystemRoles.USER,
    });

    await methods.updateUserKey({
      userId: admin._id.toString(),
      name: 'hotshot',
      value: JSON.stringify({ apiKey: 'sk-admin-key' }),
    });
    await methods.updateUserKey({
      userId: member._id.toString(),
      name: 'hotshot',
      value: JSON.stringify({ apiKey: 'sk-own-key' }),
    });

    const values = await methods.getUserKeyValues({
      userId: member._id.toString(),
      name: 'hotshot',
    });

    expect(values.apiKey).toBe('sk-own-key');
  });

  it('throws NO_USER_KEY when no admin has stored a key', async () => {
    const member = await mongoose.models.User.create({
      email: 'member@test.com',
      name: 'Member',
      provider: 'local',
      role: SystemRoles.USER,
    });

    await expect(
      methods.getUserKey({
        userId: member._id.toString(),
        name: 'hotshot',
      }),
    ).rejects.toThrow(JSON.stringify({ type: ErrorTypes.NO_USER_KEY }));
  });
});
