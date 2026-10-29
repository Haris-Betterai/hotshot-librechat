import type { Model } from 'mongoose';
import type { IGenUiComponent, IGenUiRender } from '~/schema/genUi';

export type GenUiComponentInput = Pick<
  IGenUiComponent,
  'key' | 'name' | 'description' | 'propsSchema' | 'html' | 'authorModel'
>;

export type GenUiRenderUpdate = Partial<
  Pick<
    IGenUiRender,
    'status' | 'choice' | 'confidence' | 'block' | 'componentKey' | 'props' | 'decision' | 'error'
  >
>;

export type GenUiMethods = {
  listGenUiComponents: (limit?: number) => Promise<IGenUiComponent[]>;
  getGenUiComponent: (key: string) => Promise<IGenUiComponent | null>;
  saveGenUiComponent: (input: GenUiComponentInput) => Promise<IGenUiComponent>;
  countGenUiComponentsSince: (since: Date) => Promise<number>;
  markGenUiComponentUsed: (key: string) => Promise<void>;
  getGenUiRender: (messageId: string, user: string) => Promise<IGenUiRender | null>;
  claimGenUiRender: (params: {
    messageId: string;
    conversationId?: string;
    user: string;
  }) => Promise<boolean>;
  updateGenUiRender: (messageId: string, update: GenUiRenderUpdate) => Promise<void>;
};

export function createGenUiMethods(mongoose: typeof import('mongoose')): GenUiMethods {
  const components = () => mongoose.models.GenUiComponent as Model<IGenUiComponent>;
  const renders = () => mongoose.models.GenUiRender as Model<IGenUiRender>;

  /** Saved components the decision model may pick, most used first. */
  async function listGenUiComponents(limit = 100): Promise<IGenUiComponent[]> {
    return components()
      .find({ disabled: { $ne: true } })
      .sort({ uses: -1, updatedAt: -1 })
      .limit(limit)
      .lean<IGenUiComponent[]>();
  }

  async function getGenUiComponent(key: string): Promise<IGenUiComponent | null> {
    return components()
      .findOne({ key, disabled: { $ne: true } })
      .lean<IGenUiComponent>();
  }

  /** Saves a new component; an existing key is kept, so two racing writers agree on one. */
  async function saveGenUiComponent(input: GenUiComponentInput): Promise<IGenUiComponent> {
    await components().updateOne({ key: input.key }, { $setOnInsert: input }, { upsert: true });
    const saved = await components().findOne({ key: input.key }).lean<IGenUiComponent>();
    if (!saved) {
      throw new Error(`[saveGenUiComponent] ${input.key} was not saved`);
    }
    return saved;
  }

  async function countGenUiComponentsSince(since: Date): Promise<number> {
    return components().countDocuments({ createdAt: { $gte: since } });
  }

  async function markGenUiComponentUsed(key: string): Promise<void> {
    await components().updateOne({ key }, { $inc: { uses: 1 } });
  }

  async function getGenUiRender(messageId: string, user: string): Promise<IGenUiRender | null> {
    return renders().findOne({ messageId, user }).lean<IGenUiRender>();
  }

  /**
   * Claims a message for a UI run. Returns false when another request already claimed it,
   * so a message is decided at most once.
   */
  async function claimGenUiRender(params: {
    messageId: string;
    conversationId?: string;
    user: string;
  }): Promise<boolean> {
    const result = await renders().updateOne(
      { messageId: params.messageId },
      { $setOnInsert: { ...params, status: 'pending' } },
      { upsert: true },
    );
    return result.upsertedCount === 1;
  }

  async function updateGenUiRender(messageId: string, update: GenUiRenderUpdate): Promise<void> {
    await renders().updateOne({ messageId }, { $set: update });
  }

  return {
    listGenUiComponents,
    getGenUiComponent,
    saveGenUiComponent,
    countGenUiComponentsSince,
    markGenUiComponentUsed,
    getGenUiRender,
    claimGenUiRender,
    updateGenUiRender,
  };
}
