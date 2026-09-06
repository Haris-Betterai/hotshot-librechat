import { useState } from 'react';
import { SystemRoles } from 'librechat-data-provider';
import { useAgentLearning, useUpdateAgentLearning } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';

const ruleLabels = {
  introductions: 'com_ui_learning_introductions',
  questions: 'com_ui_learning_questions',
  brevity: 'com_ui_learning_brevity',
} as const;

export default function Reviews({ agentId }: { agentId?: string }) {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === SystemRoles.ADMIN;
  const query = useAgentLearning(agentId ?? '', open && isAdmin);
  const mutation = useUpdateAgentLearning(agentId ?? '');
  const report = query.data;
  if (!agentId || !isAdmin) {
    return null;
  }
  const buttonClass =
    'rounded-lg border border-border-light px-3 py-2 text-sm hover:bg-surface-secondary disabled:opacity-50';
  return (
    <details
      className="mb-3 rounded-lg border border-border-light p-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        {localize('com_ui_learning_title')}
      </summary>
      <div className="mt-3 space-y-3 text-xs">
        <p className="text-text-secondary">{localize('com_ui_learning_description')}</p>
        {query.isLoading && <p role="status">{localize('com_ui_loading')}</p>}
        {(query.isError || mutation.isError || report?.lastError) && (
          <p role="alert">{localize('com_ui_learning_error')}</p>
        )}
        {report && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={report.enabled}
                disabled={mutation.isLoading}
                onChange={(event) => mutation.mutate(event.target.checked ? 'enable' : 'disable')}
              />
              {localize('com_ui_learning_auto')}
            </label>
            <p>{localize('com_ui_learning_limits')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass}
                disabled={mutation.isLoading}
                onClick={() => mutation.mutate('review')}
              >
                {mutation.isLoading
                  ? localize('com_ui_loading')
                  : localize('com_ui_learning_review')}
              </button>
              {!!report.changes.length && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={mutation.isLoading}
                  onClick={() => mutation.mutate('rollback')}
                >
                  {localize('com_ui_learning_rollback')}
                </button>
              )}
            </div>
            {report.lastRun && (
              <p>
                {localize('com_ui_learning_last_run')} {new Date(report.lastRun).toLocaleString()}
              </p>
            )}
            <p className="font-medium">{localize('com_ui_learning_active')}</p>
            {report.enabled && report.rules.length ? (
              <ul className="list-disc space-y-1 pl-4">
                {report.rules.map((rule) => (
                  <li key={rule}>{localize(ruleLabels[rule])}</li>
                ))}
              </ul>
            ) : (
              <p>{localize('com_ui_learning_no_changes')}</p>
            )}
            <p className="font-medium">{localize('com_ui_learning_reviews')}</p>
            {!report.reviews.length && <p>{localize('com_ui_learning_empty')}</p>}
            {report.reviews.map((review) => (
              <details
                key={review.conversationId}
                className="rounded border border-border-light p-2"
              >
                <summary className="cursor-pointer">
                  {review.request || localize('com_ui_learning_chat')}
                </summary>
                <div className="mt-2 space-y-2">
                  <p>
                    {localize('com_ui_learning_response')}{' '}
                    {review.response || localize('com_ui_learning_no_response')}
                  </p>
                  <p>
                    {localize('com_ui_learning_counts', {
                      replies: review.replyCount,
                      tools: review.toolCalls,
                      errors: review.failedReplies,
                      feedback: review.negativeFeedback,
                    })}
                  </p>
                  {review.issues.length ? (
                    <ul className="list-disc pl-4">
                      {review.issues.map((rule) => (
                        <li key={rule}>{localize(ruleLabels[rule])}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{localize('com_ui_learning_no_issues')}</p>
                  )}
                </div>
              </details>
            ))}
            {!!report.changes.length && (
              <details>
                <summary className="cursor-pointer font-medium">
                  {localize('com_ui_learning_history')}
                </summary>
                {report.changes.map((change) => (
                  <p key={change.at} className="mt-2">
                    {new Date(change.at).toLocaleString()} —{' '}
                    {change.rules.map((rule) => localize(ruleLabels[rule])).join(', ')} (
                    {change.evidenceCount})
                  </p>
                ))}
              </details>
            )}
          </>
        )}
      </div>
    </details>
  );
}
