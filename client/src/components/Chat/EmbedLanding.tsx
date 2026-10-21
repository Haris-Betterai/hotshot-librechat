import { memo, useCallback } from 'react';
import ConversationStarters from '~/components/Chat/Input/ConversationStarters';
import useEmbedWidgetSettings from '~/hooks/useEmbedWidgetSettings';
import { useChatContext, useAgentsMapContext } from '~/Providers';
import { useLocalize, useSubmitMessage } from '~/hooks';

function EmbedLanding() {
  const localize = useLocalize();
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const { submitMessage } = useSubmitMessage();
  const { settings, iconUrl } = useEmbedWidgetSettings();
  const { welcomeMessage, starters } = settings;

  const agent = conversation?.agent_id != null ? agentsMap?.[conversation.agent_id] : undefined;
  const avatarUrl = iconUrl ?? agent?.avatar?.filepath;

  const sendStarter = useCallback((text: string) => submitMessage({ text }), [submitMessage]);

  return (
    <div className="flex h-full min-h-0 flex-col justify-end gap-3 overflow-y-auto px-3 pb-3 pt-4">
      {welcomeMessage ? (
        <div className="flex items-end gap-2" data-testid="embed-welcome">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              className="h-7 w-7 shrink-0 rounded-full"
              style={{ backgroundColor: 'var(--embed-brand)' }}
              aria-hidden="true"
            />
          )}
          <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-surface-secondary px-3.5 py-2.5 text-sm text-text-primary">
            {welcomeMessage}
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-text-secondary">
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
              style={{ borderColor: 'var(--embed-brand)', color: 'var(--embed-brand)' }}
              className="max-w-full rounded-full border bg-surface-primary px-3.5 py-1.5 text-left text-sm leading-snug transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
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
