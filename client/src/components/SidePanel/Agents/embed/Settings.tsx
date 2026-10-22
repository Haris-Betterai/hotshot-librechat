import {
  Sun,
  Plus,
  Moon,
  Image,
  Monitor,
  Palette,
  Sparkles,
  Settings2,
  PanelLeft,
  PanelRight,
  LayoutGrid,
  MessageSquareText,
  X,
} from 'lucide-react';
import { MAX_EMBED_STARTERS, MAX_EMBED_LEVELS } from 'librechat-data-provider';
import type { ReactNode, ComponentType } from 'react';
import type {
  TEmbedWidgetSettings,
  TEmbedWidgetTheme,
  TEmbedWidgetLauncherIcon,
} from 'librechat-data-provider';
import { useAgentLevels } from '~/components/Chat/Input/embed/levels';
import { useLocalize } from '~/hooks';

export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Patch = (partial: Partial<TEmbedWidgetSettings>) => void;
type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

type SettingsProps = {
  draft: TEmbedWidgetSettings;
  colorText: string;
  onColorText: (value: string) => void;
  onChange: Patch;
  agentName?: string;
  agentId?: string;
  /** Upload control for the custom launcher icon, shown under the launcher choice. */
  launcherUpload?: ReactNode;
  /** Full-page layout: fields sit side by side instead of stacking. */
  wide?: boolean;
};

export const inputClass =
  'h-10 w-full min-w-0 rounded-lg border border-border-medium bg-surface-primary px-3 text-sm text-text-primary transition-colors placeholder:text-text-tertiary focus:border-text-primary focus:outline-none disabled:opacity-50';

