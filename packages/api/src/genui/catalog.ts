import type { TUiBlock } from 'librechat-data-provider';

type BuiltInType = Exclude<TUiBlock['type'], 'quick_replies'>;

type BuiltIn = {
  type: BuiltInType;
  /** When the decision model should pick it. */
  description: string;
  /** The JSON shape the props extractor must write. */
  format: string;
};

/**
 * The answer blocks the chat already renders. Quick replies are left out: the agent writes
 * follow-ups itself, and a separate visual is what this layer adds.
 */
export const BUILT_IN_BLOCKS: BuiltIn[] = [
  {
    type: 'product_card',
    description:
      'One recommended Hot Shot\'s Secret product: photo, price, size picker and a "View product" link.',
    format:
      '{"type":"product_card","name":string,"url":string,"image"?:string,"price"?:string,"sizes"?:[{"label":string,"price"?:string}],"summary"?:string,"dose"?:string}',
  },
  {
    type: 'comparison',
    description:
      'Two or three products compared side by side on the same attributes, with a one-line verdict.',
    format:
      '{"type":"comparison","title"?:string,"products":[{"name":string,"url"?:string,"image"?:string,"price"?:string}],"rows":[{"label":string,"values":string[]}],"verdict"?:string} (2-3 products, up to 8 rows, one value per product in each row)',
  },
  {
    type: 'dose_calculator',
    description:
      'How much of one product to add for a tank, sump or system capacity, from a known treat ratio.',
    format:
      '{"type":"dose_calculator","product":string,"url"?:string,"ratio":{"amount":number,"unit":"oz"|"ml","per":number,"perUnit":"quart"|"gallon"|"liter"},"capacity"?:number,"capacityLabel"?:string,"note"?:string}',
  },
  {
    type: 'vehicle_picker',
    description:
      "A short form for the customer's vehicle (year, make, model, engine) when the answer needs it to continue.",
    format:
      '{"type":"vehicle_picker","prompt"?:string,"fields":("year"|"make"|"model"|"engine")[]}',
  },
  {
    type: 'video',
    description:
      "A Hot Shot's Secret YouTube video that the answer links to, played inline in the chat.",
    format:
      '{"type":"video","url":string (a YouTube URL from the evidence),"title"?:string,"summary"?:string}',
  },
];

export const BUILT_IN_BY_TYPE: ReadonlyMap<string, BuiltIn> = new Map(
  BUILT_IN_BLOCKS.map((block) => [block.type, block]),
);
