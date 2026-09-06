import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels, createLearningModel, runAsSystem } from '@librechat/data-schemas';
import {
  configureLearning,
  getLearningReport,
  rollbackLearning,
  runLearningReview,
} from './service';

let mongo: MongoMemoryServer;
const scope = { agentId: 'agent_learning_test', tenantId: 'tenant-a' };
const ownerId = '000000000000000000000001';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await createLearningModel(mongoose).init();
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await runAsSystem(async () => {
    const { Agent, Conversation, Message } = createModels(mongoose);
    await Promise.all([
      Agent.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      createLearningModel(mongoose).deleteMany({}),
    ]);
    await Agent.create({
      id: scope.agentId,
      author: ownerId,
      provider: 'openAI',
      model: 'test',
      name: 'Test Agent',
      instructions: 'Keep verified product rules.',
      tenantId: scope.tenantId,
    });
  });
});

async function seed(tenantId = scope.tenantId, isTemporary = false): Promise<void> {
  const { Conversation, Message } = createModels(mongoose);
  for (let i = 0; i < 3; i++) {
    const conversationId = `${tenantId}-${isTemporary}-${i}`;
    await Conversation.create({
      endpoint: 'agents',
      conversationId,
      user: ownerId,
      agent_id: scope.agentId,
      tenantId,
      isTemporary,
    });
    await Conversation.updateOne(
      { conversationId, tenantId },
      { $set: { updatedAt: new Date(Date.now() - 20 * 60 * 1000) } },
      { timestamps: false },
    );
    await Message.create({
      conversationId,
      user: ownerId,
      messageId: `m-${conversationId}`,
      isCreatedByUser: false,
      text: 'Year? Model? Engine?',
      tenantId,
      isTemporary,
    });
  }
}

it('applies once, keeps base instructions, and rolls back with automation paused', async () => {
  await runAsSystem(async () => {
    await seed();
    await configureLearning(scope, ownerId, true);
    const first = await runLearningReview(scope, ownerId);
    expect(first.reviews).toHaveLength(3);
    expect(first.rules).toEqual(['questions']);
    expect(first.changes).toHaveLength(1);
    const second = await runLearningReview(scope, ownerId);
    expect(second.changes).toHaveLength(1);
    const agent = await createModels(mongoose).Agent.findOne({ id: scope.agentId }).lean();
    expect(agent?.instructions).toBe('Keep verified product rules.');
    const undone = await rollbackLearning(scope);
    expect(undone.enabled).toBe(false);
    expect(undone.rules).toEqual([]);
  });
});

it('excludes other tenants and temporary conversations', async () => {
  await runAsSystem(async () => {
    await seed('tenant-b');
    await seed(scope.tenantId, true);
    await configureLearning(scope, ownerId, true);
    const report = await runLearningReview(scope, ownerId);
    expect(report.rules).toEqual([]);
    expect(report.reviews).toEqual([]);
    expect((await getLearningReport({ ...scope, tenantId: 'tenant-b' })).enabled).toBe(false);
  });
});

it('reviews without changing the prompt when disabled', async () => {
  await runAsSystem(async () => {
    await seed();
    const report = await runLearningReview(scope, ownerId);
    expect(report.reviews).toHaveLength(3);
    expect(report.rules).toEqual([]);
    expect(report.changes).toEqual([]);
  });
});
