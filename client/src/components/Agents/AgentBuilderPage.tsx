import { ArrowLeft, Bot } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
import { useLocalize } from '~/hooks';

export default function AgentBuilderPage() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialAgentId = searchParams.get('agent_id') ?? undefined;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-surface-primary text-text-primary">
      <header className="flex flex-shrink-0 items-center gap-4 border-b border-border-light px-5 py-4 md:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-light px-3 text-sm font-medium transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
          aria-label={localize('com_ui_back_to_chat')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{localize('com_ui_back_to_chat')}</span>
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{localize('com_ui_agent_setup')}</h1>
            <p className="truncate text-xs text-text-secondary">
              {localize('com_ui_agent_setup_description')}
            </p>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <AgentPanelSwitch fullPage initialAgentId={initialAgentId} />
      </main>
    </div>
  );
}
