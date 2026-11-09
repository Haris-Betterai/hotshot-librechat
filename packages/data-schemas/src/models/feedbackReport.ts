import { Schema } from 'mongoose';
import type { Model } from 'mongoose';
import type { FeedbackReportKind } from 'librechat-data-provider';

export type FeedbackReportDoc = {
  user: string;
  tenantId: string | null;
  kind: FeedbackReportKind;
  message: string;
  name?: string;
  email?: string;
  conversationId?: string;
  page?: string;
  source: 'chat' | 'widget';
  createdAt: Date;
  updatedAt: Date;
};

const schema = new Schema<FeedbackReportDoc>(
  {
    user: { type: String, required: true },
    tenantId: { type: String, default: null },
    kind: { type: String, required: true },
    message: { type: String, required: true },
    name: String,
    email: String,
    conversationId: String,
    page: String,
    source: { type: String, required: true },
  },
  { timestamps: true },
);
schema.index({ tenantId: 1, createdAt: -1 });

/** Tester feedback sent from the chat or widget; every caller supplies an explicit tenant scope. */
export function createFeedbackReportModel(
  mongoose: typeof import('mongoose'),
): Model<FeedbackReportDoc> {
  return (
    mongoose.models.FeedbackReport || mongoose.model<FeedbackReportDoc>('FeedbackReport', schema)
  );
}
