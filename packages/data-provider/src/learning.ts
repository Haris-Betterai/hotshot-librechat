export const learningRules = {
  introductions:
    'Answer the customer’s actual question immediately. Introduce yourself only if asked; never repeat a greeting or introduction during an ongoing conversation.',
  questions:
    'Ask at most one focused clarification at a time, only when the missing detail changes the answer. Reuse details already supplied. Do not add a follow-up question when the request is fully answered.',
  brevity:
    'For a simple question, lead with a direct answer in one or two short paragraphs. Expand only when the customer asks for a comparison, detailed instructions, or a maintenance plan. Avoid repeating product cards on follow-up turns.',
} as const;

export type LearningRule = keyof typeof learningRules;

const learningRuleKeys = new Set<string>(Object.keys(learningRules));

export const isLearningRule = (rule: string): rule is LearningRule => learningRuleKeys.has(rule);

export type AgentLearning = {
  enabled: boolean;
  rules: LearningRule[];
  changes?: LearningChange[];
};
export type ChatReview = {
  conversationId: string;
  reviewedAt: string;
  request: string;
  response: string;
  replyCount: number;
  toolCalls: number;
  failedReplies: number;
  negativeFeedback: number;
  issues: LearningRule[];
};
export type LearningChange = {
  at: string;
  rules: LearningRule[];
  previousRules: LearningRule[];
  evidenceCount: number;
};
export type LearningReport = {
  enabled: boolean;
  rules: LearningRule[];
  reviews: ChatReview[];
  changes: LearningChange[];
  lastRun?: string;
  lastError?: string;
};

export function learningInstructions(learning?: AgentLearning): string {
  if (!learning?.enabled) {
    return '';
  }
  const rules = Array.from(new Set(learning.rules)).filter(isLearningRule);
  return rules.length
    ? `Conversation quality guidance (preserve all factual verification and safety requirements):\n${rules.map((rule) => `- ${learningRules[rule]}`).join('\n')}`
    : '';
}
