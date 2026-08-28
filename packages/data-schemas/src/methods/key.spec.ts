import mongoose from 'mongoose';
import { ErrorTypes, SystemRoles } from 'librechat-data-provider';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createKeyMethods } from './key';
import keySchema from '~/schema/key';
import userSchema from '~/schema/user';

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
  mongoose.models.User || mongoose.model('User', userSchema);
  mongoose.models.Key || mongoose.model('Key', keySchema);
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

  it('does not leak admin keys to signed-in non-guest users', async () => {
    const admin = await mongoose.models.User.create({
      email: 'admin@test.com',
      name: 'Admin',
      provider: 'local',
      role: SystemRoles.ADMIN,
    });
    const staff = await mongoose.models.User.create({
      email: 'staff@test.com',
      name: 'Staff',
      provider: 'local',
      role: SystemRoles.USER,
    });

    await methods.updateUserKey({
      userId: admin._id.toString(),
      name: 'hotshot',
      value: JSON.stringify({ apiKey: 'sk-admin-key' }),
    });

    await expect(
      methods.getUserKey({
        userId: staff._id.toString(),
        name: 'hotshot',
      }),
    ).rejects.toThrow(JSON.stringify({ type: ErrorTypes.NO_USER_KEY }));
  });
});
