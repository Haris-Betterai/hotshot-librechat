import React, { useState } from 'react';
import type { TUiQuickReplies } from 'librechat-data-provider';
import { CARD_CLASS, SendGate, useIsEmbed } from './shared';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function Replies({ block }: { block: TUiQuickReplies }) {
  const localize = useLocalize();
  const isEmbed = useIsEmbed();
  const [sent, setSent] = useState(false);

  return (
    <SendGate>
      {(send, enabled) => {
        const active = enabled && !sent && send !== undefined;
        return (
          <div
            data-ui-block="quick_replies"
            className={cn(
              CARD_CLASS,
              'border-0 bg-transparent p-0 shadow-none dark:bg-transparent sm:p-0',
            )}
          >
            {block.prompt && (
              <p className="mb-2 text-neutral-600 dark:text-neutral-400">{block.prompt}</p>
            )}
            <div
              role="group"
              aria-label={localize('com_ui_block_quick_replies')}
              className="flex flex-wrap gap-2"
            >
              {block.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={!active}
                  onClick={() => {
                    if (!active) {
                      return;
                    }
                    setSent(true);
                    send(option);
                  }}
                  className={cn(
                    'rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-sm text-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100',
                    active
                      ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      : 'cursor-not-allowed opacity-50',
                  )}
                  style={
                    isEmbed && active ? { borderColor: 'var(--embed-brand, #3b6cf6)' } : undefined
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      }}
    </SendGate>
  );
}
