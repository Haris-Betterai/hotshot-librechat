import mongoose from 'mongoose';
import { createModels, createFeedbackReportModel } from '@librechat/data-schemas';
import {
  UI_BLOCK_LANGUAGE,
  FEEDBACK_REPORT_LIMITS,
  isFeedbackReportKind,
} from 'librechat-data-provider';
import type {
  FeedbackReport,
  FeedbackReportInput,
  LoggedQuestion,
  ReviewPage,
} from 'librechat-data-provider';
import type { FeedbackReportDoc } from '@librechat/data-schemas';

export type ReviewScope = { tenantId: string | null };
export type ReporterScope = ReviewScope & { userId: string };

type MessagePart = { type?: string; text?: string | { value?: string } };
type StoredMessage = {
  _id: mongoose.Types.ObjectId;
  messageId: string;
  conversationId: string;
  parentMessageId?: string;
  user: string;
  text?: string;
  content?: MessagePart[];
  feedback?: { rating?: 'thumbsUp' | 'thumbsDown'; text?: string };
  createdAt?: Date;
};
type StoredUser = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  provider?: string;
};

export const REVIEW_PAGE_MAX = 200;
export const FEEDBACK_HOURLY_LIMIT = 30;
const ANSWER_MAX = 2000;
const HOUR = 60 * 60 * 1000;

export class FeedbackInputError extends Error {}
export class FeedbackRateError extends Error {}

const clip = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
};

const pageSize = (limit?: number): number =>
  Math.min(REVIEW_PAGE_MAX, Math.max(1, Math.floor(limit ?? 50)));

const cursorFilter = (cursor?: string) =>
  cursor && mongoose.isValidObjectId(cursor)
    ? { _id: { $lt: new mongoose.Types.ObjectId(cursor) } }
    : {};

/** Plain text of a stored message: its `text`, or the text parts of its content. */
export function messageText(message: Pick<StoredMessage, 'text' | 'content'>): string {
  if (message.text?.trim()) {
    return message.text.trim();
  }
  return (message.content ?? [])
    .filter((part) => part?.type === 'text')
    .map((part) => (typeof part.text === 'string' ? part.text : (part.text?.value ?? '')))
    .join('\n')
    .trim();
}

const CARD_BLOCK = new RegExp(`\`\`\`${UI_BLOCK_LANGUAGE}\\s*([\\s\\S]*?)\`\`\``, 'g');

const cardLabel = (json: string): string => {
  try {
    const type = (JSON.parse(json) as { type?: unknown }).type;
    return typeof type === 'string' ? `[Card: ${type.replace(/_/g, ' ')}]` : '[Card]';
  } catch {
    return '[Card]';
  }
};

/** Answer text with each answer-card block replaced by a short "[Card: …]" label. */
export function readableAnswer(text: string): string {
  return text.replace(CARD_BLOCK, (_match, json: string) => cardLabel(json)).trim();
}

/** "Guest · 3f9a1c" for anonymous testers, otherwise the staff member's name or email. */
export function userLabel(userId: string, user?: StoredUser): string {
  if (!user || user.provider === 'anonymous') {
    return `Guest · ${userId.slice(-6)}`;
  }
  return user.name || user.email || userId;
}

function page<T>(rows: T[], size: number, idOf: (row: T) => string): ReviewPage<T> {
  const items = rows.slice(0, size);
  return {
    items,
    nextCursor: rows.length > size ? idOf(items[items.length - 1]) : undefined,
  };
}

async function usersById(ids: string[]): Promise<Map<string, StoredUser>> {
  const valid = [...new Set(ids)].filter((id) => mongoose.isValidObjectId(id));
  if (!valid.length) {
    return new Map();
  }
  const { User } = createModels(mongoose);
  const users = (await User.find(
    { _id: { $in: valid } },
    { name: 1, email: 1, provider: 1 },
  ).lean()) as unknown as StoredUser[];
  return new Map(users.map((user) => [String(user._id), user]));
}

