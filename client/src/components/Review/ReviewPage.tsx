import { useState } from 'react';
import { Download, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button, Spinner } from '@librechat/client';
import { SystemRoles, dataService } from 'librechat-data-provider';
import type { FeedbackReport, LoggedQuestion } from 'librechat-data-provider';
import { useFeedbackReportsQuery, useLoggedQuestionsQuery } from '~/data-provider';
import { KIND_LABELS } from '~/components/Feedback/FeedbackDialog';
import { downloadCsv, fetchAll, toCsv } from './csv';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type Tab = 'questions' | 'feedback';

const when = (iso: string) => new Date(iso).toLocaleString();
const stamp = () => new Date().toISOString().slice(0, 10);

function QuestionRow({ item }: { item: LoggedQuestion }) {
  const localize = useLocalize();
  return (
    <li className="flex flex-col gap-2 border-b border-border-light py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
        <span>{when(item.createdAt)}</span>
        <span>{item.userLabel}</span>
        {item.rating === 'thumbsUp' && (
          <ThumbsUp
            className="size-3.5 text-green-600"
            aria-label={localize('com_ui_review_rated_up')}
          />
        )}
        {item.rating === 'thumbsDown' && (
          <ThumbsDown
            className="size-3.5 text-red-600"
            aria-label={localize('com_ui_review_rated_down')}
          />
        )}
        <span className="font-mono">{item.conversationId.slice(0, 8)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm font-semibold text-text-primary">{item.question}</p>
      <details className="text-sm text-text-secondary">
        <summary className="cursor-pointer select-none">{localize('com_ui_review_answer')}</summary>
        <p className="mt-1 whitespace-pre-wrap">{item.answer || '—'}</p>
      </details>
      {item.ratingText && <p className="text-xs italic text-text-secondary">“{item.ratingText}”</p>}
    </li>
  );
}

function FeedbackRow({ item }: { item: FeedbackReport }) {
  const localize = useLocalize();
  return (
    <li className="flex flex-col gap-2 border-b border-border-light py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
        <span className="rounded-full bg-surface-secondary px-2 py-0.5 font-medium text-text-primary">
          {localize(KIND_LABELS[item.kind])}
        </span>
        <span>{when(item.createdAt)}</span>
        <span>{item.name || item.userLabel}</span>
        {item.email && <span>{item.email}</span>}
        <span>
          {item.source === 'widget'
            ? localize('com_ui_review_widget')
            : localize('com_ui_review_chat')}
        </span>
        {item.conversationId && (
          <span className="font-mono">{item.conversationId.slice(0, 8)}</span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-text-primary">{item.message}</p>
    </li>
  );
}

export default function ReviewPage() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const isAdmin = user?.role === SystemRoles.ADMIN;
  const [tab, setTab] = useState<Tab>('questions');
  const [exporting, setExporting] = useState(false);
  const questions = useLoggedQuestionsQuery(isAdmin && tab === 'questions');
  const feedback = useFeedbackReportsQuery(isAdmin && tab === 'feedback');
  const active = tab === 'questions' ? questions : feedback;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-text-secondary">
        {localize('com_ui_review_admin_only')}
      </div>
    );
  }

  const exportCsv = async () => {
    setExporting(true);
    try {
      if (tab === 'questions') {
        const rows = await fetchAll(dataService.listLoggedQuestions);
        downloadCsv(
          `hotshot-questions-${stamp()}.csv`,
          toCsv(rows, [
            ['Asked at', (row) => row.createdAt],
            ['Who', (row) => row.userLabel],
            ['Question', (row) => row.question],
            ['Answer', (row) => row.answer],
            ['Rating', (row) => row.rating ?? ''],
            ['Rating comment', (row) => row.ratingText ?? ''],
            ['Conversation', (row) => row.conversationId],
          ]),
        );
        return;
      }
      const rows = await fetchAll(dataService.listFeedbackReports);
      downloadCsv(
        `hotshot-feedback-${stamp()}.csv`,
        toCsv(rows, [
          ['Sent at', (row) => row.createdAt],
          ['Type', (row) => row.kind],
          ['Message', (row) => row.message],
          ['Name', (row) => row.name ?? ''],
          ['Email', (row) => row.email ?? ''],
          ['Who', (row) => row.userLabel],
          ['From', (row) => row.source],
          ['Conversation', (row) => row.conversationId ?? ''],
          ['Page', (row) => row.page ?? ''],
        ]),
      );
    } finally {
      setExporting(false);
    }
  };

  const questionItems = questions.data?.pages.flatMap((page) => page.items) ?? [];
  const feedbackItems = feedback.data?.pages.flatMap((page) => page.items) ?? [];
  const empty = tab === 'questions' ? !questionItems.length : !feedbackItems.length;

  return (
    <main className="h-full overflow-y-auto bg-surface-primary">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text-primary">
            {localize('com_ui_review_title')}
          </h1>
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            <Download className="mr-2 size-4" aria-hidden="true" />
            {localize('com_ui_review_export')}
          </Button>
        </div>
        <div role="tablist" className="flex gap-1 border-b border-border-light">
          {(['questions', 'feedback'] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
                tab === name
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {localize(
                name === 'questions' ? 'com_ui_review_questions' : 'com_ui_review_feedback',
              )}
            </button>
          ))}
        </div>
        {active.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner className="text-text-primary" />
          </div>
        )}
        {active.isError && (
          <p className="text-sm text-red-600" role="alert">
            {localize('com_ui_review_error')}
          </p>
        )}
        {!active.isLoading && !active.isError && empty && (
          <p className="py-10 text-center text-sm text-text-secondary">
            {localize('com_ui_review_empty')}
          </p>
        )}
        <ul>
          {tab === 'questions'
            ? questionItems.map((item) => <QuestionRow key={item.messageId} item={item} />)
            : feedbackItems.map((item) => <FeedbackRow key={item.id} item={item} />)}
        </ul>
        {active.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => active.fetchNextPage()}
              disabled={active.isFetchingNextPage}
            >
              {localize('com_ui_review_load_more')}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
