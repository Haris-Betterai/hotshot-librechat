import type { TMessage } from 'librechat-data-provider';

/**
 * The literal LLM that answered a turn (e.g. "gpt-5.6-luna"), captured per
 * response in `metadata.respondingModel` — distinct from `message.model`,
 * which for the agents endpoint holds the agent id, not the underlying model.
 * A model spec or intelligence level can vary the model turn to turn, so this
 * is read per message rather than off the agent/endpoint config. Absent on
 * messages saved before this field existed, and on user turns.
 */
export function getRespondingModel(message?: TMessage | null): string | undefined {
  const value = message?.metadata?.respondingModel;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Inline model-name badge shown next to the timestamp in the message header.
 * Same reveal behavior as `MessageTimestamp` — visible on touch, fades in on
 * hover/focus for hover-capable pointers — so the two read as one unit.
 */
export default function MessageModelBadge({ message }: { message?: TMessage | null }) {
  const model = getRespondingModel(message);
  if (!model) {
    return null;
  }

  return (
    <span
      title={model}
      className="ml-2 text-xs font-normal text-text-secondary transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
    >
      {model}
    </span>
  );
}
