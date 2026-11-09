import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import FeedbackDialog from './FeedbackDialog';
import { useLocalize } from '~/hooks';

/** Vertical "Feedback" tab on the right edge of the public chat. */
export default function FeedbackTab() {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={localize('com_ui_report_title')}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg bg-text-primary px-2 py-3 text-xs font-semibold text-surface-primary shadow-lg [writing-mode:vertical-rl] hover:opacity-90"
      >
        <MessageSquareText className="size-4 rotate-90" aria-hidden="true" />
        {localize('com_ui_report_tab')}
      </button>
      <FeedbackDialog open={open} onOpenChange={setOpen} source="chat" />
    </>
  );
}
