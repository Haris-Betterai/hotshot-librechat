import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import { FEEDBACK_REPORT_KINDS, FEEDBACK_REPORT_LIMITS } from 'librechat-data-provider';
import type { FeedbackReportKind } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';
import { useSubmitFeedbackReportMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: 'chat' | 'widget';
};

export const KIND_LABELS: Record<FeedbackReportKind, TranslationKeys> = {
  wrong_answer: 'com_ui_report_kind_wrong_answer',
  bug: 'com_ui_report_kind_bug',
  suggestion: 'com_ui_report_kind_suggestion',
  other: 'com_ui_report_kind_other',
};

/** The conversation open at `/c/:id` (or `/staff/c/:id`), if any. */
export const conversationIdFromPath = (pathname: string): string | undefined => {
  const id = pathname.match(/\/c\/([^/?#]+)/)?.[1];
  return id && id !== 'new' ? decodeURIComponent(id) : undefined;
};

const fieldClass =
  'w-full rounded-xl border border-border-light bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-border-heavy';

export default function FeedbackDialog({ open, onOpenChange, source }: FeedbackDialogProps) {
  const localize = useLocalize();
  const { pathname } = useLocation();
  const submit = useSubmitFeedbackReportMutation();
  const [kind, setKind] = useState<FeedbackReportKind>('wrong_answer');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next && submit.isSuccess) {
      setMessage('');
      submit.reset();
    }
  };

  const send = () =>
    submit.mutate({
      kind,
      message,
      name,
      email,
      source,
      conversationId: conversationIdFromPath(pathname),
      page: window.location.href,
    });

  return (
    <OGDialog open={open} onOpenChange={close}>
      <OGDialogContent className="w-11/12 max-w-md">
        <OGDialogTitle className="text-lg font-semibold text-text-primary">
          {localize('com_ui_report_title')}
        </OGDialogTitle>
        {submit.isSuccess ? (
          <div className="flex flex-col gap-4" role="status">
            <p className="text-sm text-text-primary">{localize('com_ui_report_thanks')}</p>
            <div className="flex justify-end">
              <Button variant="submit" onClick={() => close(false)}>
                {localize('com_ui_close')}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <p className="text-sm text-text-secondary">{localize('com_ui_report_intro')}</p>
            <div
              role="radiogroup"
              aria-label={localize('com_ui_report_kind')}
              className="flex flex-wrap gap-2"
            >
              {FEEDBACK_REPORT_KINDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={kind === option}
                  onClick={() => setKind(option)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm',
                    kind === option
                      ? 'border-text-primary bg-text-primary text-surface-primary'
                      : 'border-border-medium text-text-primary hover:bg-surface-hover',
                  )}
                >
                  {localize(KIND_LABELS[option])}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={5}
              value={message}
              maxLength={FEEDBACK_REPORT_LIMITS.message}
              onChange={(event) => setMessage(event.target.value)}
              aria-label={localize('com_ui_report_message')}
              placeholder={localize('com_ui_report_message_placeholder')}
              className={fieldClass}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={name}
                maxLength={FEEDBACK_REPORT_LIMITS.name}
                onChange={(event) => setName(event.target.value)}
                aria-label={localize('com_ui_report_name')}
                placeholder={localize('com_ui_report_name')}
                className={fieldClass}
              />
              <input
                type="email"
                value={email}
                maxLength={FEEDBACK_REPORT_LIMITS.email}
                onChange={(event) => setEmail(event.target.value)}
                aria-label={localize('com_ui_report_email')}
                placeholder={localize('com_ui_report_email')}
                className={fieldClass}
              />
            </div>
            <p className="text-xs text-text-secondary">{localize('com_ui_report_attached')}</p>
            {submit.isError && (
              <p className="text-sm text-red-600" role="alert">
                {localize('com_ui_report_error')}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>
                {localize('com_ui_cancel')}
              </Button>
              <Button type="submit" variant="submit" disabled={!message.trim() || submit.isLoading}>
                {localize('com_ui_report_send')}
              </Button>
            </div>
          </form>
        )}
      </OGDialogContent>
    </OGDialog>
  );
}
