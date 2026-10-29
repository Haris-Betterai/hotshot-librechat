import { ContentTypes, UI_BLOCK_LANGUAGE, parseUiBlock } from 'librechat-data-provider';
import type { TMessageContentParts } from 'librechat-data-provider';

const BLOCK_PATTERN = new RegExp('```' + UI_BLOCK_LANGUAGE + '\\s*([\\s\\S]*?)```', 'g');

const partText = (part: TMessageContentParts | undefined): string => {
  if (part?.type !== ContentTypes.TEXT) {
    return '';
  }
  const text: unknown = part.text;
  if (typeof text === 'string') {
    return text;
  }
  return text && typeof text === 'object' && 'value' in text ? String(text.value) : '';
};

/**
 * The source of the answer's last follow-up block, so it can be shown after a generated card
 * instead of above it. Empty when the answer has none.
 */
export function findFollowUps(
  content: Array<TMessageContentParts | undefined> | undefined,
): string {
  let source = '';
  for (const part of content ?? []) {
    for (const match of partText(part).matchAll(BLOCK_PATTERN)) {
      const candidate = match[1].trim();
      if (parseUiBlock(candidate)?.type === 'quick_replies') {
        source = candidate;
      }
    }
  }
  return source;
}