export async function createFeedbackReport(
  scope: ReporterScope,
  input: Partial<FeedbackReportInput>,
): Promise<FeedbackReport> {
  const message = clip(input.message, FEEDBACK_REPORT_LIMITS.message);
  if (!message || !isFeedbackReportKind(input.kind)) {
    throw new FeedbackInputError('A feedback type and message are required');
  }
  const Report = createFeedbackReportModel(mongoose);
  const recent = await Report.countDocuments({
    user: scope.userId,
    createdAt: { $gte: new Date(Date.now() - HOUR) },
  });
  if (recent >= FEEDBACK_HOURLY_LIMIT) {
    throw new FeedbackRateError('Too much feedback in the last hour');
  }
  const created = await Report.create({
    user: scope.userId,
    tenantId: scope.tenantId,
    kind: input.kind,
    message,
    name: clip(input.name, FEEDBACK_REPORT_LIMITS.name),
    email: clip(input.email, FEEDBACK_REPORT_LIMITS.email),
    conversationId: clip(input.conversationId, 100),
    page: clip(input.page, FEEDBACK_REPORT_LIMITS.page),
    source: input.source === 'widget' ? 'widget' : 'chat',
  });
  const users = await usersById([scope.userId]);
  return toReport(created.toObject() as FeedbackReportDoc & { _id: unknown }, users);
}

function toReport(
  doc: FeedbackReportDoc & { _id: unknown },
  users: Map<string, StoredUser>,
): FeedbackReport {
  return {
    id: String(doc._id),
    userId: doc.user,
    userLabel: userLabel(doc.user, users.get(doc.user)),
    kind: doc.kind,
    message: doc.message,
    name: doc.name,
    email: doc.email,
    conversationId: doc.conversationId,
    page: doc.page,
    source: doc.source,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listFeedbackReports(
  scope: ReviewScope,
  options: { cursor?: string; limit?: number } = {},
): Promise<ReviewPage<FeedbackReport>> {
  const size = pageSize(options.limit);
  const docs = (await createFeedbackReportModel(mongoose)
    .find({ tenantId: scope.tenantId, ...cursorFilter(options.cursor) })
    .sort({ _id: -1 })
    .limit(size + 1)
    .lean()) as unknown as Array<FeedbackReportDoc & { _id: unknown }>;
  const users = await usersById(docs.map((doc) => doc.user));
  return page(
    docs.map((doc) => toReport(doc, users)),
    size,
    (report) => report.id,
  );
}

/** Every question customers and testers asked, newest first, with the reply it got. */
export async function listQuestions(
  scope: ReviewScope,
  options: { cursor?: string; limit?: number } = {},
): Promise<ReviewPage<LoggedQuestion>> {
  const size = pageSize(options.limit);
  const { Message } = createModels(mongoose);
  const questions = (await Message.find(
    {
      tenantId: scope.tenantId,
      isCreatedByUser: true,
      isTemporary: { $ne: true },
      ...cursorFilter(options.cursor),
    },
    { messageId: 1, conversationId: 1, user: 1, text: 1, content: 1, createdAt: 1 },
  )
    .sort({ _id: -1 })
    .limit(size + 1)
    .lean()) as unknown as StoredMessage[];

  const [replies, users] = await Promise.all([
    questions.length
      ? (Message.find(
          {
            tenantId: scope.tenantId,
            isCreatedByUser: false,
            parentMessageId: { $in: questions.map((question) => question.messageId) },
          },
          { parentMessageId: 1, conversationId: 1, text: 1, content: 1, feedback: 1, createdAt: 1 },
        )
          .sort({ createdAt: 1 })
          .lean() as unknown as Promise<StoredMessage[]>)
      : Promise.resolve([] as StoredMessage[]),
    usersById(questions.map((question) => question.user)),
  ]);

  const latestReply = new Map<string, StoredMessage>();
  for (const reply of replies) {
    latestReply.set(`${reply.conversationId}:${reply.parentMessageId}`, reply);
  }

  const items = questions.map((question): LoggedQuestion & { _id: string } => {
    const reply = latestReply.get(`${question.conversationId}:${question.messageId}`);
    return {
      _id: String(question._id),
      messageId: question.messageId,
      conversationId: question.conversationId,
      question: messageText(question),
      answer: reply ? readableAnswer(messageText(reply)).slice(0, ANSWER_MAX) : '',
      rating: reply?.feedback?.rating,
      ratingText: reply?.feedback?.text,
      userLabel: userLabel(question.user, users.get(question.user)),
      createdAt: (question.createdAt ?? new Date()).toISOString(),
    };
  });

  const result = page(items, size, (item) => item._id);
  return {
    nextCursor: result.nextCursor,
    items: result.items.map(({ _id: _omit, ...item }) => item),
  };
}
