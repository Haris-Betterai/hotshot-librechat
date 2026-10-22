import { useState } from 'react';
import { Eye } from 'lucide-react';
import type { TEmbedWidgetSettings } from 'librechat-data-provider';
import EmbedOrb from '~/components/Chat/EmbedOrb';
import { useLocalize } from '~/hooks';

const SCALE = 0.5;
const STAGE_HEIGHT = 440;
const LAUNCHER = 40;

type PreviewProps = {
  settings: TEmbedWidgetSettings;
  agentName?: string;
  iconUrl?: string;
};

/** A stand-in storefront so the widget is judged on a page, not on a blank box. */
function MockPage() {
  return (
    <div className="absolute inset-0 bg-white" aria-hidden="true">
      <div className="flex h-9 items-center gap-2 border-b border-neutral-100 px-3">
        <span className="h-4 w-10 rounded bg-neutral-800" />
        <span className="ml-2 h-1.5 w-8 rounded bg-neutral-200" />
        <span className="h-1.5 w-8 rounded bg-neutral-200" />
        <span className="h-1.5 w-8 rounded bg-neutral-200" />
        <span className="ml-auto h-4 w-4 rounded-full bg-neutral-200" />
      </div>
      <div className="m-3 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 p-4">
        <span className="block h-2.5 w-2/5 rounded bg-neutral-400/70" />
        <span className="mt-2 block h-2 w-3/5 rounded bg-neutral-300" />
        <span className="mt-3 block h-5 w-16 rounded bg-neutral-800" />
      </div>
      <div className="mx-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((tile) => (
          <div key={tile} className="rounded-lg border border-neutral-100 p-2">
            <span className="mx-auto block h-14 w-8 rounded bg-neutral-200" />
            <span className="mt-2 block h-1.5 w-4/5 rounded bg-neutral-200" />
            <span className="mt-1 block h-1.5 w-2/5 rounded bg-neutral-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
  /** The orb inks itself for the surrounding theme; a dark panel needs its light dots. */
  const orb = (size: number) => (
    <span className={dark ? 'dark' : undefined}>
      <EmbedOrb size={size} />
    </span>
  );
  const panelBottom = offsetY + LAUNCHER + 10;
  const launcher = (
    <div
      data-testid="embed-preview-launcher"
      className="absolute flex items-center justify-center overflow-hidden rounded-full bg-[#111827] shadow-lg"
      style={{ [side]: offsetX, bottom: offsetY, width: LAUNCHER, height: LAUNCHER }}
    >
      {customIcon ? (
        <img src={customIcon} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="dark">
          <EmbedOrb size={28} />
        </span>
      )}
    </div>
  );

  const toggle = (open: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={panelOpen === open}
      className={`h-7 rounded-md px-2.5 text-xs transition-colors ${
        panelOpen === open
          ? 'bg-surface-primary font-medium text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
      onClick={() => setPanelOpen(open)}
    >
      {label}
    </button>
  );

  return (
    <section
      aria-label={localize('com_ui_embed_preview_live')}
      className="rounded-xl border border-border-light bg-surface-primary p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Eye className="h-4 w-4" aria-hidden="true" />
          {localize('com_ui_embed_preview_live')}
        </span>
        <div className="flex gap-0.5 rounded-lg bg-surface-secondary p-0.5">
          {toggle(true, localize('com_ui_embed_preview_tab_open'))}
          {toggle(false, localize('com_ui_embed_preview_tab_closed'))}
        </div>
      </div>
      <div
        data-testid="embed-preview-stage"
        className="relative w-full overflow-hidden rounded-lg border border-border-light"
        style={{ height: STAGE_HEIGHT }}
      >
        <MockPage />
        {panelOpen ? (
          <div
            data-testid="embed-preview-panel"
            className={`absolute flex flex-col overflow-hidden rounded-xl border shadow-2xl ${
              dark
                ? 'border-neutral-700 bg-neutral-900 text-neutral-100'
                : 'border-neutral-200 bg-white text-neutral-900'
            }`}
            style={{
              width: panelWidth,
              height: Math.min(panelHeight, STAGE_HEIGHT - panelBottom - 8),
              [side]: offsetX,
              bottom: panelBottom,
            }}
          >
            <div
              className={`flex items-center gap-2 border-b px-3 py-2 ${border}`}
              data-testid="embed-preview-header"
            >
              {customIcon ? (
                <img src={customIcon} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                orb(20)
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">
                  {settings.title || agentName || localize('com_ui_embed_preview_default_title')}
                </div>
                {settings.subtitle && (
                  <div className="truncate text-[10px] text-neutral-500">{settings.subtitle}</div>
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2.5">
              {settings.welcomeMessage && (
                <div className="flex items-end gap-1.5">
                  {customIcon ? (
                    <img src={customIcon} alt="" className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    orb(16)
                  )}
                  <div
                    data-testid="embed-preview-welcome"
                    className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-snug ${
                      dark ? 'bg-neutral-800' : 'bg-neutral-100'
                    }`}
                  >
                    {settings.welcomeMessage}
                  </div>
                </div>
              )}
              <div className="mt-auto flex flex-col items-end gap-1">
                {settings.starters.map((starter, index) => (
                  <span
                    key={`${starter}-${index}`}
                    data-testid="embed-preview-starter"
                    className={`max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] ${border} ${
                      dark ? 'text-neutral-100' : 'text-neutral-800'
                    }`}
                  >
                    {starter}
                  </span>
                ))}
              </div>
              <div
                className={`flex items-center justify-between rounded-full border py-1 pl-2.5 pr-1 ${border}`}
                aria-hidden="true"
              >
                <span className="h-1.5 w-1/2 rounded bg-neutral-300/60" />
                <span
                  data-testid="embed-preview-send"
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: settings.color }}
                />
              </div>
            </div>
            {settings.showPoweredBy && (
              <div className="pb-1.5 text-center text-[9px] opacity-60">
                {localize('com_ui_embed_powered_by')}
              </div>
            )}
          </div>
        ) : (
          settings.teaserText && (
            <div
              data-testid="embed-preview-teaser"
              className={`absolute max-w-[65%] rounded-xl px-3 py-2 text-[11px] shadow-lg ${
                dark
                  ? 'border border-neutral-700 bg-neutral-900 text-neutral-100'
                  : 'border border-neutral-200 bg-white text-neutral-900'
              }`}
              style={{ [side]: offsetX + LAUNCHER + 8, bottom: offsetY + 6 }}
            >
              {settings.teaserText}
            </div>
          )
        )}
        {launcher}
      </div>
    </section>
  );
}
