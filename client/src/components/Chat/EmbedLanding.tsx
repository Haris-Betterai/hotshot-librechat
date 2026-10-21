import { memo, useCallback } from 'react';
import EmbedOrb from '~/components/Chat/EmbedOrb';
import ConversationStarters from '~/components/Chat/Input/ConversationStarters';
import useEmbedWidgetSettings from '~/hooks/useEmbedWidgetSettings';
import { useLocalize, useSubmitMessage } from '~/hooks';

function EmbedLanding() {
  const localize = useLocalize();
  const { submitMessage } = useSubmitMessage();
  const { settings, iconUrl } = useEmbedWidgetSettings();
  const { welcomeMessage, starters } = settings;

  const avatarUrl = settings.launcherIcon === 'custom' ? iconUrl : undefined;

  const sendStarter = useCallback((text: string) => submitMessage({ text }), [submitMessage]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full flex-col justify-end gap-3 overflow-y-auto px-3 pb-3 pt-4 md:max-w-3xl">
      {welcomeMessage ? (
        <div className="flex items-end gap-2" data-testid="embed-welcome">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
          ) : (
            <EmbedOrb size={28} className="shrink-0" />
          )}
          <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2.5 text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">
            {welcomeMessage}
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          {localize('com_ui_embed_start_conversation')}
        </p>
      )}
      {starters.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2" data-testid="embed-starters">
          {starters.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => sendStarter(text)}
              className="max-w-full rounded-full border border-neutral-200 bg-transparent px-3.5 py-1.5 text-left text-sm leading-snug text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-100"
            >
              <span className="line-clamp-2 break-words">{text}</span>
            </button>
          ))}
        </div>
      ) : (
        <ConversationStarters />
      )}
    </div>
  );
}

export default memo(EmbedLanding);
