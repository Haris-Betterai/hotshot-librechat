import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import {
  logger,
  createModels,
  createLearningModel,
  runAsSystem,
  tenantStorage,
} from '@librechat/data-schemas';
import type { ChatReview, LearningReport } from 'librechat-data-provider';
import type { LearningState } from '@librechat/data-schemas';
import { reviewChat, supportedRules } from './review';

type Scope = { agentId: string; tenantId: string | null };
const HOUR = 60 * 60 * 1000;
const scopeAgent = (scope: Scope) => ({ id: scope.agentId, tenantId: scope.tenantId });

export async function getLearningReport(scope: Scope): Promise<LearningReport> {
  const { Agent } = createModels(mongoose);
  const [state, agent] = await Promise.all([
    createLearningModel(mongoose).findOne(scope).lean(),
    Agent.findOne(scopeAgent(scope), { learning: 1 }).lean(),
  ]);
  return {
    enabled: agent?.learning?.enabled ?? false,
    rules: agent?.learning?.rules ?? [],
    reviews: state?.reviews ?? [],
    changes: agent?.learning?.changes ?? [],
    lastRun: state?.lastRun?.toISOString(),
    lastError: state?.lastError,
  };
}

export async function configureLearning(
  scope: Scope,
  ownerId: string,
  enabled: boolean,
): Promise<LearningReport> {
  const { Agent } = createModels(mongoose);
  const result = await Agent.updateOne(scopeAgent(scope), {
    $set: { 'learning.enabled': enabled },
  });
  if (!result.matchedCount) {
    throw new Error('Agent not found');
  }
  await createLearningModel(mongoose).updateOne(
    scope,
    { $set: { enabled, ownerId }, $setOnInsert: { lockUntil: new Date(0) } },
    { upsert: true },
  );
  return getLearningReport(scope);
}

export async function rollbackLearning(scope: Scope): Promise<LearningReport> {
  const State = createLearningModel(mongoose);
  const { Agent } = createModels(mongoose);
  const agent = await Agent.findOne(scopeAgent(scope), { learning: 1 }).lean();
  const previousRules = agent?.learning?.changes?.[0]?.previousRules ?? [];
  await Agent.updateOne(scopeAgent(scope), {
    $set: { 'learning.enabled': false, 'learning.rules': previousRules },
  });
  await State.updateOne(scope, { $set: { enabled: false } });
  return getLearningReport(scope);
}

export async function runLearningReview(scope: Scope, ownerId: string): Promise<LearningReport> {
  const State = createLearningModel(mongoose);
  await State.updateOne(
    scope,
    { $setOnInsert: { ownerId, lockUntil: new Date(0) } },
    { upsert: true },
  );
  const lockToken = randomUUID();
  const state = await State.findOneAndUpdate(
    { ...scope, lockUntil: { $lte: new Date() } },
    { $set: { lockToken, lockUntil: new Date(Date.now() + 5 * 60 * 1000) } },
    { new: true },
  ).lean();
  if (!state) {
    return getLearningReport(scope);
  }
  try {
    const { Agent, Conversation, Message } = createModels(mongoose);
    const agent = await Agent.findOne(scopeAgent(scope)).lean();
    if (!agent) {
      await State.updateOne(scope, { $set: { enabled: false } });
      return getLearningReport(scope);
    }
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const conversations = await Conversation.find(
      {
        tenantId: scope.tenantId,
        agent_id: scope.agentId,
        isTemporary: { $ne: true },
        expiredAt: null,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * HOUR), $lte: cutoff },
      },
      { conversationId: 1, user: 1 },
    )
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();
    const reviews: ChatReview[] = [];
    for (const conversation of conversations) {
      const messages = await Message.find(
        {
          tenantId: scope.tenantId,
          conversationId: conversation.conversationId,
          user: conversation.user,
          isTemporary: { $ne: true },
          expiredAt: null,
        },
        { text: 1, content: 1, isCreatedByUser: 1, error: 1, unfinished: 1, feedback: 1 },
      )
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();
      if (
        !messages.length ||
        messages.length === 200 ||
        messages.some((message) => message.unfinished)
      ) {
        continue;
      }
      reviews.push(reviewChat(conversation.conversationId, messages));
    }
    const previousRules = agent.learning?.rules ?? [];
    const rules = supportedRules(reviews, previousRules);
    if (agent.learning?.enabled && rules.length > previousRules.length) {
      const added = rules.filter((rule) => !previousRules.includes(rule));
      await Agent.updateOne(
        { ...scopeAgent(scope), 'learning.enabled': true },
        {
          $set: { 'learning.rules': rules },
          $push: {
            'learning.changes': {
              $each: [
                {
                  at: new Date().toISOString(),
                  rules,
                  previousRules,
                  evidenceCount: reviews.filter((review) =>
                    review.issues.some((issue) => added.includes(issue)),
                  ).length,
                },
              ],
              $position: 0,
              $slice: 20,
            },
          },
        },
      );
    }
    await State.updateOne(
      { ...scope, lockToken },
      {
        $set: { reviews, lastRun: new Date(), lastError: '' },
      },
    );
  } catch (error) {
    logger.error('[AgentLearning] Review failed', error);
    await State.updateOne(
      { ...scope, lockToken },
      {
        $set: { lastError: 'review_failed', lastRun: new Date() },
      },
    );
  } finally {
    await State.updateOne(
      { ...scope, lockToken },
      {
        $set: { lockUntil: new Date(0) },
        $unset: { lockToken: 1 },
      },
    );
  }
  return getLearningReport(scope);
}

let scheduler: ReturnType<typeof setInterval> | undefined;
let running = false;

export function startLearningScheduler(): void {
  if (scheduler) {
    return;
  }
  const tick = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const states: LearningState[] = await createLearningModel(mongoose)
        .find({
          enabled: true,
          $or: [{ lastRun: { $exists: false } }, { lastRun: { $lt: new Date(Date.now() - HOUR) } }],
        })
        .sort({ lastRun: 1 })
        .limit(25)
        .lean();
      for (const state of states) {
        const run = () =>
          runLearningReview({ agentId: state.agentId, tenantId: state.tenantId }, state.ownerId);
        if (state.tenantId) {
          await tenantStorage.run({ tenantId: state.tenantId, userId: state.ownerId }, run);
        } else {
          await runAsSystem(run);
        }
      }
    } catch (error) {
      logger.error('[AgentLearning] Scheduler failed', error);
    } finally {
      running = false;
    }
  };
  scheduler = setInterval(() => void tick(), 60 * 1000);
  scheduler.unref();
}
