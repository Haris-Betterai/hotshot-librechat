import type { Model } from 'mongoose';
import type { IGenUiComponent, IGenUiRender } from '~/schema/genUi';

const MAX_KEY_ATTEMPTS = 20;

export type GenUiComponentInput = Pick<
  IGenUiComponent,
  'key' | 'name' | 'description' | 'propsSchema' | 'html' | 'authorModel' | 'kitVersion'
>;

export type GenUiRenderUpdate = Partial<
  Pick<
    IGenUiRender,
    'status' | 'choice' | 'confidence' | 'block' | 'componentKey' | 'props' | 'decision' | 'error'
  >
>;

export type GenUiMethods = {
  listGenUiComponents: (limit?: number, kitVersion?: number) => Promise<IGenUiComponent[]>;
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
  async function listGenUiComponents(limit = 100, kitVersion?: number): Promise<IGenUiComponent[]> {
    return components()
      .find({ disabled: { $ne: true }, ...(kitVersion != null ? { kitVersion } : {}) })
      .sort({ uses: -1, updatedAt: -1 })
      .limit(limit)
      .lean<IGenUiComponent[]>();
  }

  async function getGenUiComponent(key: string): Promise<IGenUiComponent | null> {
    return components()
      .findOne({ key, disabled: { $ne: true } })
      .lean<IGenUiComponent>();
  }

  /**
   * Saves a new component under its key, or under `key_2`, `key_3`… when that key is taken (for
   * example by a component written for an older UI kit), so code and props are never mismatched.
   */
  async function saveGenUiComponent(input: GenUiComponentInput): Promise<IGenUiComponent> {
    for (let attempt = 1; attempt <= MAX_KEY_ATTEMPTS; attempt++) {
      const key = attempt === 1 ? input.key : `${input.key}_${attempt}`;
      const result = await components().updateOne(
        { key },
        { $setOnInsert: { ...input, key } },
        { upsert: true },
      );
      if (result.upsertedCount === 1) {
        const saved = await components().findOne({ key }).lean<IGenUiComponent>();
        if (saved) {
          return saved;
        }
      }
    }
    throw new Error(`[saveGenUiComponent] no free key for ${input.key}`);
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
