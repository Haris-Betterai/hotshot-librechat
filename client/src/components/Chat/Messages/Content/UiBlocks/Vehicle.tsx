import React, { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import type { TUiVehicleField, TUiVehiclePicker } from 'librechat-data-provider';
import { CARD_CLASS, FIELD_CLASS, SendGate, usePrimaryButton } from './shared';
import type { TranslationKeys } from '~/hooks/useLocalize';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const MIN_YEAR = 1980;

const FIELD_KEYS: Record<TUiVehicleField, { label: TranslationKeys; hint: TranslationKeys }> = {
  year: { label: 'com_ui_block_year', hint: 'com_ui_block_year_hint' },
  make: { label: 'com_ui_block_make', hint: 'com_ui_block_make_hint' },
  model: { label: 'com_ui_block_model', hint: 'com_ui_block_model_hint' },
  engine: { label: 'com_ui_block_engine', hint: 'com_ui_block_engine_hint' },
};

type Values = Record<TUiVehicleField, string>;

const EMPTY: Values = { year: '', make: '', model: '', engine: '' };

const isValidYear = (value: string, maxYear: number): boolean => {
  const year = Number(value);
  return Number.isInteger(year) && year >= MIN_YEAR && year <= maxYear;
};

export const buildVehicleMessage = (values: Values, fields: TUiVehicleField[]): string => {
  const vehicle = (['year', 'make', 'model'] as const)
    .filter((field) => fields.includes(field))
    .map((field) => values[field].trim())
    .join(' ');
  const engine = fields.includes('engine') ? values.engine.trim() : '';
  return [vehicle, engine].filter(Boolean).join(', ');
};

export default function Vehicle({ block }: { block: TUiVehiclePicker }) {
  const localize = useLocalize();
  const primary = usePrimaryButton();
  const baseId = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [sent, setSent] = useState(false);
  const maxYear = new Date().getFullYear() + 1;

  const complete = block.fields.every((field) =>
    field === 'year' ? isValidYear(values.year, maxYear) : values[field].trim() !== '',
  );

  return (
    <SendGate>
      {(send, enabled) => {
        const active = enabled && !sent && send !== undefined;
        const onSubmit = (event: FormEvent) => {
          event.preventDefault();
          if (!active || !complete) {
            return;
          }
          setSent(true);
          send(buildVehicleMessage(values, block.fields));
        };
        /** Enter on an unfinished form moves to the next empty field instead of doing nothing. */
        const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
          if (event.key !== 'Enter' || complete || !(event.target instanceof HTMLInputElement)) {
            return;
          }
          event.preventDefault();
          const next = block.fields.find((field) =>
            field === 'year' ? !isValidYear(values.year, maxYear) : values[field].trim() === '',
          );
          if (next) {
            document.getElementById(`${baseId}-${next}`)?.focus();
          }
        };
        return (
          <form
            onSubmit={onSubmit}
            onKeyDown={onKeyDown}
            className={CARD_CLASS}
            aria-label={localize('com_ui_block_vehicle')}
          >
            <p className="mb-3 font-medium">{block.prompt ?? localize('com_ui_block_vehicle')}</p>
            <div className="grid grid-cols-2 gap-2">
              {block.fields.map((field) => (
                <div
                  key={field}
                  className={cn(
                    field === 'engine' && 'col-span-2',
                    field === 'year' && 'col-span-1',
                  )}
                >
                  <label
                    htmlFor={`${baseId}-${field}`}
                    className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400"
                  >
                    {localize(FIELD_KEYS[field].label)}
                  </label>
                  <input
                    id={`${baseId}-${field}`}
                    type={field === 'year' ? 'number' : 'text'}
                    inputMode={field === 'year' ? 'numeric' : undefined}
                    min={field === 'year' ? MIN_YEAR : undefined}
                    max={field === 'year' ? maxYear : undefined}
                    value={values[field]}
                    disabled={!active}
                    placeholder={localize(FIELD_KEYS[field].hint)}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [field]: event.target.value }))
                    }
                    className={FIELD_CLASS}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!active || !complete}
                className={primary.className}
                style={primary.style}
              >
                {localize('com_ui_block_send')}
                <Send className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </form>
        );
      }}
    </SendGate>
  );
}
