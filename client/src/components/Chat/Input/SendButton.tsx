import React, { forwardRef } from 'react';
import { useWatch } from 'react-hook-form';
import { SendIcon, TooltipAnchor } from '@librechat/client';
import type { Control } from 'react-hook-form';
import { useLocalize } from '~/hooks';
import { cn, isEmbedWidget } from '~/utils';

type SendButtonProps = {
  disabled: boolean;
  control: Control<{ text: string }>;
};

const SubmitButton = React.memo(
  forwardRef((props: { disabled: boolean }, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const localize = useLocalize();
    const isEmbed = isEmbedWidget();
    const accentStyle =
      isEmbed && !props.disabled
        ? { backgroundColor: 'var(--embed-brand, #3b6cf6)', color: '#fff' }
        : undefined;
    return (
      <TooltipAnchor
        description={localize('com_nav_send_message')}
        render={
          <button
            ref={ref}
            aria-label={localize('com_nav_send_message')}
            id="send-button"
            disabled={props.disabled}
            className={cn(
              'rounded-full p-1.5 outline-offset-4 transition-all duration-200 disabled:cursor-not-allowed',
              isEmbed
                ? 'bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                : 'bg-text-primary text-text-primary disabled:text-text-secondary disabled:opacity-10',
            )}
            style={accentStyle}
            data-testid="send-button"
            type="submit"
          >
            <span className="" data-state="closed">
              <SendIcon size={24} />
            </span>
          </button>
        }
      />
    );
  }),
);

const SendButton = React.memo(
  forwardRef((props: SendButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const data = useWatch({ control: props.control });
    const content = data?.text?.trim();
    return <SubmitButton ref={ref} disabled={props.disabled || !content} />;
  }),
);

export default SendButton;
