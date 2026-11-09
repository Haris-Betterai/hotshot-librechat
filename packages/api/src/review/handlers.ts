import { logger } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { FeedbackReportInput } from 'librechat-data-provider';
import {
  listQuestions,
  FeedbackRateError,
  FeedbackInputError,
  listFeedbackReports,
  createFeedbackReport,
} from './service';

type ReviewRequest = {
  user: { id: string; tenantId?: string };
  query: { cursor?: string; limit?: string };
  body?: Partial<FeedbackReportInput>;
};

const tenantOf = (req: ReviewRequest) => req.user.tenantId ?? null;

const listOptions = (req: ReviewRequest) => ({
  cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
  limit: Number(req.query.limit) || undefined,
});

export async function submitFeedbackHandler(req: ReviewRequest, res: Response): Promise<Response> {
  try {
    const report = await createFeedbackReport(
      { userId: req.user.id, tenantId: tenantOf(req) },
      req.body ?? {},
    );
    return res.status(201).json(report);
  } catch (error) {
    if (error instanceof FeedbackInputError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof FeedbackRateError) {
      return res.status(429).json({ error: error.message });
    }
    logger.error('[review] Failed to save feedback', error);
    return res.status(500).json({ error: 'Unable to save feedback' });
  }
}

export async function listQuestionsHandler(req: ReviewRequest, res: Response): Promise<Response> {
  try {
    return res.json(await listQuestions({ tenantId: tenantOf(req) }, listOptions(req)));
  } catch (error) {
    logger.error('[review] Failed to list questions', error);
    return res.status(500).json({ error: 'Unable to load questions' });
  }
}

export async function listFeedbackHandler(req: ReviewRequest, res: Response): Promise<Response> {
  try {
    return res.json(await listFeedbackReports({ tenantId: tenantOf(req) }, listOptions(req)));
  } catch (error) {
    logger.error('[review] Failed to list feedback', error);
    return res.status(500).json({ error: 'Unable to load feedback' });
  }
}
