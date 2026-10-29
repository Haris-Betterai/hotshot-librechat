import { Model } from 'mongoose';
import { genUiComponentSchema, genUiRenderSchema } from '~/schema/genUi';
import type { IGenUiComponent, IGenUiRender } from '~/schema/genUi';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';

export function createGenUiComponentModel(
  mongoose: typeof import('mongoose'),
): Model<IGenUiComponent> {
  applyTenantIsolation(genUiComponentSchema);
  return (
    mongoose.models.GenUiComponent ||
    mongoose.model<IGenUiComponent>('GenUiComponent', genUiComponentSchema)
  );
}

export function createGenUiRenderModel(mongoose: typeof import('mongoose')): Model<IGenUiRender> {
  applyTenantIsolation(genUiRenderSchema);
  return (
    mongoose.models.GenUiRender || mongoose.model<IGenUiRender>('GenUiRender', genUiRenderSchema)
  );
}
