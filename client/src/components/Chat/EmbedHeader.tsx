import { memo, useCallback, useEffect, useState } from 'react';
import { QueryKeys } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { Maximize, Minimize, Plus, X } from 'lucide-react';
import EmbedOrb from '~/components/Chat/EmbedOrb';
import useEmbedWidgetSettings from '~/hooks/useEmbedWidgetSettings';
import { useChatContext, useAgentsMapContext } from '~/Providers';
import { useLocalize, useNewConvo } from '~/hooks';
import { clearMessagesCache } from '~/utils';

const buttonClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:ring-neutral-100';

const OPEN_OVERLAY =
  '[role="dialog"], [role="menu"], [role="listbox"], [role="alertdialog"], [aria-expanded="true"]';

const closeClass =
  'flex h-10 min-h-10 w-10 min-w-10 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:ring-neutral-100';

function postToParent(message: { type: string; expanded?: boolean }) {
  try {
    window.parent.postMessage(message, '*');
  } catch {
    /* ignore cross-frame errors */
  }
}

function EmbedHeader() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const { settings, iconUrl } = useEmbedWidgetSettings();
  const [expanded, setExpanded] = useState(false);

  const agent = conversation?.agent_id != null ? agentsMap?.[conversation.agent_id] : undefined;
  const title = settings.title || agent?.name || conversation?.title || localize('com_ui_chat');
  const avatarUrl = settings.launcherIcon === 'custom' ? iconUrl : undefined;
  const expandLabel = localize(expanded ? 'com_ui_embed_minimize' : 'com_ui_embed_maximize');

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => {
      postToParent({ type: 'hotshot-embed-resize', expanded: !prev });
      return !prev;
    });
  }, []);

  const close = useCallback(() => postToParent({ type: 'hotshot-embed-close' }), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      if (document.querySelector(OPEN_OVERLAY) != null) {
        return;
      }
      close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close]);

  const startNewChat = useCallback(() => {
    clearMessagesCache(queryClient, conversation?.conversationId);
    queryClient.invalidateQueries([QueryKeys.messages]);
    newConversation({
      template: {
        agent_id: conversation?.agent_id,
        endpoint: conversation?.endpoint,
        spec: conversation?.spec,
      },
    });
  }, [queryClient, newConversation, conversation]);

  return (
    <header className="flex h-[52px] w-full shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          data-testid="embed-header-avatar"
        />
      ) : (
        <EmbedOrb size={32} className="shrink-0" />
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {title}
        </p>
        {settings.subtitle && (
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {settings.subtitle}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label={localize('com_ui_embed_new_chat')}
        title={localize('com_ui_embed_new_chat')}
        onClick={startNewChat}
        className={buttonClass}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={expandLabel}
        title={expandLabel}
        onClick={toggleExpand}
        className={buttonClass}
      >
        {expanded ? (
          <Minimize className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Maximize className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        aria-label={localize('com_ui_embed_close')}
        title={localize('com_ui_embed_close')}
        onClick={close}
        data-testid="embed-close"
        className={closeClass}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}

export default memo(EmbedHeader);
