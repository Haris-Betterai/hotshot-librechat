import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Input } from '@librechat/client';
import {
  getDefaultIntelligenceIndex,
  getIntelligenceOptions,
  intelligenceEfforts,
  isIntelligenceEffort,
  MAX_INTELLIGENCE_LEVELS,
} from 'librechat-data-provider';
import type { IntelligenceLevel, IntelligenceOption } from 'librechat-data-provider';
import { useGetModelsQuery } from 'librechat-data-provider/react-query';
import type { AgentForm } from '~/common';
import { useLocalize } from '~/hooks';

const emptyLevel: IntelligenceOption = { label: '', model: '' };
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
  const configuredLevels = intelligence?.levels ?? [];
  const options = getIntelligenceOptions(
    intelligence,
    typeof providerValue === 'string' ? providerValue : undefined,
  );
  const levels: IntelligenceOption[] =
    options.length > configuredLevels.length ? options : configuredLevels;
  const visibleLevels = levels.length > 0 ? levels : [emptyLevel];
  const editableLevels = visibleLevels.map(({ label, model, reasoning_effort }) => ({
    label,
    model,
    reasoning_effort,
  }));
  const defaultIndex = getDefaultIntelligenceIndex(visibleLevels, intelligence?.default_level);
  const defaultLabel = visibleLevels[defaultIndex]?.label ?? '';

  const setIntelligence = (nextLevels: IntelligenceLevel[], defaultLevel?: string) => {
    setValue(
      'intelligence',
      {
        heading: intelligence?.heading ?? '',
        levels: nextLevels,
        ...(defaultLevel ? { default_level: defaultLevel } : {}),
      },
      { shouldDirty: true },
    );
  };

  const updateLevel = (
    index: number,
    field: 'label' | 'model' | 'reasoning_effort',
    value: string,
  ) => {
    const next = editableLevels.map((level) => ({ ...level }));
    const previousLabel = next[index].label;
    if (field === 'reasoning_effort') {
      next[index].reasoning_effort = isIntelligenceEffort(value) ? value : undefined;
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    const shouldPreserveDefault =
      field === 'label' &&
      (previousLabel === intelligence?.default_level ||
        (!intelligence?.default_level && index === defaultIndex));
    setIntelligence(next, shouldPreserveDefault ? value : intelligence?.default_level);
  };

  const addLevel = () => {
    if (visibleLevels.length >= MAX_INTELLIGENCE_LEVELS) {
      return;
    }
    setIntelligence([...editableLevels, { ...emptyLevel }], intelligence?.default_level);
  };

  const removeLevel = (index: number) => {
    const removed = editableLevels[index];
    const next = editableLevels.filter((_, levelIndex) => levelIndex !== index);
    const nextDefault =
      removed.label === intelligence?.default_level
        ? next[getDefaultIntelligenceIndex(next)]?.label
        : intelligence?.default_level;
    setIntelligence(next, nextDefault);
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
                  ...intelligence,
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
      <label className="flex items-center justify-between gap-3 text-xs text-text-secondary">
        {localize('com_ui_intelligence_default_level')}
        <select
          className="h-9 min-w-40 rounded-md border border-border-medium bg-surface-primary px-2 text-sm text-text-primary"
          aria-label={localize('com_ui_intelligence_default_level')}
          value={
            visibleLevels[defaultIndex]?.label && visibleLevels[defaultIndex]?.model
              ? defaultLabel
              : ''
          }
          onChange={(event) => setIntelligence(editableLevels, event.target.value)}
        >
          <option value="" disabled>
            {localize('com_ui_intelligence_select_default')}
          </option>
          {visibleLevels.map((level, index) =>
            level.label && level.model ? (
              <option key={`${level.label}-${index}`} value={level.label}>
                {level.label}
              </option>
            ) : null,
          )}
        </select>
      </label>
      {visibleLevels.map((level, slot) => (
        <div
          key={slot}
          className="grid grid-cols-2 gap-2 rounded-lg border border-border-light p-3"
        >
          <div className="col-span-2">
            <p className="text-sm font-medium">
              {level.preset
                ? localize(presetLabels[level.preset])
                : level.label || localize('com_ui_intelligence_level_number', { number: slot + 1 })}
            </p>
            {level.preset && (
              <p className="mt-1 text-xs text-text-secondary">
                {localize(purposeLabels[level.preset])}
              </p>
            )}
            {visibleLevels.length > 1 ? (
              <button
                type="button"
                className="mt-2 text-xs text-text-secondary hover:text-text-primary"
                aria-label={`${localize('com_ui_intelligence_remove_level')} ${slot + 1}`}
                onClick={() => removeLevel(slot)}
              >
                {localize('com_ui_intelligence_remove_level')}
              </button>
            ) : null}
          </div>
          <Input
            className="h-9"
            value={level.label}
            placeholder={localize('com_ui_intelligence_label_placeholder')}
            aria-label={localize('com_ui_intelligence_label_placeholder')}
            onChange={(event) => updateLevel(slot, 'label', event.target.value)}
          />
          <select
            className="h-9 rounded-md border border-border-medium bg-surface-primary px-2 text-sm"
            value={level.model}
            aria-label={localize('com_ui_model')}
            onChange={(event) => updateLevel(slot, 'model', event.target.value)}
          >
            <option value="">{localize('com_ui_select_model')}</option>
            {models.map((modelName) => (
              <option key={modelName} value={modelName}>
                {modelName}
              </option>
            ))}
            {level.model && !models.includes(level.model) ? (
              <option value={level.model}>{level.model}</option>
            ) : null}
          </select>
          <label className="col-span-2 flex items-center justify-between gap-2 text-xs text-text-secondary">
            {localize('com_ui_intelligence_effort')}
            <select
              className="h-9 rounded-md border border-border-medium bg-surface-primary px-2 text-sm"
              aria-label={`${localize('com_ui_intelligence_effort')} ${slot + 1}`}
              value={level.reasoning_effort ?? ''}
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
      <button
        type="button"
        className="h-9 rounded-md border border-border-medium px-3 text-sm text-text-primary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
        disabled={visibleLevels.length >= MAX_INTELLIGENCE_LEVELS}
        onClick={addLevel}
      >
        {localize('com_ui_intelligence_add_level')} ({visibleLevels.length}/
        {MAX_INTELLIGENCE_LEVELS})
      </button>
    </div>
  );
}