export function Section({
  title,
  description,
  icon: SectionIcon,
  children,
}: {
  title: string;
  description?: string;
  icon: Icon;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-border-light bg-surface-primary p-5 shadow-sm"
    >
      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-text-primary">
          <SectionIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-text-primary">{label}</span>
      {children}
      {hint && <span className="text-xs text-text-secondary">{hint}</span>}
    </label>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
  plain = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Drops the row's own border when it sits inside a divided list. */
  plain?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${
        plain ? '' : 'rounded-lg border border-border-light'
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {description && <div className="mt-0.5 text-xs text-text-secondary">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-text-primary' : 'bg-surface-tertiary'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface-primary shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function NumberField({
  label,
  unit,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          type="number"
          className={`${inputClass} pr-10`}
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-secondary">
          {unit}
        </span>
      </div>
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
  options: { value: T; label: string; icon?: Icon }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5" role="group" aria-label={label}>
      <span className="text-xs font-medium text-text-primary">{label}</span>
      <div className="flex gap-1 rounded-lg bg-surface-secondary p-1">
        {options.map(({ value: optionValue, label: optionLabel, icon: OptionIcon }) => (
          <button
            key={optionValue}
            type="button"
            aria-pressed={value === optionValue}
            className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm transition-colors ${
              value === optionValue
                ? 'bg-surface-primary font-medium text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => onChange(optionValue)}
          >
            {OptionIcon && <OptionIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            {optionLabel}
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
  agentId,
  launcherUpload,
  wide = false,
}: SettingsProps) {
  const localize = useLocalize();
  const cols = (layout: string) => (wide ? `grid gap-4 ${layout}` : 'grid gap-4');
  const { levels: agentLevels } = useAgentLevels(agentId);
  const levelNames = agentLevels.map((level) => level.name);
  const colorValid = HEX_COLOR.test(colorText);
  const px = localize('com_ui_embed_unit_px');
  const seconds = localize('com_ui_embed_unit_seconds');

  const updateStarter = (index: number, value: string) =>
    onChange({ starters: draft.starters.map((item, i) => (i === index ? value : item)) });

  const removeStarter = (index: number) =>
    onChange({ starters: draft.starters.filter((_, i) => i !== index) });

  const updateLevel = (index: number, value: string) => {
    const slots = Array.from({ length: MAX_EMBED_LEVELS }, (_, i) => draft.levels[i] ?? '');
    onChange({ levels: slots.map((slot, i) => (i === index ? value : slot)).filter(Boolean) });
  };

  return (
    <div className="flex flex-col gap-4">
      <Section
        icon={Palette}
        title={localize('com_ui_embed_group_look')}
        description={localize('com_ui_embed_group_look_desc')}
      >
        <div className={cols('sm:grid-cols-2')}>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium text-text-primary">
              {localize('com_ui_embed_color')}
            </span>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border-medium bg-surface-primary pl-1.5 pr-3 focus-within:border-text-primary">
              <input
                type="color"
                className="h-7 w-7 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
                value={colorValid ? colorText : draft.color}
                aria-label={localize('com_ui_embed_color_picker')}
                onChange={(event) => onColorText(event.target.value)}
              />
              <input
                className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm uppercase text-text-primary focus:outline-none"
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
              { value: 'light', label: localize('com_ui_embed_theme_light'), icon: Sun },
              { value: 'dark', label: localize('com_ui_embed_theme_dark'), icon: Moon },
              { value: 'auto', label: localize('com_ui_embed_theme_auto'), icon: Monitor },
            ]}
            onChange={(theme) => onChange({ theme })}
          />
        </div>
        <div className="grid gap-3">
          <Segmented<TEmbedWidgetLauncherIcon>
            label={localize('com_ui_embed_launcher_icon')}
            value={draft.launcherIcon}
            options={[
              { value: 'orb', label: localize('com_ui_embed_launcher_orb'), icon: Sparkles },
              { value: 'custom', label: localize('com_ui_embed_launcher_custom'), icon: Image },
            ]}
            onChange={(launcherIcon) => onChange({ launcherIcon })}
          />
          {draft.launcherIcon === 'custom' && launcherUpload}
        </div>
        <div className={cols('sm:grid-cols-2')}>
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
        </div>
      </Section>

      <Section
        icon={LayoutGrid}
        title={localize('com_ui_embed_group_placement')}
        description={localize('com_ui_embed_group_placement_desc')}
      >
        <Segmented
          label={localize('com_ui_embed_position')}
          value={draft.position}
          options={[
            { value: 'left', label: localize('com_ui_embed_position_left'), icon: PanelLeft },
            { value: 'right', label: localize('com_ui_embed_position_right'), icon: PanelRight },
          ]}
          onChange={(position) => onChange({ position })}
        />
        <div className={wide ? 'grid grid-cols-2 gap-4 lg:grid-cols-4' : 'grid grid-cols-2 gap-4'}>
          <NumberField
            label={localize('com_ui_embed_offset_x')}
            unit={px}
            value={draft.offsetX}
            min={0}
            max={200}
            onChange={(offsetX) => onChange({ offsetX })}
          />
          <NumberField
            label={localize('com_ui_embed_offset_y')}
            unit={px}
            value={draft.offsetY}
            min={0}
            max={200}
            onChange={(offsetY) => onChange({ offsetY })}
          />
          <NumberField
            label={localize('com_ui_embed_width')}
            unit={px}
            value={draft.width}
            min={300}
            max={640}
            onChange={(width) => onChange({ width })}
          />
          <NumberField
            label={localize('com_ui_embed_height')}
            unit={px}
            value={draft.height}
            min={400}
            max={900}
            onChange={(height) => onChange({ height })}
          />
        </div>
        <SwitchRow
          label={localize('com_ui_embed_mobile_fullscreen')}
          description={localize('com_ui_embed_mobile_fullscreen_desc')}
          checked={draft.mobileFullscreen}
          onChange={(mobileFullscreen) => onChange({ mobileFullscreen })}
        />
      </Section>

      <Section
        icon={MessageSquareText}
        title={localize('com_ui_embed_group_greeting')}
        description={localize('com_ui_embed_group_greeting_desc')}
      >
        <Field label={localize('com_ui_embed_welcome')}>
          <textarea
            className="min-h-[76px] w-full resize-y rounded-lg border border-border-medium bg-surface-primary px-3 py-2.5 text-sm text-text-primary focus:border-text-primary focus:outline-none"
            value={draft.welcomeMessage}
            maxLength={600}
            onChange={(event) => onChange({ welcomeMessage: event.target.value })}
          />
        </Field>
        <div className={cols('sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]')}>
          <Field label={localize('com_ui_embed_teaser')}>
            <input
              className={inputClass}
              value={draft.teaserText}
              maxLength={200}
              onChange={(event) => onChange({ teaserText: event.target.value })}
            />
          </Field>
          <NumberField
            label={localize('com_ui_embed_teaser_delay')}
            unit={seconds}
            value={draft.teaserDelay}
            min={0}
            max={120}
            onChange={(teaserDelay) => onChange({ teaserDelay })}
          />
          <NumberField
            label={localize('com_ui_embed_auto_open')}
            unit={seconds}
            hint={localize('com_ui_embed_auto_open_hint')}
            value={draft.autoOpenSeconds}
            min={0}
            max={600}
            onChange={(autoOpenSeconds) => onChange({ autoOpenSeconds })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-text-primary">
            {localize('com_ui_embed_starters')}
          </span>
          {draft.starters.map((starter, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-xs font-medium text-text-secondary">
                {index + 1}
              </span>
              <input
                className={inputClass}
                value={starter}
                maxLength={200}
                aria-label={`${localize('com_ui_embed_starter')} ${index + 1}`}
                onChange={(event) => updateStarter(index, event.target.value)}
              />
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                aria-label={localize('com_ui_embed_starter_remove')}
                onClick={() => removeStarter(index)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed border-border-medium px-3 text-sm text-text-secondary hover:border-text-primary hover:text-text-primary disabled:opacity-50"
            disabled={draft.starters.length >= MAX_EMBED_STARTERS}
            onClick={() => onChange({ starters: [...draft.starters, ''] })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {localize('com_ui_embed_starter_add')}
          </button>
        </div>
      </Section>

      <Section
        icon={Settings2}
        title={localize('com_ui_embed_group_behaviour')}
        description={localize('com_ui_embed_group_behaviour_desc')}
      >
        <SwitchRow
          label={localize('com_ui_embed_show_intelligence')}
          description={localize('com_ui_embed_show_intelligence_desc')}
          checked={draft.showIntelligence}
          onChange={(showIntelligence) => onChange({ showIntelligence })}
        />
        <div
          className={cols('sm:grid-cols-3')}
          role="group"
          aria-label={localize('com_ui_embed_levels')}
        >
          {Array.from({ length: MAX_EMBED_LEVELS }, (_, index) => {
            const value = draft.levels[index] ?? '';
            const options =
              value && !levelNames.includes(value) ? [value, ...levelNames] : levelNames;
            return (
              <Field key={index} label={`${localize('com_ui_embed_level')} ${index + 1}`}>
                <select
                  className={inputClass}
                  value={value}
                  disabled={index > 0 && !draft.levels[index - 1]}
                  onChange={(event) => updateLevel(index, event.target.value)}
                >
                  {index > 0 && <option value="">{localize('com_ui_embed_level_none')}</option>}
                  {options.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
            );
          })}
        </div>
        <div className="divide-y divide-border-light rounded-lg border border-border-light">
          <SwitchRow
            plain
            label={localize('com_ui_embed_allow_voice')}
            checked={draft.allowVoice}
            onChange={(allowVoice) => onChange({ allowVoice })}
          />
          <SwitchRow
            plain
            label={localize('com_ui_embed_allow_upload')}
            checked={draft.allowFileUpload}
            onChange={(allowFileUpload) => onChange({ allowFileUpload })}
          />
          <SwitchRow
            plain
            label={localize('com_ui_embed_show_powered_by')}
            checked={draft.showPoweredBy}
            onChange={(showPoweredBy) => onChange({ showPoweredBy })}
          />
        </div>
      </Section>
    </div>
  );
}
