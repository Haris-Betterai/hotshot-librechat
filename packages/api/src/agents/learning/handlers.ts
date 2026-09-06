import type { Response } from 'express';
import {
  configureLearning,
  getLearningReport,
  rollbackLearning,
  runLearningReview,
} from './service';

type LearningRequest = {
  params: { id: string };
  user: { id: string; tenantId?: string };
  body?: { enabled?: boolean };
};
type Operation = 'get' | 'configure' | 'review' | 'rollback';

async function runOperation(
  operation: Operation,
  req: LearningRequest,
): Promise<import('librechat-data-provider').LearningReport> {
  const scope = { agentId: req.params.id, tenantId: req.user.tenantId ?? null };
  if (operation === 'configure') {
    return configureLearning(scope, req.user.id, req.body?.enabled === true);
  }
  if (operation === 'review') {
    return runLearningReview(scope, req.user.id);
  }
  if (operation === 'rollback') {
    return rollbackLearning(scope);
  }
  return getLearningReport(scope);
}

export function learningHandler(
  operation: Operation,
): (req: LearningRequest, res: Response) => Promise<Response> {
  return async (req: LearningRequest, res: Response) => {
    if (operation === 'configure' && typeof req.body?.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    try {
      const result = await runOperation(operation, req);
      return res.json(result);
    } catch {
      return res.status(500).json({ error: 'Unable to load or update chat reviews' });
    }
  };
}
