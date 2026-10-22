import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Spinner, useToastContext } from '@librechat/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService, normalizeEmbedWidgetSettings } from 'librechat-data-provider';
import type { ReactNode } from 'react';
import type { QueryKey } from '@tanstack/react-query';
import type { TEmbedWidget, TEmbedWidgetSettings } from 'librechat-data-provider';
import EmbedSettingsForm, { HEX_COLOR } from './Settings';
import EmbedPreview from './Preview';
import { useLocalize } from '~/hooks';

type EditorProps = {
  widget: TEmbedWidget;
  queryKey: QueryKey;
  agentName?: string;
  agentId?: string;
  /** Custom launcher icon upload, rendered inside the Look section. */
  launcherUpload?: ReactNode;
  /** Install and access card, rendered below the settings sections. */
  install?: ReactNode;
  wide?: boolean;
};

export function diffSettings(
  saved: TEmbedWidgetSettings,
  next: TEmbedWidgetSettings,
): Partial<TEmbedWidgetSettings> {
  return (Object.keys(next) as (keyof TEmbedWidgetSettings)[]).reduce<
    Partial<TEmbedWidgetSettings>
  >((acc, key) => {
    if (JSON.stringify(saved[key]) === JSON.stringify(next[key])) {
      return acc;
    }
    return { ...acc, [key]: next[key] };
  }, {});
}

export default function EmbedSettingsEditor({
  widget,
  queryKey,
  agentName,
  agentId,
  launcherUpload,
  install,
  wide = false,
}: EditorProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const saved = useMemo(() => normalizeEmbedWidgetSettings(widget.settings), [widget.settings]);
  const savedKey = JSON.stringify(saved);
  const [draft, setDraft] = useState<TEmbedWidgetSettings>(saved);
  const [colorText, setColorText] = useState(saved.color);

  useEffect(() => {
    setDraft(saved);
    setColorText(saved.color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const colorValid = HEX_COLOR.test(colorText);
  const normalized = useMemo(() => normalizeEmbedWidgetSettings(draft), [draft]);
  const changes = useMemo(() => diffSettings(saved, normalized), [saved, normalized]);
  const dirty = Object.keys(changes).length > 0;

  const saveMutation = useMutation({
    mutationFn: (settings: Partial<TEmbedWidgetSettings>) =>
      dataService.updateEmbedWidgetLink(widget.embedId, { settings }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      showToast({ status: 'success', message: localize('com_ui_embed_settings_saved') });
    },
    onError: (err: Error) => {
      showToast({
        status: 'error',
        message: `${localize('com_ui_embed_settings_error')}${err.message ? `: ${err.message}` : ''}`,
      });
    },
  });

  const onColorText = (value: string) => {
    setColorText(value);
    if (HEX_COLOR.test(value)) {
      setDraft((prev) => ({ ...prev, color: value.toLowerCase() }));
    }
  };

  const onChange = (partial: Partial<TEmbedWidgetSettings>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const reset = () => {
    setDraft(saved);
    setColorText(saved.color);
  };

  return (
    <div
      className={
        wide ? 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]' : 'flex flex-col gap-4'
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        <EmbedSettingsForm
          draft={draft}
          colorText={colorText}
          onColorText={onColorText}
          onChange={onChange}
          agentName={agentName}
          agentId={agentId}
          launcherUpload={launcherUpload}
          wide={wide}
        />
        {install}
      </div>
      <aside className={`flex min-w-0 flex-col gap-4 ${wide ? 'lg:sticky lg:top-4' : ''}`}>
        <EmbedPreview settings={normalized} agentName={agentName} iconUrl={widget.iconUrl} />
        <div className="flex items-center gap-2 rounded-xl border border-border-light bg-surface-primary p-3 shadow-sm">
          {dirty ? (
            <span className="flex items-center gap-2 text-xs text-text-primary" role="status">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              {localize('com_ui_embed_unsaved')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {localize('com_ui_embed_all_saved')}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="btn btn-neutral h-9 rounded-lg px-3 text-sm"
              disabled={!dirty && colorValid}
              onClick={reset}
            >
              {localize('com_ui_embed_settings_reset')}
            </button>
            <button
              type="button"
              className="btn btn-primary h-9 rounded-lg px-4 text-sm"
              disabled={!dirty || !colorValid || saveMutation.isLoading}
              onClick={() => saveMutation.mutate(changes)}
            >
              {saveMutation.isLoading ? (
                <Spinner className="icon-md" aria-hidden="true" />
              ) : (
                localize('com_ui_embed_settings_save')
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
