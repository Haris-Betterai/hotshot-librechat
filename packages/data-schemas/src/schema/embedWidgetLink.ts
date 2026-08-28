import mongoose, { Schema, Document } from 'mongoose';

export interface IEmbedWidgetLink extends Document {
  embedId: string;
  agentId: string;
  /**
   * Exact origins (scheme + host) allowed to initialize the guest widget.
   * No wildcards are supported in MVP.
   */
  allowedOrigins: string[];
  /** File extension of the uploaded launcher icon, e.g. `png`. */
  iconExt?: string;
  user?: string;
  tenantId?: string;
  expiredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const embedWidgetLinkSchema: Schema<IEmbedWidgetLink> = new Schema(
  {
    embedId: {
      type: String,
      required: true,
      index: true,
    },
    agentId: {
      type: String,
      required: true,
      index: true,
    },
    allowedOrigins: {
      type: [String],
      required: true,
      default: [],
    },
    iconExt: {
      type: String,
    },
    user: {
      type: String,
      index: true,
    },
    tenantId: {
      type: String,
      index: true,
    },
    expiredAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Auto-sweep expired rows.
embedWidgetLinkSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });
embedWidgetLinkSchema.index({ updatedAt: -1 });

export default embedWidgetLinkSchema;

