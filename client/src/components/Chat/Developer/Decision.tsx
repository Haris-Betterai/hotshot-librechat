import React, { useState } from 'react';
import { ChevronDown, Cpu } from 'lucide-react';
import type { TGenUiResult } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const MAX_OPTIONS = 8;

export const percent = (value?: number) => (value == null ? '–' : `${Math.round(value * 100)}%`);

/** `block:comparison` → `comparison`, `saved:winter_plan` → `winter_plan`. */
export const choiceLabel = (value: string) => value.replace(/^(block|saved):/, '');

export function Bars({
  options,
  choice,
}: {
  options: Array<{ value: string; probability: number }>;
  choice: string;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {options.slice(0, MAX_OPTIONS).map((option) => (
        <li
          key={option.value}
          className="grid grid-cols-[minmax(0,10rem)_1fr_2.75rem] items-center gap-2"
        >
          <span
            className={cn(
              'truncate font-mono text-[11px]',
              option.value === choice ? 'font-semibold text-text-primary' : 'text-text-secondary',
            )}
            title={option.value}
          >
            {option.value}
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
            <span
              className={cn(
                'block h-full rounded-full transition-[width] duration-500',
                option.value === choice ? 'bg-blue-500' : 'bg-neutral-400 dark:bg-neutral-500',
              )}
              style={{ width: `${Math.max(2, option.probability * 100)}%` }}
            />
          </span>
          <span className="text-right font-mono text-[11px] text-text-secondary">
            {percent(option.probability)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The Decisions API's answer for one message, shown to developers under the reply. */
export default function Decision({ result }: { result?: TGenUiResult }) {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const decision = result?.decision;

  if (!result || (result.status === 'pending' && !decision)) {
    return (
      <p className="mb-2 flex items-center gap-1.5 text-[11px] text-text-tertiary">
        <Cpu className="size-3 animate-pulse" aria-hidden="true" />
        {localize('com_ui_dev_deciding')}
      </p>
    );
  }
  if (!decision) {
    return null;
  }

  return (
    <div className="mb-2 max-w-2xl rounded-xl border border-dashed border-border-medium text-[11px] text-text-secondary duration-300 animate-in fade-in-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-1.5 text-left"
      >
        <Cpu className="size-3 shrink-0 text-blue-500" aria-hidden="true" />
        <span className="font-medium text-text-primary">
          {localize('com_ui_dev_decisions_api')}
        </span>
        <span className="font-mono">{decision.model}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono text-text-primary">{choiceLabel(decision.choice)}</span>
        <span className="font-mono">{percent(decision.confidence)}</span>
        <span aria-hidden="true">·</span>
        <span>{decision.outcome}</span>
        {decision.decideMs != null && (
          <span className="font-mono">{localize('com_ui_dev_ms', { 0: decision.decideMs })}</span>
        )}
        <ChevronDown
          className={cn('ml-auto size-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-dashed border-border-medium px-3 py-2 duration-200 animate-in fade-in-0 slide-in-from-top-1">
          {decision.options.length > 0 && (
            <Bars options={decision.options} choice={decision.choice} />
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt>{localize('com_ui_dev_worth')}</dt>
            <dd className="font-mono">{percent(decision.worth)}</dd>
            <dt>{localize('com_ui_dev_shown')}</dt>
            <dd className="font-mono">{result.status === 'ready' ? result.choice : 'nothing'}</dd>
            {decision.buildModel && (
              <>
                <dt>{localize('com_ui_dev_built_with')}</dt>
                <dd className="font-mono">
                  {localize('com_ui_dev_built_line', {
                    0: decision.buildModel,
                    1: decision.buildMs ?? 0,
                  })}
                </dd>
              </>
            )}
            {result.error && (
              <>
                <dt>{localize('com_ui_error')}</dt>
                <dd className="font-mono text-red-600 dark:text-red-400">{result.error}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
