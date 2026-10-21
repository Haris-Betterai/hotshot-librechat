import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useOptionalChatContext, useMessageContext } from '~/Providers';
import { useSubmitMessage } from '~/hooks';
import { cn, isEmbedWidget } from '~/utils';

export const CARD_CLASS =
  'ui-block not-prose my-3 w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-neutral-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 sm:p-4';

export const FIELD_CLASS =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:focus-visible:ring-neutral-500';

export const LINK_CLASS =
  'font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-neutral-100';

const PRIMARY_CLASS =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50';

type Accent = { className: string; style?: CSSProperties };

/** Filled primary-button look: brand colour inside the embedded widget, neutral on the main site. */
export function usePrimaryButton(): Accent {
  const isEmbed = isEmbedWidget();
  return isEmbed
    ? {
        className: PRIMARY_CLASS,
        style: { backgroundColor: 'var(--embed-brand, #3b6cf6)', color: '#fff' },
      }
    : {
        className: cn(
          PRIMARY_CLASS,
          'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900',
        ),
      };
}

export function useIsEmbed(): boolean {
  return isEmbedWidget();
}

type Send = (text: string) => void;

type GateProps = { children: (send: Send | undefined, enabled: boolean) => ReactNode };

function LiveSubmit({ children, enabled }: GateProps & { enabled: boolean }) {
  const { submitMessage } = useSubmitMessage();
  const send = React.useCallback<Send>((text) => submitMessage({ text }), [submitMessage]);
  return <>{children(send, enabled)}</>;
}

/**
 * Hands interactive blocks a `send` that submits the text as the customer's next message.
 * Only the latest assistant message that is finished streaming is `enabled`; outside a chat
 * (shared links) there is no `send` at all.
 */
export function SendGate({ children }: GateProps) {
  const chat = useOptionalChatContext();
  const { isLatestMessage = false, isSubmitting = false } = useMessageContext();
  const enabled = isLatestMessage && !isSubmitting;
  if (!chat) {
    return <>{children(undefined, false)}</>;
  }
  return <LiveSubmit enabled={enabled}>{children}</LiveSubmit>;
}
