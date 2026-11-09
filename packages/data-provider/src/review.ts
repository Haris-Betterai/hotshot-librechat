export const FEEDBACK_REPORT_KINDS = ['wrong_answer', 'bug', 'suggestion', 'other'] as const;

export type FeedbackReportKind = (typeof FEEDBACK_REPORT_KINDS)[number];

export const FEEDBACK_REPORT_LIMITS = { message: 4000, name: 120, email: 200, page: 500 } as const;

export type FeedbackReportInput = {
  kind: FeedbackReportKind;
  message: string;
  name?: string;
  email?: string;
  conversationId?: string;
  page?: string;
  source: 'chat' | 'widget';
};

export type FeedbackReport = FeedbackReportInput & {
  id: string;
  userId: string;
  userLabel: string;
  createdAt: string;
};

export type LoggedQuestion = {
  messageId: string;
  conversationId: string;
  question: string;
  answer: string;
  rating?: 'thumbsUp' | 'thumbsDown';
  ratingText?: string;
  userLabel: string;
  createdAt: string;
};

export type ReviewPage<T> = {
  items: T[];
  nextCursor?: string;
};

export const isFeedbackReportKind = (value: unknown): value is FeedbackReportKind =>
  typeof value === 'string' && (FEEDBACK_REPORT_KINDS as readonly string[]).includes(value);
