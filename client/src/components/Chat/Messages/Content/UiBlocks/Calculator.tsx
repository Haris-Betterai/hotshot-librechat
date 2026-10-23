import React, { useId, useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { calculateDose } from 'librechat-data-provider';
import type { TUiDoseCalculator } from 'librechat-data-provider';
import { CARD_CLASS, FIELD_CLASS, LINK_CLASS } from './shared';
import type { TranslationKeys } from '~/hooks/useLocalize';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const UNIT_KEYS: Record<TUiDoseCalculator['ratio']['perUnit'], TranslationKeys> = {
  quart: 'com_ui_block_unit_quart',
  gallon: 'com_ui_block_unit_gallon',
  liter: 'com_ui_block_unit_liter',
};

const MAX_CAPACITY = 100000;
const CONFIRM_MS = 900;

const parseCapacity = (value: string): number | null => {
  const num = Number(value);
  return value.trim() !== '' && Number.isFinite(num) && num > 0 && num < MAX_CAPACITY ? num : null;
};

export default function Calculator({ block }: { block: TUiDoseCalculator }) {
  const localize = useLocalize();
  const inputId = useId();
  const { ratio } = block;
  const [value, setValue] = useState(block.capacity != null ? String(block.capacity) : '');
  const capacity = parseCapacity(value);
  const unit = localize(UNIT_KEYS[ratio.perUnit]);
  const perLabel = ratio.per === 1 ? unit : `${ratio.per} ${unit}`;
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!confirmed) {
      return;
    }
    const timer = setTimeout(() => setConfirmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirmed]);

  /** The dose updates as you type; Enter just confirms it so the key never feels dead. */
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    event.currentTarget.blur();
    setConfirmed(capacity !== null);
  };

  return (
    <div className={CARD_CLASS}>
      <div className="mb-3 font-semibold">
        {block.url ? (
          <a href={block.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {block.product}
          </a>
        ) : (
          block.product
        )}
      </div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-xs text-neutral-500 dark:text-neutral-400">
          {block.capacityLabel ?? localize('com_ui_block_capacity')}
        </label>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {localize('com_ui_block_capacity_live')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={capacity === null && value.trim() !== ''}
          className={cn(FIELD_CLASS, 'max-w-[8rem]')}
        />
        <span className="text-neutral-600 dark:text-neutral-400">{unit}</span>
      </div>
      <div
        data-confirmed={confirmed || undefined}
        className={cn(
          'mt-3 rounded-xl bg-neutral-50 p-3 ring-2 ring-transparent transition-[box-shadow,background-color] duration-300 dark:bg-neutral-800',
          confirmed && 'bg-blue-50 ring-blue-500/40 dark:bg-blue-950/40',
        )}
        aria-live="polite"
      >
        {capacity === null ? (
          <p className="text-neutral-500 dark:text-neutral-400">
            {localize(
              value.trim() === ''
                ? 'com_ui_block_capacity_prompt'
                : 'com_ui_block_capacity_invalid',
            )}
          </p>
        ) : (
          <>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {localize('com_ui_block_dose_result')}
            </div>
            <div className="text-2xl font-semibold">
              {calculateDose(ratio, capacity)} {ratio.unit}
            </div>
            <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {localize('com_ui_block_dose_math', {
                0: `${capacity} ${unit}`,
                1: `${ratio.amount} ${ratio.unit}`,
                2: perLabel,
              })}
            </div>
          </>
        )}
      </div>
      {block.note && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{block.note}</p>
      )}
    </div>
  );
}
