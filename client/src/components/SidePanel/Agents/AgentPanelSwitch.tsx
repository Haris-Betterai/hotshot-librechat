import { useEffect, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { PermissionBits } from 'librechat-data-provider';
import { AgentPanelProvider, useAgentPanelContext } from '~/Providers/AgentPanelContext';
import { useListAgentsQuery, useGetStartupConfig } from '~/data-provider';
import { Panel, isEphemeralAgent } from '~/common';
import { pickDefaultAgentId } from './defaults';
import VersionPanel from './Version/VersionPanel';
import AgentPanel from './AgentPanel';
import store from '~/store';

export default function AgentPanelSwitch({
  fullPage = false,
  initialAgentId,
}: {
  fullPage?: boolean;
  initialAgentId?: string;
}) {
  return (
    <AgentPanelProvider>
      <AgentPanelSwitchWithContext fullPage={fullPage} initialAgentId={initialAgentId} />
    </AgentPanelProvider>
  );
}

function AgentPanelSwitchWithContext({
  fullPage,
  initialAgentId,
}: {
  fullPage: boolean;
  initialAgentId?: string;
}) {
  const { activePanel, agent_id: currentAgentId, setCurrentAgentId } = useAgentPanelContext();
  const agentId = useRecoilValue(store.conversationAgentIdByIndex(0));
  const { data: startupConfig } = useGetStartupConfig();
  const autoSelected = useRef(false);
  const { data: editableAgents } = useListAgentsQuery(
    { requiredPermission: PermissionBits.EDIT },
    { enabled: fullPage, select: (res) => res.data },
  );

  useEffect(() => {
    const agent_id = initialAgentId ?? agentId ?? '';
    if (!isEphemeralAgent(agent_id)) {
      setCurrentAgentId(agent_id);
    }
  }, [setCurrentAgentId, agentId, initialAgentId]);

  /** Opens the full-page builder on the live agent once, so "New agent" stays an explicit choice. */
  useEffect(() => {
    if (!fullPage || autoSelected.current || !editableAgents || startupConfig == null) {
      return;
    }
    if (currentAgentId || initialAgentId || !isEphemeralAgent(agentId ?? '')) {
      autoSelected.current = true;
      return;
    }
    autoSelected.current = true;
    const defaultId = pickDefaultAgentId(editableAgents, startupConfig.modelSpecs?.list);
    if (defaultId) {
      setCurrentAgentId(defaultId);
    }
  }, [
    fullPage,
    editableAgents,
    startupConfig,
    currentAgentId,
    initialAgentId,
    agentId,
    setCurrentAgentId,
  ]);

  if (activePanel === Panel.version) {
    return <VersionPanel />;
  }
  return <AgentPanel fullPage={fullPage} />;
}
