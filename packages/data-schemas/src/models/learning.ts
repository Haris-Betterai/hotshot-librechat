import { Schema } from 'mongoose';
import type { ChatReview, LearningChange } from 'librechat-data-provider';
import type { Model } from 'mongoose';

export type LearningState = {
  agentId: string;
  tenantId: string | null;
  enabled: boolean;
  ownerId: string;
  reviews: ChatReview[];
  changes: LearningChange[];
  lastRun?: Date;
  lastError?: string;
  lockUntil: Date;
  lockToken?: string;
};

const schema = new Schema<LearningState>({
  agentId: { type: String, required: true },
  tenantId: { type: String, default: null },
  enabled: { type: Boolean, default: false },
  ownerId: { type: String, required: true },
  reviews: { type: [{ type: Schema.Types.Mixed }], default: [] },
  changes: { type: [{ type: Schema.Types.Mixed }], default: [] },
  lastRun: Date,
  lastError: String,
  lockUntil: { type: Date, default: () => new Date(0) },
  lockToken: String,
});
schema.index({ agentId: 1, tenantId: 1 }, { unique: true });
schema.index({ enabled: 1, lastRun: 1 });

/** Internal scheduler state: every caller must supply an explicit tenant scope. */
export function createLearningModel(mongoose: typeof import('mongoose')): Model<LearningState> {
  return mongoose.models.AgentLearning || mongoose.model<LearningState>('AgentLearning', schema);
}
