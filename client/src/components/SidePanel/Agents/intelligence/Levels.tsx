import { Input, TrashIcon } from '@librechat/client';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useGetModelsQuery } from 'librechat-data-provider/react-query';
import {
  seedAutoLevels,
  getDefaultIntelligenceIndex,
  getIntelligenceOptions,
  groupIntelligenceModels,
  normalizeReasoningEffort,
  getSupportedReasoningEfforts,
  isIntelligenceEffort,
  MAX_INTELLIGENCE_LEVELS,
} from 'librechat-data-provider';
import type {
  IntelligenceOption,
  IntelligenceLevel,
  IntelligenceAuto,
  IntelligenceEffort,
} from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { useLocalize } from '~/hooks';

type IntelligenceValue = NonNullable<AgentForm['intelligence']>;
type LevelField =
  | 'label'
  | 'model'
  | 'reasoning_effort'
  | 'description'
  | 'instructions'
  | 'recursion_limit';

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
const modelGroupLabels = {
  gpt6: 'GPT-6',
  gpt5: 'GPT-5',
  other: 'com_ui_intelligence_other_models',
} as const;

function optionalText(value: string): string | undefined {
  return value.trim() ? value : undefined;
}

function parseTriggers(value: string): string[] | undefined {
  const triggers = value
    .split(',')
    .map((trigger) => trigger.trim())
    .filter(Boolean);
  return triggers.length > 0 ? triggers : undefined;
}

function applyField(level: IntelligenceLevel, field: LevelField, value: string): IntelligenceLevel {
  if (field === 'reasoning_effort') {
    return { ...level, reasoning_effort: isIntelligenceEffort(value) ? value : undefined };
  }
  if (field === 'recursion_limit') {
    const limit = Number.parseInt(value, 10);
    return { ...level, recursion_limit: Number.isFinite(limit) && limit > 0 ? limit : undefined };
  }
  if (field === 'description') {
    return { ...level, description: optionalText(value) };
  }
  if (field === 'instructions') {
    return { ...level, instructions: optionalText(value) };
  }
  if (field === 'model') {
    const reasoning_effort = normalizeReasoningEffort(value, level.reasoning_effort);
    return { ...level, model: value, ...(reasoning_effort ? { reasoning_effort } : {}) };
  }
  return { ...level, label: value };
}

function effortOptions(level: IntelligenceLevel): IntelligenceEffort[] {
  const supported = getSupportedReasoningEfforts(level.model);
  const saved = level.reasoning_effort;
  return saved && !supported.includes(saved) ? [saved, ...supported] : supported;
}

function renameAuto(
  current: IntelligenceAuto | undefined,
  from: string,
  to: string,
): IntelligenceAuto | undefined {
  if (!current || !from) {
    return current;
  }
  return {
    ...current,
    base: current.base === from ? to : current.base,
    escalate: current.escalate === from ? to : current.escalate,
  };
}

