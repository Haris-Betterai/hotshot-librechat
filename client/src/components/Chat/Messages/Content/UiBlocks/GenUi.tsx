import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { MessageContext } from '~/Providers';
import { useGenUiQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { CARD_CLASS } from './shared';
import Generated from './Generated';
import UiBlock from './index';
import { cn } from '~/utils';

type GenUiProps = {
  messageId: string;
  conversationId?: string | null;
  isLatestMessage: boolean;
  isSubmitting: boolean;
};

const BAR = 'rounded bg-neutral-100 dark:bg-neutral-800';

function Building({ isNew }: { isNew: boolean }) {
  const localize = useLocalize();
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(CARD_CLASS, 'flex max-w-2xl animate-pulse flex-col gap-3')}
    >
      <p className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Sparkles className="size-3.5" aria-hidden="true" />
        {localize(isNew ? 'com_ui_genui_building_new' : 'com_ui_genui_building')}
      </p>
      <div className={cn('h-4 w-1/3', BAR)} />
      <div className={cn('h-3 w-full', BAR)} />
      <div className={cn('h-3 w-2/3', BAR)} />
    </div>
  );
}

/**
 * The UI that OpenAI's Decisions model picked for an assistant message: a built-in answer
 * block, a saved generated component, or one written for this answer.
 */
export default function GenUi({
  messageId,
  conversationId,
  isLatestMessage,
  isSubmitting,
}: GenUiProps) {
  const localize = useLocalize();
  const hydrated = messageId !== '' && !messageId.endsWith('_');
  const { data } = useGenUiQuery({
    messageId,
    conversationId,
    run: isLatestMessage,
    enabled: hydrated && !(isLatestMessage && isSubmitting),
  });
  const context = useMemo(
    () => ({
      messageId,
      conversationId,
      isExpanded: true as const,
      isSubmitting,
      isLatestMessage,
    }),
    [messageId, conversationId, isSubmitting, isLatestMessage],
  );
  const blockSource = useMemo(() => (data?.block ? JSON.stringify(data.block) : ''), [data]);

  if (!data) {
    return null;
  }
  if (data.status === 'pending') {
    const choice = data.choice ?? '';
    return choice && choice !== 'none' ? <Building isNew={choice === 'new'} /> : null;
  }
  if (data.status !== 'ready') {
    return null;
  }
  return (
    <MessageContext.Provider value={context}>
      {blockSource && <UiBlock source={blockSource} />}
      {data.component && (
        <>
          <Generated component={data.component} props={data.props ?? {}} />
          {data.created && (
            <p className="-mt-1 mb-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <Sparkles className="size-3" aria-hidden="true" />
              {localize('com_ui_genui_created', { 0: data.component.name })}
            </p>
          )}
        </>
      )}
    </MessageContext.Provider>
  );
}
