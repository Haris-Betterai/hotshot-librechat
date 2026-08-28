import { Model } from 'mongoose';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import embedWidgetLinkSchema, { IEmbedWidgetLink } from '~/schema/embedWidgetLink';

export function createEmbedWidgetLinkModel(
  mongoose: typeof import('mongoose'),
): Model<IEmbedWidgetLink> {
  applyTenantIsolation(embedWidgetLinkSchema);
  return mongoose.models.EmbedWidgetLink ||
    mongoose.model<IEmbedWidgetLink>('EmbedWidgetLink', embedWidgetLinkSchema);
}

