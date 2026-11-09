import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels, createFeedbackReportModel, runAsSystem } from '@librechat/data-schemas';
import {
  messageText,
  readableAnswer,
  listQuestions,
  FeedbackRateError,
  FeedbackInputError,
  listFeedbackReports,
  createFeedbackReport,
  FEEDBACK_HOURLY_LIMIT,
} from './service';

let mongo: MongoMemoryServer;
const scope = { tenantId: null };
let guestId: string;
let staffId: string;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await runAsSystem(async () => {
    const { User, Message } = createModels(mongoose);
    await Promise.all([
      User.deleteMany({}),
      Message.deleteMany({}),
      createFeedbackReportModel(mongoose).deleteMany({}),
    ]);
    const [guest, staff] = await User.create([
      { email: 'guest-1@anonymous.local', name: 'Guest', provider: 'anonymous' },
      { email: 'staff@example.com', name: 'Haris', provider: 'local' },
    ]);
    guestId = String(guest._id);
    staffId = String(staff._id);
  });
});

async function seedExchange(
  user: string,
  conversationId: string,
  question: string,
  answer: string,
  rating?: 'thumbsUp' | 'thumbsDown',
) {
  const { Message } = createModels(mongoose);
  const messageId = `${conversationId}-q`;
  await Message.create({
    messageId,
    conversationId,
    user,
    isCreatedByUser: true,
    text: question,
    endpoint: 'agents',
  });
  await Message.create({
    messageId: `${conversationId}-a`,
    parentMessageId: messageId,
    conversationId,
    user,
    isCreatedByUser: false,
    text: '',
    content: [{ type: 'text', text: answer }],
    feedback: rating ? { rating } : undefined,
    endpoint: 'agents',
  });
}

describe('listQuestions', () => {
  it('pairs each question with its reply, rating and who asked, newest first', async () => {
    await seedExchange(guestId, 'c1', 'How much FR3?', '18 oz for 12 quarts.', 'thumbsUp');
    await seedExchange(staffId, 'c2', 'Is it safe?', 'Rinse your eyes now.');

    const { items, nextCursor } = await listQuestions(scope);

    expect(nextCursor).toBeUndefined();
    expect(items.map((item) => item.question)).toEqual(['Is it safe?', 'How much FR3?']);
    expect(items[0]).toMatchObject({ answer: 'Rinse your eyes now.', userLabel: 'Haris' });
    expect(items[1]).toMatchObject({
      conversationId: 'c1',
      answer: '18 oz for 12 quarts.',
      rating: 'thumbsUp',
      userLabel: `Guest · ${guestId.slice(-6)}`,
    });
  });

  it('pages with a cursor without repeating questions', async () => {
    for (let i = 0; i < 3; i++) {
      await seedExchange(guestId, `c${i}`, `Question ${i}`, `Answer ${i}`);
    }
    const first = await listQuestions(scope, { limit: 2 });
    const second = await listQuestions(scope, { limit: 2, cursor: first.nextCursor });

    expect(first.items.map((item) => item.question)).toEqual(['Question 2', 'Question 1']);
    expect(second.items.map((item) => item.question)).toEqual(['Question 0']);
    expect(second.nextCursor).toBeUndefined();
  });

  it('leaves out temporary chats', async () => {
    const { Message } = createModels(mongoose);
    await Message.create({
      messageId: 't-q',
      conversationId: 't',
      user: guestId,
      isCreatedByUser: true,
      isTemporary: true,
      text: 'Temporary question',
      endpoint: 'agents',
    });
    expect((await listQuestions(scope)).items).toEqual([]);
  });
});

describe('feedback reports', () => {
  it('saves a report and lists it with the reporter', async () => {
    const saved = await createFeedbackReport(
      { userId: guestId, tenantId: null },
      {
        kind: 'wrong_answer',
        message: '  The FR3 dose looked wrong.  ',
        name: 'Tester',
        conversationId: 'c1',
        source: 'widget',
      },
    );
    expect(saved).toMatchObject({ message: 'The FR3 dose looked wrong.', source: 'widget' });

    const { items } = await listFeedbackReports(scope);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'wrong_answer',
      name: 'Tester',
      conversationId: 'c1',
      userLabel: `Guest · ${guestId.slice(-6)}`,
    });
  });

  it('rejects a report without a message or with an unknown type', async () => {
    const reporter = { userId: guestId, tenantId: null };
    await expect(
      createFeedbackReport(reporter, { kind: 'bug', message: '   ' }),
    ).rejects.toBeInstanceOf(FeedbackInputError);
    await expect(
      createFeedbackReport(reporter, {
        kind: 'praise' as unknown as 'bug',
        message: 'Nice',
      }),
    ).rejects.toBeInstanceOf(FeedbackInputError);
  });

  it('limits how many reports one person can send in an hour', async () => {
    const reporter = { userId: guestId, tenantId: null };
    await createFeedbackReportModel(mongoose).insertMany(
      Array.from({ length: FEEDBACK_HOURLY_LIMIT }, () => ({
        user: guestId,
        tenantId: null,
        kind: 'other',
        message: 'x',
        source: 'chat',
      })),
    );
    await expect(
      createFeedbackReport(reporter, { kind: 'other', message: 'One more' }),
    ).rejects.toBeInstanceOf(FeedbackRateError);
  });
});

it('reads text from content parts when the message text is empty', () => {
  expect(messageText({ text: '', content: [{ type: 'text', text: { value: 'Hello' } }] })).toBe(
    'Hello',
  );
});

it('replaces answer-card code with a short label', () => {
  const text =
    'Use 1 oz per 25 gallons.\n\n```hotshot-ui\n{"type":"dose_calculator","ratio":{}}\n```\n\nAnything else?';
  expect(readableAnswer(text)).toBe(
    'Use 1 oz per 25 gallons.\n\n[Card: dose calculator]\n\nAnything else?',
  );
  expect(readableAnswer('```hotshot-ui\nnot json\n```')).toBe('[Card]');
});
