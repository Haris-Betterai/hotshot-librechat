import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from '@librechat/client';
import { useGetEmbedWidgetConfigQuery } from '~/data-provider';
import { markEmbedWidget } from '~/utils/embed';
import { useLocalize } from '~/hooks';

/**
 * Entry point for the chat mounted inside a customer site's embed iframe
 * (`client/public/embed.js` points its iframe `src` at `/embed/:embedId`).
 *
 * This route owns exactly one job — resolve `embedId` to the agent it's
 * configured for, then hand off to the normal chat route — so it works the
 * same way regardless of whether the visitor already holds a valid session
 * (a return visit, a page reload) or is arriving fresh. `ChatRoute` picks the
 * agent up from the `agent_id` query param via its own existing preset
 * resolution, independent of however the guest session itself gets
 * established.
 *
 * Origin allowlisting for who may embed this page at all is enforced
 * upstream, via `Content-Security-Policy: frame-ancestors` on the
 * `/embed/:embedId` document response (see `api/server/index.js`) — this
 * component only needs to resolve the config, not re-check the origin.
 */
export default function EmbedRoute() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { embedId } = useParams<{ embedId: string }>();
  const { data, isError } = useGetEmbedWidgetConfigQuery(embedId);

  useEffect(() => {
    if (!data?.agentId) {
      return;
    }
    markEmbedWidget();
    navigate(`/c/new?agent_id=${encodeURIComponent(data.agentId)}&embed=1`, { replace: true });
  }, [data, navigate]);

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center px-4 text-center">
        <p className="text-sm text-text-secondary">{localize('com_ui_embed_unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center" aria-live="polite" role="status">
      <Spinner className="text-text-primary" />
    </div>
  );
}
