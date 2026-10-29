import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Sparkles } from 'lucide-react';
import Decision from '~/components/Chat/Developer/Decision';
import { useGenUiQuery } from '~/data-provider';
import { devModeAtom } from '~/store/devMode';
import { MessageContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { useFoldLists } from './fold';
import AutoHeight from './AutoHeight';
import { CARD_CLASS } from './shared';
import Generated from './Generated';
import UiBlock from './index';
import { cn } from '~/utils';

type GenUiProps = {
  messageId: string;
  conversationId?: string | null;
  isLatestMessage: boolean;
  isSubmitting: boolean;
  /** The answer's follow-up buttons, shown after the card; a generated card carries them itself. */
  followUps?: string;
};

const BAR = 'rounded bg-neutral-100 dark:bg-neutral-800';
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none';

function Building({ isNew }: { isNew: boolean }) {
  const localize = useLocalize();
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(CARD_CLASS, 'my-0 flex max-w-2xl flex-col gap-3', ENTER)}
    >
      <p className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <Sparkles className="size-3.5 animate-pulse" aria-hidden="true" />
        {localize(isNew ? 'com_ui_genui_building_new' : 'com_ui_genui_building')}
      </p>
      <div className="flex animate-pulse flex-col gap-3">
        <div className={cn('h-4 w-1/3', BAR)} />
        <div className={cn('h-3 w-full', BAR)} />
        <div className={cn('h-3 w-2/3', BAR)} />
      </div>
    </div>
  );
}

/**
 * The UI that OpenAI's Decisions model picked for an assistant message: a built-in answer
 * block, a saved generated component, or one written for this answer. It grows in smoothly;
 * a generated component stays behind its placeholder until it has laid out.
 */
export default function GenUi({
  messageId,
  conversationId,
  isLatestMessage,
  isSubmitting,
  followUps,
}: GenUiProps) {
  const localize = useLocalize();
  const devMode = useAtomValue(devModeAtom);
  const hydrated = messageId !== '' && !messageId.endsWith('_');
  const enabled = hydrated && !(isLatestMessage && isSubmitting);
  const { data } = useGenUiQuery({ messageId, conversationId, run: isLatestMessage, enabled });
  const [frameReady, setFrameReady] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const onReady = useCallback(() => setFrameReady(true), []);
  const onFail = useCallback(() => setFrameFailed(true), []);
  const componentKey = data?.component?.key;

  useEffect(() => {
    setFrameReady(false);
    setFrameFailed(false);
  }, [componentKey]);

  const context = useMemo(
    () => ({ messageId, conversationId, isExpanded: true as const, isSubmitting, isLatestMessage }),
    [messageId, conversationId, isSubmitting, isLatestMessage],
  );
  const blockSource = useMemo(() => (data?.block ? JSON.stringify(data.block) : ''), [data]);

  const choice = data?.choice ?? '';
  const ready = data?.status === 'ready';
  const deciding = data?.status === 'pending' && choice !== '' && choice !== 'none';
  const component = ready && !frameFailed ? data?.component : undefined;
  const showBuilding = deciding || (component != null && !frameReady);
  const shown = ready && (blockSource !== '' || (component != null && frameReady));
  const folds = shown && data?.replacesText === true;
  const [showList, setShowList] = useState(false);
  useFoldLists(messageId, folds && !showList);

  return (
    <MessageContext.Provider value={context}>
      <AutoHeight follow={isLatestMessage}>
        {(showBuilding || (ready && (blockSource || component))) && (
          <div className="py-1.5">
            {showBuilding && <Building isNew={choice === 'new'} />}
            {ready && blockSource && (
              <div className={ENTER}>
                <UiBlock source={blockSource} />
              </div>
            )}
            {component && (
              <div
                className={cn(
                  'transition-opacity duration-300 motion-reduce:transition-none',
                  frameReady
                    ? 'opacity-100'
                    : 'pointer-events-none absolute inset-x-0 top-0 opacity-0',
                )}
                aria-hidden={!frameReady}
              >
                <Generated
                  component={component}
                  props={data?.props ?? {}}
                  onReady={onReady}
                  onFail={onFail}
                />
              </div>
            )}
            {shown && (data?.created || folds) && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Sparkles className="size-3" aria-hidden="true" />
                {data?.created &&
                  component &&
                  localize('com_ui_genui_created', { 0: component.name })}
                {folds && (
                  <button
                    type="button"
                    onClick={() => setShowList((value) => !value)}
                    aria-expanded={showList}
                    className="underline-offset-2 hover:text-neutral-800 hover:underline dark:hover:text-neutral-200"
                  >
                    {localize(showList ? 'com_ui_genui_hide_list' : 'com_ui_genui_show_list')}
                  </button>
                )}
              </p>
            )}
          </div>
        )}
      </AutoHeight>
      {followUps && enabled && !(component && frameReady) && (
        <div className={ENTER}>
          <UiBlock source={followUps} />
        </div>
      )}
      {devMode && enabled && <Decision result={data} />}
    </MessageContext.Provider>
  );
}
