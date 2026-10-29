import type { TUiBlock } from './uiblocks';

export type TGenUiStatus = 'pending' | 'none' | 'ready' | 'error';

/** A component an LLM wrote on demand and the server saved for reuse. */
export type TGenUiComponent = {
  key: string;
  name: string;
  /** Self-contained HTML rendered in a sandboxed frame. */
  html: string;
};

export type TGenUiOption = { value: string; probability: number };

/** What the Decisions API answered for a message, and what happened next. Shown to developers. */
export type TGenUiDecision = {
  /** The decision model, `gpt-6-luna`. */
  model: string;
  /** The model's top choice before thresholds. */
  choice: string;
  confidence: number;
  /** Probability that any visual beats plain text. */
  worth?: number;
  /** Every option the model weighed, most likely first. */
  options: TGenUiOption[];
  /** Why the shown UI is what it is, e.g. `shown`, `below confidence`, `agent drew a block`. */
  outcome: string;
  decideMs?: number;
  buildMs?: number;
  /** The model that filled or wrote the component. */
  buildModel?: string;
};

export type TGenUiCatalogEntry = {
  /** The decision value, e.g. `block:comparison` or `saved:maintenance_schedule`. */
  value: string;
  name: string;
  description: string;
  kind: 'built-in' | 'saved' | 'special';
  uses?: number;
  authorModel?: string;
  createdAt?: string;
};

/** Every card the decision model can choose from, and the thresholds it must clear. */
export type TGenUiCatalog = {
  decisionModel: string;
  authorModel: string;
  minConfidence: number;
  minNewWorth: number;
  /** A new card also goes ahead at this confidence, whatever the worth score. */
  minNewConfidence: number;
  entries: TGenUiCatalogEntry[];
};

/** The UI chosen for one assistant message by the decision model. */
export type TGenUiResult = {
  status: TGenUiStatus;
  /** `block:<type>`, `saved:<key>`, `new` or `none`. */
  choice?: string;
  /** True when the component was written for this message. */
  created?: boolean;
  block?: TUiBlock;
  component?: TGenUiComponent;
  props?: Record<string, unknown>;
  decision?: TGenUiDecision;
  error?: string;
};

export type TGenUiRequest = {
  messageId: string;
  conversationId?: string;
  /** Decide (and build) now; otherwise only a stored result is returned. */
  run?: boolean;
};