/** Keeps Auto pointing at levels that still exist; drops it below two levels. */
function repairAuto(
  current: IntelligenceAuto | undefined,
  nextLevels: IntelligenceLevel[],
): IntelligenceAuto | undefined {
  if (!current) {
    return undefined;
  }
  const labels = nextLevels.map((level) => level.label).filter(Boolean);
  if (labels.length < 2) {
    return undefined;
  }
  return {
    ...current,
    base: labels.includes(current.base) ? current.base : labels[0],
    escalate: labels.includes(current.escalate) ? current.escalate : labels[labels.length - 1],
  };
}

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
  ).filter((option) => !option.auto);
  const levels: IntelligenceOption[] =
    options.length > configuredLevels.length ? options : configuredLevels;
  const visibleLevels = levels.length > 0 ? levels : [emptyLevel];
  const editableLevels: IntelligenceLevel[] = visibleLevels.map(
    ({ label, model, reasoning_effort, description, instructions, recursion_limit }) => ({
      label,
      model,
      ...(reasoning_effort ? { reasoning_effort } : {}),
      ...(description ? { description } : {}),
      ...(instructions ? { instructions } : {}),
      ...(recursion_limit ? { recursion_limit } : {}),
    }),
  );
  const usableLevels = visibleLevels.filter((level) => level.label && level.model);
  const defaultIndex = getDefaultIntelligenceIndex(visibleLevels, intelligence?.default_level);
  const defaultOption = visibleLevels[defaultIndex];
  const defaultLabel = defaultOption?.label ?? '';
  const auto = intelligence?.auto;
  const autoLabel = auto?.label ?? '';
  const autoIsDefault = autoLabel.length > 0 && intelligence?.default_level === autoLabel;
  const selectableDefault = defaultOption?.label && defaultOption?.model ? defaultLabel : '';
  const selectedDefault = autoIsDefault ? autoLabel : selectableDefault;

  const setIntelligence = (patch: Partial<IntelligenceValue>) => {
    setValue(
      'intelligence',
      {
        heading: intelligence?.heading ?? '',
        levels: editableLevels,
        default_level: intelligence?.default_level,
        auto,
        ...patch,
      },
      { shouldDirty: true },
    );
  };

  /** Never leaves `default_level` pointing at a level or Auto option that is gone. */
  const resolveDefault = (
    candidate: string | undefined,
    nextLevels: IntelligenceLevel[],
    nextAuto?: IntelligenceAuto,
  ): string | undefined => {
    const matchesAuto = Boolean(nextAuto?.label) && candidate === nextAuto?.label;
    if (candidate && (matchesAuto || nextLevels.some((level) => level.label === candidate))) {
      return candidate;
    }
    if (nextAuto?.label) {
      return nextAuto.label;
    }
    if (defaultLabel && nextLevels.some((level) => level.label === defaultLabel)) {
      return defaultLabel;
    }
    return nextLevels[getDefaultIntelligenceIndex(nextLevels)]?.label;
  };

  const updateLevel = (index: number, field: LevelField, value: string) => {
    const previousLabel = editableLevels[index].label;
    const nextLevels = editableLevels.map((level, slot) =>
      slot === index ? applyField(level, field, value) : level,
    );
    const renamed = field === 'label' && previousLabel !== value;
    const nextAuto = renamed ? renameAuto(auto, previousLabel, value) : auto;
    const candidate =
      renamed && intelligence?.default_level === previousLabel
        ? value
        : intelligence?.default_level;
    setIntelligence({
      levels: nextLevels,
      auto: nextAuto,
      default_level: resolveDefault(candidate, nextLevels, nextAuto),
    });
  };

  const addLevel = () => {
    if (visibleLevels.length >= MAX_INTELLIGENCE_LEVELS) {
      return;
    }
    const nextLevels = [...editableLevels, { ...emptyLevel }];
    setIntelligence({
      levels: nextLevels,
      default_level: resolveDefault(intelligence?.default_level, nextLevels, auto),
    });
  };

  const removeLevel = (index: number) => {
    const nextLevels = editableLevels.filter((_, slot) => slot !== index);
    const nextAuto = repairAuto(auto, nextLevels);
    setIntelligence({
      levels: nextLevels,
      auto: nextAuto,
      default_level: resolveDefault(intelligence?.default_level, nextLevels, nextAuto),
    });
  };

  const toggleAuto = (enabled: boolean) => {
    if (!enabled) {
      setIntelligence({
        auto: undefined,
        default_level: resolveDefault(intelligence?.default_level, editableLevels),
      });
      return;
    }
    const nextAuto: IntelligenceAuto = {
      label: localize('com_ui_intelligence_auto'),
      ...seedAutoLevels(usableLevels, defaultLabel),
    };
    setIntelligence({ auto: nextAuto, default_level: nextAuto.label });
  };

  const updateAuto = (patch: Partial<IntelligenceAuto>) => {
    if (!auto) {
      return;
    }
    const nextAuto: IntelligenceAuto = { ...auto, ...patch };
    const followsLabel = intelligence?.default_level === auto.label;
    const candidate = followsLabel ? nextAuto.label : intelligence?.default_level;
    setIntelligence({
      auto: nextAuto,
      default_level: resolveDefault(candidate, editableLevels, nextAuto),
    });
  };

  const savedModels = editableLevels.map((level) => level.model).filter(Boolean);
  const modelGroups = groupIntelligenceModels(models, savedModels);
  const levelOptions = usableLevels.map((level, index) => (
    <option key={`${level.label}-${index}`} value={level.label}>
      {level.label}
    </option>
  ));

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
              setIntelligence({
                heading: event.target.value,
                levels: intelligence?.levels ?? [],
              });
            }}
          />
        )}
      />
      <p className="text-xs text-text-secondary">{localize('com_ui_intelligence_levels_hint')}</p>
      <div className="flex flex-col gap-2 rounded-lg border border-border-light p-3">
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border-medium"
            aria-label={localize('com_ui_intelligence_auto_enable')}
            checked={auto != null}
            disabled={auto == null && usableLevels.length < 2}
            onChange={(event) => toggleAuto(event.target.checked)}
          />
          {localize('com_ui_intelligence_auto_enable')}
        </label>
        {auto ? (
          <>
            <p className="text-xs text-text-secondary">
              {localize('com_ui_intelligence_auto_hint')}
            </p>
            <Input
              className="h-9"
              value={auto.label}
              placeholder={localize('com_ui_intelligence_auto')}
              aria-label={localize('com_ui_intelligence_auto_label')}
              onChange={(event) => updateAuto({ label: event.target.value })}
            />
            <Input
              className="h-9"
              value={auto.description ?? ''}
              placeholder={localize('com_ui_intelligence_auto_description_placeholder')}
              aria-label={localize('com_ui_intelligence_auto_description_placeholder')}
              onChange={(event) => updateAuto({ description: optionalText(event.target.value) })}
            />
            <label className="flex items-center justify-between gap-2 text-xs text-text-secondary">
              {localize('com_ui_intelligence_auto_base')}
              <select
                className="h-9 min-w-40 rounded-md border border-border-medium bg-surface-primary px-2 text-sm text-text-primary"
                aria-label={localize('com_ui_intelligence_auto_base')}
                value={auto.base}
                onChange={(event) => updateAuto({ base: event.target.value })}
              >
                {levelOptions}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2 text-xs text-text-secondary">
              {localize('com_ui_intelligence_auto_escalate')}
              <select
                className="h-9 min-w-40 rounded-md border border-border-medium bg-surface-primary px-2 text-sm text-text-primary"
                aria-label={localize('com_ui_intelligence_auto_escalate')}
                value={auto.escalate}
                onChange={(event) => updateAuto({ escalate: event.target.value })}
              >
                {levelOptions}
              </select>
            </label>
            <Input
              className="h-9"
              defaultValue={auto.triggers?.join(', ') ?? ''}
              placeholder={localize('com_ui_intelligence_auto_triggers')}
              aria-label={localize('com_ui_intelligence_auto_triggers')}
              onChange={(event) => updateAuto({ triggers: parseTriggers(event.target.value) })}
            />
            <p className="text-xs text-text-secondary">
              {localize('com_ui_intelligence_auto_triggers_hint')}
            </p>
          </>
        ) : null}
      </div>
      <label className="flex items-center justify-between gap-3 text-xs text-text-secondary">
        {localize('com_ui_intelligence_default_level')}
        <select
          className="h-9 min-w-40 rounded-md border border-border-medium bg-surface-primary px-2 text-sm text-text-primary"
          aria-label={localize('com_ui_intelligence_default_level')}
          value={selectedDefault}
          onChange={(event) => setIntelligence({ default_level: event.target.value })}
        >
          <option value="" disabled>
            {localize('com_ui_intelligence_select_default')}
          </option>
          {autoLabel ? <option value={autoLabel}>{autoLabel}</option> : null}
          {levelOptions}
        </select>
      </label>
      {visibleLevels.map((level, slot) => (
        <div
          key={slot}
          className="relative grid grid-cols-2 gap-2 rounded-lg border border-border-light p-3"
        >
          <div className="col-span-2 pr-8">
            <p className="text-sm font-medium">
              {level.preset
                ? localize(presetLabels[level.preset])
                : level.label || localize('com_ui_intelligence_level_number', { number: slot + 1 })}
            </p>
            {level.description || level.preset ? (
              <p className="mt-1 text-xs text-text-secondary">
                {level.description || (level.preset ? localize(purposeLabels[level.preset]) : '')}
              </p>
            ) : null}
          </div>
          {visibleLevels.length > 1 ? (
            <button
              type="button"
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
              aria-label={`${localize('com_ui_intelligence_remove_level')} ${slot + 1}`}
              title={localize('com_ui_intelligence_remove_level')}
              onClick={() => removeLevel(slot)}
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
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
            {modelGroups.map((group) => (
              <optgroup
                key={group.id}
                label={
                  group.id === 'other'
                    ? localize(modelGroupLabels.other)
                    : modelGroupLabels[group.id]
                }
              >
                {group.models.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Input
            className="col-span-2 h-9"
            value={level.description ?? ''}
            placeholder={localize('com_ui_intelligence_description_placeholder')}
            aria-label={`${localize('com_ui_intelligence_description_placeholder')} ${slot + 1}`}
            onChange={(event) => updateLevel(slot, 'description', event.target.value)}
          />
          <label className="col-span-2 flex items-center justify-between gap-2 text-xs text-text-secondary">
            {localize('com_ui_intelligence_effort')}
            <select
              className="h-9 rounded-md border border-border-medium bg-surface-primary px-2 text-sm"
              aria-label={`${localize('com_ui_intelligence_effort')} ${slot + 1}`}
              value={level.reasoning_effort ?? ''}
              onChange={(event) => updateLevel(slot, 'reasoning_effort', event.target.value)}
            >
              <option value="">{localize('com_ui_default')}</option>
              {effortOptions(level).map((effort) => (
                <option key={effort} value={effort}>
                  {localize(effortLabels[effort])}
                </option>
              ))}
            </select>
          </label>
          <details className="col-span-2 rounded-md border border-border-light px-2 py-1">
            <summary className="cursor-pointer text-xs text-text-secondary">
              {localize('com_ui_intelligence_advanced')}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                className="min-h-16 w-full resize-y rounded-md border border-border-medium bg-surface-primary px-2 py-1 text-sm text-text-primary"
                value={level.instructions ?? ''}
                placeholder={localize('com_ui_intelligence_instructions_placeholder')}
                aria-label={`${localize('com_ui_intelligence_instructions_placeholder')} ${slot + 1}`}
                onChange={(event) => updateLevel(slot, 'instructions', event.target.value)}
              />
              <label className="flex items-center justify-between gap-2 text-xs text-text-secondary">
                {localize('com_ui_intelligence_recursion_limit')}
                <Input
                  type="number"
                  min={1}
                  className="h-9 w-24"
                  value={level.recursion_limit ?? ''}
                  aria-label={`${localize('com_ui_intelligence_recursion_limit')} ${slot + 1}`}
                  onChange={(event) => updateLevel(slot, 'recursion_limit', event.target.value)}
                />
              </label>
              <p className="text-xs text-text-secondary">
                {localize('com_ui_intelligence_recursion_limit_hint')}
              </p>
            </div>
          </details>
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
