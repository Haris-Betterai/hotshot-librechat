import { useState } from 'react';
import type { TEmbedWidgetSettings } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';

const SCALE = 0.4;

type PreviewProps = {
  settings: TEmbedWidgetSettings;
  agentName?: string;
  iconUrl?: string;
};

export default function EmbedPreview({ settings, agentName, iconUrl }: PreviewProps) {
  const localize = useLocalize();
  const [panelOpen, setPanelOpen] = useState(true);
  const dark = settings.theme === 'dark';
  const side = settings.position === 'left' ? 'left' : 'right';
  const panelWidth = Math.round(settings.width * SCALE);
  const panelHeight = Math.round(settings.height * SCALE);
  const offsetX = Math.round(settings.offsetX * SCALE);
  const offsetY = Math.round(settings.offsetY * SCALE);
  const launcher = (
    <div
      data-testid="embed-preview-launcher"
      className="absolute flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-sm text-white shadow"
      style={{ backgroundColor: settings.color, [side]: offsetX, bottom: offsetY }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">💬</span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary">
          {localize('com_ui_embed_preview')}
        </span>
        <button
          type="button"
          className="text-xs text-text-secondary underline hover:text-text-primary"
          aria-pressed={panelOpen}
          onClick={() => setPanelOpen((value) => !value)}
        >
          {panelOpen
            ? localize('com_ui_embed_preview_closed')
            : localize('com_ui_embed_preview_open')}
        </button>
      </div>
      <div
        data-testid="embed-preview-stage"
        className="relative h-[300px] w-full overflow-hidden rounded border border-border-light bg-surface-secondary"
      >
        <div className="m-3 h-2 w-1/3 rounded bg-surface-tertiary" aria-hidden="true" />
        <div className="mx-3 mb-2 h-2 w-2/3 rounded bg-surface-tertiary" aria-hidden="true" />
        <div className="mx-3 h-2 w-1/2 rounded bg-surface-tertiary" aria-hidden="true" />
        {panelOpen ? (
          <div
            data-testid="embed-preview-panel"
            className={`absolute flex flex-col overflow-hidden rounded-lg border shadow-lg ${
              dark
                ? 'border-gray-700 bg-gray-900 text-gray-100'
                : 'border-gray-200 bg-white text-gray-900'
            }`}
            style={{
              width: panelWidth,
              height: Math.min(panelHeight, 250),
              [side]: offsetX,
              bottom: offsetY + 36,
            }}
          >
            <div
              className="px-2 py-1.5 text-white"
              style={{ backgroundColor: settings.color }}
              data-testid="embed-preview-header"
            >
              <div className="truncate text-[11px] font-semibold">
                {settings.title || agentName || localize('com_ui_embed_preview_default_title')}
              </div>
              {settings.subtitle && (
                <div className="truncate text-[9px] opacity-90">{settings.subtitle}</div>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
              {settings.welcomeMessage && (
                <div
                  data-testid="embed-preview-welcome"
                  className={`max-w-[85%] rounded-lg px-2 py-1 text-[10px] ${
                    dark ? 'bg-gray-800' : 'bg-gray-100'
                  }`}
                >
                  {settings.welcomeMessage}
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-1">
                {settings.starters.map((starter, index) => (
                  <span
                    key={`${starter}-${index}`}
                    data-testid="embed-preview-starter"
                    className="rounded-full border px-1.5 py-0.5 text-[9px]"
                    style={{ borderColor: settings.color, color: settings.color }}
                  >
                    {starter}
                  </span>
                ))}
              </div>
            </div>
            {settings.showPoweredBy && (
              <div className="pb-1 text-center text-[8px] opacity-60">
                {localize('com_ui_embed_powered_by')}
              </div>
            )}
          </div>
        ) : (
          settings.teaserText && (
            <div
              data-testid="embed-preview-teaser"
              className={`absolute max-w-[60%] rounded-lg px-2 py-1 text-[10px] shadow ${
                dark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
              }`}
              style={{ [side]: offsetX + 36, bottom: offsetY + 4 }}
            >
              {settings.teaserText}
            </div>
          )
        )}
        {launcher}
      </div>
    </div>
  );
}
