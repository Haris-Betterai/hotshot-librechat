import type { TUiBlock } from './uiblocks';

export type TGenUiStatus = 'pending' | 'none' | 'ready' | 'error';

/** A component an LLM wrote on demand and the server saved for reuse. */
export type TGenUiComponent = {
  key: string;
  name: string;
  /** Self-contained HTML rendered in a sandboxed frame. */
  html: string;
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
};

export type TGenUiRequest = {
  messageId: string;
  conversationId?: string;
  /** Decide (and build) now; otherwise only a stored result is returned. */
  run?: boolean;
};
