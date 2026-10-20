import { Model } from 'mongoose';
import embedWidgetLinkSchema, { IEmbedWidgetLink } from '~/schema/embedWidgetLink';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';

export function createEmbedWidgetLinkModel(
  mongoose: typeof import('mongoose'),
): Model<IEmbedWidgetLink> {
  applyTenantIsolation(embedWidgetLinkSchema);
  return mongoose.models.EmbedWidgetLink ||
    mongoose.model<IEmbedWidgetLink>('EmbedWidgetLink', embedWidgetLinkSchema);
}

