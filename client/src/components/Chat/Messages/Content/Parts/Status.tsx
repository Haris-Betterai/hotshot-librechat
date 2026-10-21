import { memo, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ContentTypes } from 'librechat-data-provider';
import type { Agents, TMessageContentParts } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';
import { groupSequentialToolCalls } from '~/utils/groupToolCalls';
import { ASK_USER_QUESTION } from '~/utils/approval';
import { describeStep } from '~/utils/steps';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export type StatusState =
  | { kind: 'thinking' }
  | { kind: 'writing' }
  | { kind: 'tool'; name: string; args?: string | Record<string, unknown> };

type Part = TMessageContentParts | undefined;

const FALLBACKS = {
  thinking: 'Thinking…',
  writing: 'Writing the answer…',
} as const;

const textOf = (part: TMessageContentParts): string => {
  if (part.type === ContentTypes.THINK) {
    return typeof part.think === 'string' ? part.think : (part.think?.value ?? '');
  }
  if (part.type !== ContentTypes.TEXT) {
    return '';
  }
  return typeof part.text === 'string' ? part.text : (part.text?.value ?? '');
};

const toolOf = (part: TMessageContentParts): Agents.ToolCall | undefined =>
  part.type === ContentTypes.TOOL_CALL
    ? (part[ContentTypes.TOOL_CALL] as Agents.ToolCall | undefined)
    : undefined;

const isActive = (call: Agents.ToolCall): boolean => {
  const progress = (call as Agents.ToolCall & { progress?: number }).progress;
  return !call.output && progress !== 1;
};

/**
 * What the assistant is doing right now, or null when something else on screen
 * already says so (streaming answer text, a visible reasoning block, a single
 * in-flight tool row) or nothing is in progress.
 */
export function resolveStatus(content: Part[] | undefined): StatusState | null {
  const parts = (content ?? []).flatMap((part, idx) => (part ? [{ part, idx }] : []));
  const meaningful = parts.filter(({ part }) => {
    const isText = part.type === ContentTypes.TEXT || part.type === ContentTypes.THINK;
    return !isText || textOf(part).trim().length > 0;
  });
  const last = meaningful[meaningful.length - 1];
  if (!last) {
    return { kind: 'thinking' };
  }
  if (last.part.type === ContentTypes.TEXT || last.part.type === ContentTypes.THINK) {
    return null;
  }
  const call = toolOf(last.part);
  if (!call) {
    return last.part.type === ContentTypes.AGENT_UPDATE ? { kind: 'thinking' } : null;
  }
  const groups = groupSequentialToolCalls(meaningful);
  const trailing = groups[groups.length - 1];
  const run = trailing?.type === 'tool-group' ? trailing.parts : [last];
  const active = run.map(({ part }) => toolOf(part)).filter((c) => c != null && isActive(c));
  const current = active[active.length - 1];
  if (!current) {
    return { kind: 'writing' };
  }
  if (current.name === ASK_USER_QUESTION || trailing?.type !== 'tool-group') {
    return null;
  }
  return { kind: 'tool', name: current.name ?? '', args: current.args };
}

export const StatusText = memo(function StatusText({ text }: { text: string }) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <div
      role="status"
      aria-live="polite"
      className="my-1.5 flex min-h-[20px] items-center gap-2.5 text-text-secondary"
    >
      <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
        {!reduceMotion && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-text-secondary opacity-50" />
        )}
        <span className="relative inline-flex size-2.5 rounded-full bg-text-secondary" />
      </span>
      <span className={cn('font-medium', !reduceMotion && 'shimmer')}>{text}</span>
    </div>
  );
});

const StatusLine = memo(function StatusLine({
  content,
  isSubmitting,
}: {
  content: Part[] | undefined;
  isSubmitting: boolean;
}) {
  const localize = useLocalize();
  const status = useMemo(
    () => (isSubmitting ? resolveStatus(content) : null),
    [content, isSubmitting],
  );

  const text = useMemo(() => {
    if (!status) {
      return '';
    }
    if (status.kind === 'tool') {
      return describeStep({ name: status.name, args: status.args, done: false }, localize);
    }
    const key = `com_ui_status_${status.kind}` as TranslationKeys;
    const out = localize(key);
    return out === key ? FALLBACKS[status.kind] : out;
  }, [status, localize]);

  if (!text) {
    return null;
  }
  return <StatusText text={text} />;
});

export default StatusLine;
