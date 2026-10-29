import React, { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import * as Dialog from '@radix-ui/react-dialog';
import { Code2, Sparkles, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { TGenUiResult, TGenUiCatalogEntry } from 'librechat-data-provider';
import { Bars, choiceLabel, percent } from './Decision';
import { useGenUiCatalogQuery } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import { devModeAtom } from '~/store/devMode';
import { cn } from '~/utils';

/**
 * Developer view. Staff can always open it; guests turn it on by visiting with `?dev=1`
 * (remembered in this browser until they switch it off).
 */
export function useDevMode() {
  const [enabled, setEnabled] = useAtom(devModeAtom);
  const { user } = useAuthContext();
  const isStaff = user != null && user.provider !== 'anonymous';

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('dev') === '1') {
      setEnabled(true);
    }
  }, [setEnabled]);

  return { enabled, setEnabled, available: isStaff || enabled };
}

type Row = { messageId: string; result: TGenUiResult };

/** Decisions already loaded in this tab, newest last. */
function useLoadedDecisions(active: boolean): Row[] {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const read = () =>
      setRows(
        queryClient
          .getQueryCache()
          .findAll(['genUi'])
          .map((query) => ({
            messageId: String(query.queryKey[1]),
            result: query.state.data as TGenUiResult | undefined,
          }))
          .filter((row): row is Row => row.result?.decision != null),
      );
    read();
    return queryClient.getQueryCache().subscribe(read);
  }, [active, queryClient]);

  return rows;
}

const KIND_STYLE: Record<TGenUiCatalogEntry['kind'], string> = {
  'built-in': 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  saved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  special: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
};

function Cards({ active }: { active: boolean }) {
  const localize = useLocalize();
  const { data, isLoading } = useGenUiCatalogQuery(active);
  if (isLoading || !data) {
    return <p className="text-xs text-text-secondary">{localize('com_ui_loading')}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-surface-secondary p-3 text-xs">
        <dt className="text-text-secondary">{localize('com_ui_dev_decision_model')}</dt>
        <dd className="font-mono">{data.decisionModel}</dd>
        <dt className="text-text-secondary">{localize('com_ui_dev_author_model')}</dt>
        <dd className="font-mono">{data.authorModel}</dd>
        <dt className="text-text-secondary">{localize('com_ui_dev_thresholds')}</dt>
        <dd className="font-mono">
          {localize('com_ui_dev_threshold_values', { 0: data.minConfidence, 1: data.minNewWorth })}
        </dd>
      </dl>
      <ul className="flex flex-col gap-2">
        {data.entries.map((entry) => (
          <li key={entry.value} className="rounded-xl border border-border-light p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize text-text-primary">{entry.name}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                  KIND_STYLE[entry.kind],
                )}
              >
                {entry.kind}
              </span>
              {entry.uses != null && (
                <span className="ml-auto text-[11px] text-text-secondary">
                  {localize('com_ui_dev_uses', { 0: entry.uses })}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-text-secondary">{entry.description}</p>
            <p className="mt-1 font-mono text-[10px] text-text-tertiary">
              {entry.value}
              {entry.authorModel ? ` · ${entry.authorModel}` : ''}
              {entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleString()}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Decisions({ active }: { active: boolean }) {
  const localize = useLocalize();
  const rows = useLoadedDecisions(active);
  if (rows.length === 0) {
    return <p className="text-xs text-text-secondary">{localize('com_ui_dev_no_decisions')}</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {rows.map(({ messageId, result }) => {
        const decision = result.decision!;
        return (
          <li key={messageId} className="rounded-xl border border-border-light p-3">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(messageId)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
              className="mb-2 flex w-full flex-wrap items-center gap-x-2 text-left text-xs"
            >
              <span className="font-mono font-semibold text-text-primary">
                {choiceLabel(decision.choice)}
              </span>
              <span className="font-mono text-text-secondary">{percent(decision.confidence)}</span>
              <span className="text-text-secondary">· {decision.outcome}</span>
              {decision.decideMs != null && (
                <span className="ml-auto font-mono text-[11px] text-text-tertiary">
                  {localize('com_ui_dev_ms', { 0: decision.decideMs })}
                </span>
              )}
            </button>
            {decision.options.length > 0 && (
              <Bars options={decision.options} choice={decision.choice} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type Tab = 'decisions' | 'cards';

/** A floating "Developer" button on the left that opens the decisions and card catalog. */
export default function Developer() {
  const localize = useLocalize();
  const { enabled, setEnabled, available } = useDevMode();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('decisions');

  if (!available) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      <Dialog.Trigger
        className="bg-surface-primary/90 absolute bottom-4 left-4 z-30 hidden items-center gap-1.5 rounded-full border border-border-light px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm backdrop-blur transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:flex"
        aria-label={localize('com_ui_dev_open')}
      >
        <Code2 className="size-3.5" aria-hidden="true" />
        {localize('com_ui_dev_title')}
        {enabled && <span className="size-1.5 rounded-full bg-blue-500" aria-hidden="true" />}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          onInteractOutside={(event) => event.preventDefault()}
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-[60] flex w-[min(92vw,26rem)] flex-col border-r border-border-light bg-surface-primary text-text-primary shadow-2xl data-[state=open]:duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <div className="flex items-center gap-2 border-b border-border-light px-4 py-3">
            <Code2 className="size-4 text-blue-500" aria-hidden="true" />
            <Dialog.Title className="text-sm font-semibold">
              {localize('com_ui_dev_title')}
            </Dialog.Title>
            <Dialog.Close
              aria-label={localize('com_ui_close')}
              className="ml-auto rounded-full p-1.5 text-text-secondary transition hover:bg-surface-hover"
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <label className="flex cursor-pointer items-center gap-3 border-b border-border-light px-4 py-3 text-xs">
            <Sparkles className="size-3.5 text-text-secondary" aria-hidden="true" />
            <span className="flex-1">{localize('com_ui_dev_show_inline')}</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="size-4 accent-blue-600"
            />
          </label>

          <div role="tablist" className="flex gap-1 px-4 pt-3">
            {(['decisions', 'cards'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  tab === value
                    ? 'bg-text-primary text-surface-primary'
                    : 'text-text-secondary hover:bg-surface-hover',
                )}
              >
                {localize(
                  value === 'decisions' ? 'com_ui_dev_tab_decisions' : 'com_ui_dev_tab_cards',
                )}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {tab === 'decisions' ? <Decisions active={open} /> : <Cards active={open} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
