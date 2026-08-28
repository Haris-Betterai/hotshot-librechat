import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Spinner, useToastContext } from '@librechat/client';
import { QueryKeys, dataService } from 'librechat-data-provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TEmbedWidget } from 'librechat-data-provider';
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

export default function EmbedWidget({ agentId }: { agentId?: string }) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [originDraft, setOriginDraft] = useState('');

  const queryKey = useMemo(
    () => [QueryKeys.embedWidgets, agentId] as const,
    [agentId],
  );

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

  const busy =
    createMutation.isLoading || updateMutation.isLoading || iconMutation.isLoading;

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        className="btn btn-neutral border-token-border-light h-9 px-3"
        onClick={() => setOpen((value) => !value)}
        disabled={!agentId}
        aria-expanded={open}
      >
        {localize('com_ui_embed_widget')}
      </button>

      {open && (
        <div className="flex w-full flex-col gap-3 rounded-md border border-border-medium p-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-text-secondary">
              {localize('com_ui_embed_icon')}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-white">
                {widget?.iconUrl ? (
                  <img
                    src={widget.iconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg" aria-hidden="true">
                    💬
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-neutral h-9 px-3 text-sm"
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
            <p className="text-xs text-text-secondary">{localize('com_ui_embed_icon_hint')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-text-secondary">
              {localize('com_ui_embed_allowed_origins')}
            </span>
            {(widget?.allowedOrigins ?? []).length === 0 && (
              <p className="text-xs text-text-secondary">{localize('com_ui_embed_no_origins')}</p>
            )}
            <ul className="flex flex-col gap-1">
              {(widget?.allowedOrigins ?? []).map((origin) => (
                <li
                  key={origin}
                  className="flex items-center justify-between gap-2 rounded border border-border-light px-2 py-1 text-xs"
                >
                  <span className="truncate">{origin}</span>
                  <button
                    type="button"
                    className="text-text-secondary hover:text-text-primary"
                    aria-label={localize('com_ui_embed_remove_origin')}
                    onClick={() => removeOrigin(origin)}
                    disabled={busy}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                className="h-9 min-w-0 flex-1 rounded border border-border-medium bg-surface-primary px-3 text-sm"
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
                className="btn btn-neutral h-9 px-3 text-sm"
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

          {widget?.embedId && (
            <>
              <label className="text-xs font-semibold text-text-secondary">
                {localize('com_ui_embed_widget_url')}
              </label>
              <input
                className="h-9 w-full rounded border border-border-medium bg-surface-primary px-3 text-sm"
                value={widget.embedUrl ?? `${window.location.origin}/embed/${widget.embedId}`}
                readOnly
                aria-label={localize('com_ui_embed_widget_url')}
              />
              <label className="text-xs font-semibold text-text-secondary">
                {localize('com_ui_embed_widget_snippet')}
              </label>
              <textarea
                className="min-h-[88px] w-full resize-y rounded border border-border-medium bg-surface-primary px-3 py-2 text-xs"
                value={widgetSnippet(widget.embedId)}
                readOnly
                aria-label={localize('com_ui_embed_widget_snippet')}
              />
              <p className="text-xs text-text-secondary">{localize('com_ui_embed_mic_hint')}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
