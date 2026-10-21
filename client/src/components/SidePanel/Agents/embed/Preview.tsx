import { useState } from 'react';
import type { TEmbedWidgetSettings } from 'librechat-data-provider';
import EmbedOrb from '~/components/Chat/EmbedOrb';
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
  const customIcon = settings.launcherIcon === 'custom' ? iconUrl : undefined;
  const border = dark ? 'border-neutral-700' : 'border-neutral-200';
  const launcher = (
    <div
      data-testid="embed-preview-launcher"
      className="absolute flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#111827] shadow"
      style={{ [side]: offsetX, bottom: offsetY }}
    >
      {customIcon ? (
        <img src={customIcon} alt="" className="h-full w-full object-cover" />
      ) : (
        <EmbedOrb size={22} />
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
                ? 'border-neutral-700 bg-neutral-900 text-neutral-100'
                : 'border-neutral-200 bg-white text-neutral-900'
            }`}
            style={{
              width: panelWidth,
              height: Math.min(panelHeight, 250),
              [side]: offsetX,
              bottom: offsetY + 36,
            }}
          >
            <div
              className={`flex items-center gap-1.5 border-b px-2 py-1.5 ${border}`}
              data-testid="embed-preview-header"
            >
              {customIcon ? (
                <img src={customIcon} alt="" className="h-4 w-4 rounded-full object-cover" />
              ) : (
                <EmbedOrb size={16} />
              )}
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold">
                  {settings.title || agentName || localize('com_ui_embed_preview_default_title')}
                </div>
                {settings.subtitle && (
                  <div className="truncate text-[9px] text-neutral-500">{settings.subtitle}</div>
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
              {settings.welcomeMessage && (
                <div className="flex items-end gap-1">
                  {customIcon ? (
                    <img
                      src={customIcon}
                      alt=""
                      className="h-3.5 w-3.5 rounded-full object-cover"
                    />
                  ) : (
                    <EmbedOrb size={14} />
                  )}
                  <div
                    data-testid="embed-preview-welcome"
                    className={`max-w-[85%] rounded-lg px-2 py-1 text-[10px] ${
                      dark ? 'bg-neutral-800' : 'bg-neutral-100'
                    }`}
                  >
                    {settings.welcomeMessage}
                  </div>
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-1">
                {settings.starters.map((starter, index) => (
                  <span
                    key={`${starter}-${index}`}
                    data-testid="embed-preview-starter"
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] ${border} ${
                      dark ? 'text-neutral-100' : 'text-neutral-800'
                    }`}
                  >
                    {starter}
                  </span>
                ))}
              </div>
              <div
                className={`flex items-center justify-end rounded-full border px-1 py-0.5 ${border}`}
                aria-hidden="true"
              >
                <span
                  data-testid="embed-preview-send"
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: settings.color }}
                />
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
                dark
                  ? 'border border-neutral-700 bg-neutral-900 text-neutral-100'
                  : 'border border-neutral-200 bg-white text-neutral-900'
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
