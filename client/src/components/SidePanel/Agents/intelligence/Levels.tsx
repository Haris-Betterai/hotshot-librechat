import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Input } from '@librechat/client';
import {
  getIntelligenceOptions,
  intelligenceEfforts,
  isIntelligenceEffort,
  MAX_INTELLIGENCE_LEVELS,
} from 'librechat-data-provider';
import type { IntelligenceLevel } from 'librechat-data-provider';
import { useGetModelsQuery } from 'librechat-data-provider/react-query';
import type { AgentForm } from '~/common';
import { useLocalize } from '~/hooks';

const SLOTS = Array.from({ length: MAX_INTELLIGENCE_LEVELS }, (_, index) => index);
const presetLabels = {
  fast: 'com_ui_intelligence_fast',
  balanced: 'com_ui_intelligence_balanced',
  deep: 'com_ui_intelligence_deep',
  deeper: 'com_ui_intelligence_deeper',
  deepest: 'com_ui_intelligence_deepest',
} as const;
const purposeLabels = {
  fast: 'com_ui_intelligence_fast_purpose',
  balanced: 'com_ui_intelligence_balanced_purpose',
  deep: 'com_ui_intelligence_deep_purpose',
  deeper: 'com_ui_intelligence_deeper_purpose',
  deepest: 'com_ui_intelligence_deepest_purpose',
} as const;
const effortLabels = {
  none: 'com_ui_none',
  low: 'com_ui_low',
  medium: 'com_ui_medium',
  high: 'com_ui_high',
  xhigh: 'com_ui_xhigh',
  max: 'com_ui_max',
} as const;

export default function Levels() {
  const localize = useLocalize();
  const { control, setValue } = useFormContext<AgentForm>();
  const provider = useWatch({ control, name: 'provider' });
  const intelligence = useWatch({ control, name: 'intelligence' });
  const { data: modelsConfig } = useGetModelsQuery();

  const providerValue = typeof provider === 'string' ? provider : provider?.value;
  const models = (providerValue ? modelsConfig?.[providerValue] : undefined) ?? [];
  const levels = getIntelligenceOptions(
    intelligence,
    typeof providerValue === 'string' ? providerValue : undefined,
  );

  const updateLevel = (
    index: number,
    field: 'label' | 'model' | 'reasoning_effort',
    value: string,
  ) => {
    const next: IntelligenceLevel[] = SLOTS.map((slot) => ({
      label: levels[slot]?.label ?? '',
      model: levels[slot]?.model ?? '',
      reasoning_effort: levels[slot]?.reasoning_effort,
    }));
    if (field === 'reasoning_effort') {
      next[index].reasoning_effort = isIntelligenceEffort(value) ? value : undefined;
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    setValue(
      'intelligence',
      {
        heading: intelligence?.heading ?? '',
        levels: next,
      },
      { shouldDirty: true },
    );
  };

  return (
    <div className="mb-3 flex flex-col gap-2">
      <label className="text-token-text-primary text-sm" htmlFor="intelligence-heading">
        {localize('com_ui_intelligence_heading')}
      </label>
      <Controller
        name="intelligence.heading"
        control={control}
        render={({ field }) => (
          <Input
            id="intelligence-heading"
            {...field}
            value={field.value ?? ''}
            placeholder={localize('com_ui_intelligence_heading_placeholder')}
            className="h-9"
            onChange={(event) => {
              field.onChange(event);
              setValue(
                'intelligence',
                {
                  heading: event.target.value,
                  levels: intelligence?.levels ?? [],
                },
                { shouldDirty: true },
              );
            }}
          />
        )}
      />
      <p className="text-xs text-text-secondary">{localize('com_ui_intelligence_levels_hint')}</p>
      {SLOTS.map((slot) => (
        <div
          key={slot}
          className="grid grid-cols-2 gap-2 rounded-lg border border-border-light p-3"
        >
          <div className="col-span-2">
            <p className="text-sm font-medium">
              {levels[slot]?.preset
                ? localize(presetLabels[levels[slot].preset])
                : levels[slot]?.label ||
                  localize('com_ui_intelligence_level_number', { number: slot + 1 })}
            </p>
            {levels[slot]?.preset && (
              <p className="mt-1 text-xs text-text-secondary">
                {localize(purposeLabels[levels[slot].preset])}
              </p>
            )}
          </div>
          <Input
            className="h-9"
            value={levels[slot]?.label ?? ''}
            placeholder={localize('com_ui_intelligence_label_placeholder')}
            aria-label={localize('com_ui_intelligence_label_placeholder')}
            onChange={(event) => updateLevel(slot, 'label', event.target.value)}
          />
          <select
            className="h-9 rounded-md border border-border-medium bg-surface-primary px-2 text-sm"
            value={levels[slot]?.model ?? ''}
            aria-label={localize('com_ui_model')}
            onChange={(event) => updateLevel(slot, 'model', event.target.value)}
          >
            <option value="">{localize('com_ui_select_model')}</option>
            {models.map((modelName) => (
              <option key={modelName} value={modelName}>
                {modelName}
              </option>
            ))}
            {levels[slot]?.model && !models.includes(levels[slot].model) ? (
              <option value={levels[slot].model}>{levels[slot].model}</option>
            ) : null}
          </select>
          <label className="col-span-2 flex items-center justify-between gap-2 text-xs text-text-secondary">
            {localize('com_ui_intelligence_effort')}
            <select
              className="h-9 rounded-md border border-border-medium bg-surface-primary px-2 text-sm"
              aria-label={`${localize('com_ui_intelligence_effort')} ${slot + 1}`}
              value={levels[slot]?.reasoning_effort ?? ''}
              onChange={(event) => updateLevel(slot, 'reasoning_effort', event.target.value)}
            >
              <option value="">{localize('com_ui_default')}</option>
              {intelligenceEfforts.map((effort) => (
                <option key={effort} value={effort}>
                  {localize(effortLabels[effort])}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
    </div>
  );
}
