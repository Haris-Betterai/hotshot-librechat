import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Input } from '@librechat/client';
import { useGetModelsQuery } from 'librechat-data-provider/react-query';
import type { AgentForm } from '~/common';
import { useLocalize } from '~/hooks';

const SLOTS = [0, 1, 2, 3] as const;

export default function Levels() {
  const localize = useLocalize();
  const { control, setValue } = useFormContext<AgentForm>();
  const provider = useWatch({ control, name: 'provider' });
  const intelligence = useWatch({ control, name: 'intelligence' });
  const { data: modelsConfig } = useGetModelsQuery();

  const providerValue = typeof provider === 'string' ? provider : provider?.value;
  const models = (providerValue ? modelsConfig?.[providerValue] : undefined) ?? [];
  const levels = intelligence?.levels ?? [];

  const updateLevel = (index: number, field: 'label' | 'model', value: string) => {
    const next = SLOTS.map((slot) => ({
      label: levels[slot]?.label ?? '',
      model: levels[slot]?.model ?? '',
    }));
    next[index] = { ...next[index], [field]: value };
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
        <div key={slot} className="grid grid-cols-2 gap-2">
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
        </div>
      ))}
    </div>
  );
}
