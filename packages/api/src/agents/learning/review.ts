import { z } from 'zod';
import { isLearningRule } from 'librechat-data-provider';
import type { ChatReview, LearningRule } from 'librechat-data-provider';

export type ReviewMessage = {
  text?: string;
  content?: unknown[];
  isCreatedByUser: boolean;
  error?: boolean;
  unfinished?: boolean;
  feedback?: { rating: string };
};

const partSchema = z.object({
  type: z.string(),
  text: z.union([z.string(), z.object({ value: z.string() })]).optional(),
});

export function redactExcerpt(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, '[number]')
    .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/g, '[VIN]')
    .replace(/https?:\/\/\S+/g, '[link]')
    .slice(0, 360);
}

export function reviewChat(conversationId: string, messages: ReviewMessage[]): ChatReview {
  const issues = new Set<LearningRule>();
  let replyCount = 0;
  let toolCalls = 0;
  let failedReplies = 0;
  let negativeFeedback = 0;
  let request = '';
  let response = '';
  let lastRequest = '';
  let introductions = 0;
  for (const message of messages) {
    let text = message.text ?? '';
    const texts: string[] = [];
    for (const rawPart of message.content ?? []) {
      const parsed = partSchema.safeParse(rawPart);
      if (!parsed.success) {
        continue;
      }
      const part = parsed.data;
      if (!message.isCreatedByUser && part.type === 'tool_call') {
        toolCalls += 1;
      }
      if (part.type === 'text' && part.text) {
        texts.push(typeof part.text === 'string' ? part.text : part.text.value);
      }
    }
    if (texts.length) {
      text = texts.join('\n');
    }
    if (message.isCreatedByUser) {
      lastRequest = text;
      request ||= redactExcerpt(text);
      continue;
    }
    if (message.error || message.unfinished || !text.trim()) {
      failedReplies += 1;
      continue;
    }
    replyCount += 1;
    response = redactExcerpt(text);
    if (message.feedback?.rating === 'thumbsDown') {
      negativeFeedback += 1;
    }
    if (/^(?:hey|hi|hello)[,!\s]+(?:i['’]m|i am)\b/i.test(text.trim())) {
      introductions += 1;
    }
    if ((text.match(/\?/g) ?? []).length >= 3) {
      issues.add('questions');
    }
    const shortRequest = lastRequest.trim().split(/\s+/).length <= 20;
    const asksForDetail =
      /compar|detail|plan|steps|instructions|explain|how|why|list|all|everything/i.test(
        lastRequest,
      );
    if (shortRequest && !asksForDetail && text.trim().split(/\s+/).length > 280) {
      issues.add('brevity');
    }
  }
  if (introductions > 1) {
    issues.add('introductions');
  }
  return {
    conversationId,
    reviewedAt: new Date().toISOString(),
    request,
    response,
    replyCount,
    toolCalls,
    failedReplies,
    negativeFeedback,
    issues: [...issues],
  };
}

/** Only developer-authored guidance can become instructions; chat text is never promoted. */
export function supportedRules(reviews: ChatReview[], current: LearningRule[]): LearningRule[] {
  const result = new Set(current.filter(isLearningRule));
  const evidence = new Map<LearningRule, Set<string>>();
  for (const review of reviews) {
    for (const rule of review.issues) {
      if (!isLearningRule(rule)) {
        continue;
      }
      const conversations = evidence.get(rule) ?? new Set<string>();
      conversations.add(review.conversationId);
      evidence.set(rule, conversations);
      if (conversations.size >= 3) {
        result.add(rule);
      }
    }
  }
  return [...result];
}
