import { memo, useMemo, useState, useCallback, useRef, useId } from 'react';
import { useAtomValue } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentTypes } from 'librechat-data-provider';
import type { MouseEvent, FocusEvent } from 'react';
import { ThinkingContent, ThinkingButton, FloatingThinkingBar } from './Thinking';
import { useLocalize, useExpandCollapse } from '~/hooks';
import { showThinkingAtom } from '~/store/showThinking';
import { useMessageContext } from '~/Providers';
import { cn } from '~/utils';

type ReasoningProps = {
  reasoning: string;
  isLast: boolean;
};

/** A short, complete `**bold**` span, e.g. the "Planning engine maintenance"
 *  in "**Planning engine maintenance**\n\nI need to...". Capped at 80 chars
 *  so a long emphasized sentence in the body text doesn't get mistaken for
 *  one of these headings. */
const HEADING_PATTERN = /\*\*([^*\n]{1,80}?)\*\*/g;

/**
 * OpenAI's reasoning summary streams in as a sequence of short bold headings
 * each followed by body text, concatenated with no guaranteed separator
 * between one heading and the next. This returns the most recently
 * *completed* one, so the UI can show live progress ("Exploring product
 * recommendations") instead of a static label. A heading still streaming in
 * — no closing `**` yet — is intentionally ignored until it completes, so
 * the label never flashes a half-typed phrase.
 */
export function extractLatestHeading(text: string): string | null {
  let latest: string | null = null;
  for (const match of text.matchAll(HEADING_PATTERN)) {
    const heading = match[1].trim();
    if (heading) {
      latest = heading;
    }
  }
  return latest;
}

/**
 * Reasoning Component (MODERN SYSTEM)
 *
 * Used for structured content parts with ContentTypes.THINK type.
 * This handles modern message format where content is an array of typed parts.
 *
 * Pattern: `{ content: [{ type: "think", think: "<think>content</think>" }, ...] }`
 *
 * Used by:
 * - ContentParts.tsx → Part.tsx for structured messages
 * - Agent/Assistant responses (OpenAI Assistants, custom agents)
 * - O-series models (o1, o3) with reasoning capabilities
 * - Modern Claude responses with thinking blocks
 *
 * Key differences from legacy Thinking.tsx:
 * - Works with content parts array instead of plain text
 * - Strips `<think>` tags instead of `:::thinking:::` markers
 * - Each THINK part has its own independent toggle button
 * - Can be interleaved with other content types
 *
 * For legacy text-based messages, see Thinking.tsx component.
 */
const Reasoning = memo(({ reasoning, isLast }: ReasoningProps) => {
  const contentId = useId();
  const localize = useLocalize();
  const showThinking = useAtomValue(showThinkingAtom);
  const [isExpanded, setIsExpanded] = useState(showThinking);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { style: expandStyle, ref: expandRef } = useExpandCollapse(isExpanded);
  const { isSubmitting, isLatestMessage, nextType } = useMessageContext();

  // Strip <think> tags from the reasoning content (modern format)
  const reasoningText = useMemo(() => {
    return reasoning
      .replace(/^<think>\s*/, '')
      .replace(/\s*<\/think>$/, '')
      .trim();
  }, [reasoning]);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleFocus = useCallback(() => {
    setIsBarVisible(true);
  }, []);

  const handleBlur = useCallback((e: FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsBarVisible(false);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsBarVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!containerRef.current?.contains(document.activeElement)) {
      setIsBarVisible(false);
    }
  }, []);

  const effectiveIsSubmitting = isLatestMessage ? isSubmitting : false;

  const latestHeading = useMemo(() => extractLatestHeading(reasoningText), [reasoningText]);

  const label = useMemo(() => {
    if (effectiveIsSubmitting && isLast) {
      return latestHeading ?? localize('com_ui_thinking');
    }
    return localize('com_ui_thoughts');
  }, [effectiveIsSubmitting, isLast, latestHeading, localize]);

  const animatedLabel = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={label}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="inline-block"
      >
        {label}
      </motion.span>
    </AnimatePresence>
  );

  if (!reasoningText) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="group/reasoning"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="group/thinking-container">
        <div className="mb-2 pb-2 pt-2">
          <ThinkingButton
            isExpanded={isExpanded}
            onClick={handleClick}
            label={animatedLabel}
            content={reasoningText}
            contentId={contentId}
          />
        </div>
        <div
          id={contentId}
          role="group"
          aria-label={label}
          aria-hidden={!isExpanded || undefined}
          className={cn(nextType !== ContentTypes.THINK && isExpanded && 'mb-4')}
          style={expandStyle}
        >
          <div className="relative overflow-hidden" ref={expandRef}>
            <ThinkingContent>{reasoningText}</ThinkingContent>
            <FloatingThinkingBar
              isVisible={isBarVisible && isExpanded}
              isExpanded={isExpanded}
              onClick={handleClick}
              content={reasoningText}
              contentId={contentId}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default Reasoning;
