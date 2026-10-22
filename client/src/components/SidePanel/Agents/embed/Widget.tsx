import { useMemo, useRef, useState } from 'react';
import { Spinner, useToastContext } from '@librechat/client';
import { QueryKeys, dataService } from 'librechat-data-provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Code2, Globe, Check, Copy, ChevronDown, ExternalLink } from 'lucide-react';
import type { TEmbedWidget } from 'librechat-data-provider';
import { Section, inputClass } from './Settings';
import EmbedSettingsEditor from './Editor';
import { useLocalize } from '~/hooks';

function widgetSnippet(embedId: string) {
  return `<script src="${window.location.origin}/embed.js" data-embed-id="${embedId}" async></script>`;
}

function parseOrigin(raw: string): string | null {
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return null;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const localize = useLocalize();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors"
      onClick={copy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? localize('com_ui_copied') : localize('com_ui_copy')}
    </button>
  );
}

export default function EmbedWidget({
  agentId,
  agentName,
  wide = false,
}: {
  agentId?: string;
  agentName?: string;
  /** Full-page agent builder: settings and preview sit side by side. */
  wide?: boolean;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [originDraft, setOriginDraft] = useState('');

  const queryKey = useMemo(() => [QueryKeys.embedWidgets, agentId] as const, [agentId]);

  const widgetsQuery = useQuery({
    queryKey,
    enabled: Boolean(agentId) && open,
    queryFn: () => dataService.listEmbedWidgets(agentId as string),
  });

  const widget: TEmbedWidget | undefined = widgetsQuery.data?.widgets?.[0];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: (allowedOrigins: string[]) =>
      dataService.createEmbedWidgetLink({
        agent_id: agentId as string,
        allowedOrigins,
      }),
    onSuccess: () => {
      invalidate();
      showToast({ status: 'success', message: localize('com_ui_embed_widget_generated') });
    },
    onError: (err: Error) => {
      showToast({
        status: 'error',
        message: `${localize('com_ui_embed_widget_generate_error')}${
          err.message ? `: ${err.message}` : ''
        }`,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (allowedOrigins: string[]) =>
      dataService.updateEmbedWidgetLink(widget?.embedId as string, { allowedOrigins }),
    onSuccess: invalidate,
    onError: (err: Error) => {
      showToast({
        status: 'error',
        message: `${localize('com_ui_embed_widget_generate_error')}${
          err.message ? `: ${err.message}` : ''
        }`,
      });
    },
  });

  const iconMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return dataService.uploadEmbedWidgetIcon(widget?.embedId as string, formData);
    },
    onSuccess: invalidate,
    onError: (err: Error) => {
      showToast({
        status: 'error',
        message: `${localize('com_ui_embed_icon_error')}${err.message ? `: ${err.message}` : ''}`,
      });
    },
  });

  const addOrigin = () => {
    const origin = parseOrigin(originDraft);
    if (!origin) {
      showToast({ status: 'error', message: localize('com_ui_embed_invalid_origin') });
      return;
    }

    setOriginDraft('');
    if (!agentId) {
      return;
    }

    if (!widget) {
      createMutation.mutate([origin]);
      return;
    }

    if (widget.allowedOrigins.includes(origin)) {
      return;
    }

    updateMutation.mutate([...widget.allowedOrigins, origin]);
  };

  const removeOrigin = (origin: string) => {
    if (!widget) {
      return;
    }
    updateMutation.mutate(widget.allowedOrigins.filter((item) => item !== origin));
  };

  const busy = createMutation.isLoading || updateMutation.isLoading || iconMutation.isLoading;
  const origins = widget?.allowedOrigins ?? [];

  const domains = (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {localize('com_ui_embed_allowed_origins')}
      </span>
      {origins.length === 0 && (
        <p className="text-xs text-text-secondary">{localize('com_ui_embed_no_origins')}</p>
      )}
      {origins.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {origins.map((origin) => (
            <li
              key={origin}
              className="flex max-w-full items-center gap-1.5 rounded-full border border-border-light bg-surface-secondary py-1 pl-3 pr-1.5 text-xs text-text-primary"
            >
              <span className="truncate">{origin}</span>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded-full text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                aria-label={localize('com_ui_embed_remove_origin')}
                onClick={() => removeOrigin(origin)}
                disabled={busy}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={originDraft}
          onChange={(event) => setOriginDraft(event.target.value)}
          placeholder={localize('com_ui_embed_origin_placeholder')}
          aria-label={localize('com_ui_embed_origin_placeholder')}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addOrigin();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-neutral h-10 rounded-lg px-4 text-sm"
          onClick={addOrigin}
          disabled={!agentId || busy || !originDraft.trim()}
        >
          {createMutation.isLoading || updateMutation.isLoading ? (
            <Spinner className="icon-md" aria-hidden="true" />
          ) : (
            localize('com_ui_embed_add_origin')
          )}
        </button>
      </div>
    </div>
  );

  const launcherUpload = (
    <div className="flex items-center gap-3 rounded-lg border border-border-light px-3 py-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-white">
        {widget?.iconUrl ? (
          <img src={widget.iconUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-base" aria-hidden="true">
            💬
          </span>
        )}
      </div>
      <p className="min-w-0 flex-1 text-xs text-text-secondary">
        {localize('com_ui_embed_icon_hint')}
      </p>
      <button
        type="button"
        className="btn btn-neutral h-9 shrink-0 rounded-lg px-3 text-sm"
        disabled={!widget || busy}
        onClick={() => fileInputRef.current?.click()}
      >
        {iconMutation.isLoading ? (
          <Spinner className="icon-md" aria-hidden="true" />
        ) : (
          localize('com_ui_embed_icon_upload')
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            iconMutation.mutate(file);
          }
        }}
      />
    </div>
  );

  const install = widget?.embedId ? (
    <Section
      icon={Code2}
      title={localize('com_ui_embed_group_install')}
      description={localize('com_ui_embed_group_install_desc')}
    >
      <div className="overflow-hidden rounded-lg bg-[#0f1117] text-gray-100">
        <div className="flex items-center justify-between border-b border-white/10 py-1 pl-3 pr-1">
          <span className="text-xs text-gray-400">{localize('com_ui_embed_widget_snippet')}</span>
          <div className="text-gray-200 hover:text-white">
            <CopyButton
              value={widgetSnippet(widget.embedId)}
              label={localize('com_ui_embed_copy_snippet')}
            />
          </div>
        </div>
        <pre
          className="overflow-x-auto whitespace-pre-wrap px-3 py-3 font-mono text-xs leading-relaxed [overflow-wrap:normal]"
          aria-label={localize('com_ui_embed_widget_snippet')}
        >
          {widgetSnippet(widget.embedId)}
        </pre>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-text-secondary">
        <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
        {localize('com_ui_embed_live_note')}
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-primary">
          {localize('com_ui_embed_widget_url')}
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-border-medium bg-surface-secondary pl-3 pr-1 text-text-primary">
          <input
            className="h-10 min-w-0 flex-1 bg-transparent font-mono text-xs focus:outline-none"
            value={widget.embedUrl ?? `${window.location.origin}/embed/${widget.embedId}`}
            readOnly
            aria-label={localize('com_ui_embed_widget_url')}
          />
          <CopyButton
            value={widget.embedUrl ?? `${window.location.origin}/embed/${widget.embedId}`}
            label={localize('com_ui_embed_copy_url')}
          />
        </div>
      </label>
      {domains}
      <div className="flex flex-wrap items-center gap-3 border-t border-border-light pt-4">
        <a
          className="btn btn-neutral flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm"
          href={`${window.location.origin}/widget-demo.html?id=${encodeURIComponent(widget.embedId)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {localize('com_ui_embed_open_demo')}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <p className="min-w-0 flex-1 text-xs text-text-secondary">
          {localize('com_ui_embed_mic_hint')}
        </p>
      </div>
    </Section>
  ) : null;

  return (
    <div
      className={`flex w-full flex-col gap-4 ${wide ? 'mx-auto max-w-6xl px-5 pb-6 md:px-8' : ''}`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl border border-border-light bg-surface-primary px-4 py-3 text-left shadow-sm transition-colors hover:bg-surface-secondary disabled:opacity-50"
        onClick={() => setOpen((value) => !value)}
        disabled={!agentId}
        aria-expanded={open}
        aria-label={localize('com_ui_embed_widget')}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-text-primary">
          <Code2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text-primary">
            {localize('com_ui_embed_widget')}
          </span>
          <span className="block truncate text-xs text-text-secondary">
            {localize('com_ui_embed_widget_desc')}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && widgetsQuery.isLoading && (
        <div className="flex justify-center py-6">
          <Spinner className="icon-md" aria-hidden="true" />
        </div>
      )}

      {open && !widgetsQuery.isLoading && !widget?.embedId && (
        <Section
          icon={Globe}
          title={localize('com_ui_embed_group_install')}
          description={localize('com_ui_embed_group_install_desc')}
        >
          {domains}
        </Section>
      )}

      {open && widget?.embedId && (
        <EmbedSettingsEditor
          widget={widget}
          queryKey={queryKey}
          agentName={agentName}
          agentId={agentId}
          launcherUpload={launcherUpload}
          install={install}
          wide={wide}
        />
      )}
    </div>
  );
}
