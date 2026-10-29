import { Schema, Document } from 'mongoose';
import type { TGenUiDecision } from 'librechat-data-provider';

/** A UI component an LLM wrote on demand, saved so later answers can reuse it. */
export interface IGenUiComponent extends Document {
  /** Stable slug, e.g. `maintenance_schedule`. */
  key: string;
  name: string;
  /** What it shows and when it fits; the decision model reads this. */
  description: string;
  /** JSON Schema of the props it expects. */
  propsSchema: Record<string, unknown>;
  /** Self-contained HTML (markup, style and script) rendered in a sandboxed frame. */
  html: string;
  authorModel: string;
  uses: number;
  disabled?: boolean;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type GenUiStatus = 'pending' | 'none' | 'ready' | 'error';

/** The UI chosen (or built) for one assistant message. */
export interface IGenUiRender extends Document {
  messageId: string;
  conversationId?: string;
  user: string;
  status: GenUiStatus;
  /** `block:<type>`, `saved:<key>`, `new` or `none`. */
  choice?: string;
  confidence?: number;
  /** A built-in answer block, when the choice was one. */
  block?: Record<string, unknown>;
  componentKey?: string;
  props?: Record<string, unknown>;
  /** The Decisions API answer and what came of it, for the developer panel. */
  decision?: TGenUiDecision;
  error?: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const genUiComponentSchema: Schema<IGenUiComponent> = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    propsSchema: { type: Schema.Types.Mixed, default: {} },
    html: { type: String, required: true },
    authorModel: { type: String, required: true },
    uses: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);

genUiComponentSchema.index({ uses: -1, updatedAt: -1 });

export const genUiRenderSchema: Schema<IGenUiRender> = new Schema(
  {
    messageId: { type: String, required: true, unique: true },
    conversationId: { type: String, index: true },
    user: { type: String, required: true, index: true },
    status: { type: String, required: true },
    choice: { type: String },
    confidence: { type: Number },
    block: { type: Schema.Types.Mixed },
    componentKey: { type: String },
    props: { type: Schema.Types.Mixed },
    decision: { type: Schema.Types.Mixed },
    error: { type: String },
    tenantId: { type: String, index: true },
  },
  { timestamps: true },
);
