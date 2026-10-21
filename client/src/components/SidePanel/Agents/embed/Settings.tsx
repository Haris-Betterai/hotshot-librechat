import { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { MAX_EMBED_STARTERS } from 'librechat-data-provider';
import type { ReactNode } from 'react';
import type { TEmbedWidgetSettings, TEmbedWidgetTheme } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Patch = (partial: Partial<TEmbedWidgetSettings>) => void;

type SettingsProps = {
  draft: TEmbedWidgetSettings;
  colorText: string;
  onColorText: (value: string) => void;
  onChange: Patch;
  agentName?: string;
};

const inputClass =
  'h-9 w-full min-w-0 rounded border border-border-medium bg-surface-primary px-3 text-sm';

function Group({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded border border-border-light">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-text-secondary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-secondary">
      {label}
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        className={inputClass}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="flex flex-col gap-1 text-xs text-text-secondary"
      role="group"
      aria-label={label}
    >
      {label}
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={`h-8 flex-1 rounded border px-2 text-sm ${
              value === option.value
                ? 'border-text-primary bg-surface-tertiary text-text-primary'
                : 'border-border-medium text-text-secondary'
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EmbedSettingsForm({
  draft,
  colorText,
  onColorText,
  onChange,
  agentName,
}: SettingsProps) {
  const localize = useLocalize();
  const colorValid = HEX_COLOR.test(colorText);

  const updateStarter = (index: number, value: string) =>
    onChange({ starters: draft.starters.map((item, i) => (i === index ? value : item)) });

  const removeStarter = (index: number) =>
    onChange({ starters: draft.starters.filter((_, i) => i !== index) });

  return (
    <div className="flex flex-col gap-2">
      <Group defaultOpen title={localize('com_ui_embed_group_look')}>
        <div className="flex flex-col gap-1 text-xs text-text-secondary">
          {localize('com_ui_embed_color')}
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-12 cursor-pointer rounded border border-border-medium bg-transparent"
              value={colorValid ? colorText : draft.color}
              aria-label={localize('com_ui_embed_color_picker')}
              onChange={(event) => onColorText(event.target.value)}
            />
            <input
              className={inputClass}
              value={colorText}
              maxLength={7}
              aria-label={localize('com_ui_embed_color')}
              aria-invalid={!colorValid}
              onChange={(event) => onColorText(event.target.value)}
            />
          </div>
          {!colorValid && (
            <span role="alert" className="text-xs text-red-500">
              {localize('com_ui_embed_color_invalid')}
            </span>
          )}
        </div>
        <Segmented<TEmbedWidgetTheme>
          label={localize('com_ui_embed_theme')}
          value={draft.theme}
          options={[
            { value: 'light', label: localize('com_ui_embed_theme_light') },
            { value: 'dark', label: localize('com_ui_embed_theme_dark') },
            { value: 'auto', label: localize('com_ui_embed_theme_auto') },
          ]}
          onChange={(theme) => onChange({ theme })}
        />
        <Field label={localize('com_ui_embed_title')}>
          <input
            className={inputClass}
            value={draft.title}
            maxLength={80}
            placeholder={agentName || localize('com_ui_embed_preview_default_title')}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </Field>
        <Field label={localize('com_ui_embed_subtitle')}>
          <input
            className={inputClass}
            value={draft.subtitle}
            maxLength={120}
            onChange={(event) => onChange({ subtitle: event.target.value })}
          />
        </Field>
      </Group>

      <Group title={localize('com_ui_embed_group_placement')}>
        <Segmented
          label={localize('com_ui_embed_position')}
          value={draft.position}
          options={[
            { value: 'right', label: localize('com_ui_embed_position_right') },
            { value: 'left', label: localize('com_ui_embed_position_left') },
          ]}
          onChange={(position) => onChange({ position })}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={localize('com_ui_embed_offset_x')}
            value={draft.offsetX}
            min={0}
            max={200}
            onChange={(offsetX) => onChange({ offsetX })}
          />
          <NumberField
            label={localize('com_ui_embed_offset_y')}
            value={draft.offsetY}
            min={0}
            max={200}
            onChange={(offsetY) => onChange({ offsetY })}
          />
          <NumberField
            label={localize('com_ui_embed_width')}
            value={draft.width}
            min={300}
            max={640}
            onChange={(width) => onChange({ width })}
          />
          <NumberField
            label={localize('com_ui_embed_height')}
            value={draft.height}
            min={400}
            max={900}
            onChange={(height) => onChange({ height })}
          />
        </div>
        <Toggle
          label={localize('com_ui_embed_mobile_fullscreen')}
          checked={draft.mobileFullscreen}
          onChange={(mobileFullscreen) => onChange({ mobileFullscreen })}
        />
      </Group>

      <Group title={localize('com_ui_embed_group_greeting')}>
        <Field label={localize('com_ui_embed_welcome')}>
          <textarea
            className="min-h-[64px] w-full resize-y rounded border border-border-medium bg-surface-primary px-3 py-2 text-sm"
            value={draft.welcomeMessage}
            maxLength={600}
            onChange={(event) => onChange({ welcomeMessage: event.target.value })}
          />
        </Field>
        <Field label={localize('com_ui_embed_teaser')}>
          <input
            className={inputClass}
            value={draft.teaserText}
            maxLength={200}
            onChange={(event) => onChange({ teaserText: event.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={localize('com_ui_embed_teaser_delay')}
            value={draft.teaserDelay}
            min={0}
            max={120}
            onChange={(teaserDelay) => onChange({ teaserDelay })}
          />
          <NumberField
            label={localize('com_ui_embed_auto_open')}
            value={draft.autoOpenSeconds}
            min={0}
            max={600}
            onChange={(autoOpenSeconds) => onChange({ autoOpenSeconds })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-text-secondary">{localize('com_ui_embed_starters')}</span>
          {draft.starters.map((starter, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                className={inputClass}
                value={starter}
                maxLength={200}
                aria-label={`${localize('com_ui_embed_starter')} ${index + 1}`}
                onChange={(event) => updateStarter(index, event.target.value)}
              />
              <button
                type="button"
                className="text-text-secondary hover:text-text-primary"
                aria-label={localize('com_ui_embed_starter_remove')}
                onClick={() => removeStarter(index)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-neutral flex h-8 items-center gap-1 self-start px-3 text-sm"
            disabled={draft.starters.length >= MAX_EMBED_STARTERS}
            onClick={() => onChange({ starters: [...draft.starters, ''] })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {localize('com_ui_embed_starter_add')}
          </button>
        </div>
      </Group>

      <Group title={localize('com_ui_embed_group_behaviour')}>
        <Toggle
          label={localize('com_ui_embed_show_intelligence')}
          checked={draft.showIntelligence}
          onChange={(showIntelligence) => onChange({ showIntelligence })}
        />
        <Toggle
          label={localize('com_ui_embed_allow_voice')}
          checked={draft.allowVoice}
          onChange={(allowVoice) => onChange({ allowVoice })}
        />
        <Toggle
          label={localize('com_ui_embed_allow_upload')}
          checked={draft.allowFileUpload}
          onChange={(allowFileUpload) => onChange({ allowFileUpload })}
        />
        <Toggle
          label={localize('com_ui_embed_show_powered_by')}
          checked={draft.showPoweredBy}
          onChange={(showPoweredBy) => onChange({ showPoweredBy })}
        />
      </Group>
    </div>
  );
}
