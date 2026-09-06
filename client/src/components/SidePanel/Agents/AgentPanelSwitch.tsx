import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import { AgentPanelProvider, useAgentPanelContext } from '~/Providers/AgentPanelContext';
import { Panel, isEphemeralAgent } from '~/common';
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
  const { activePanel, setCurrentAgentId } = useAgentPanelContext();
  const agentId = useRecoilValue(store.conversationAgentIdByIndex(0));

  useEffect(() => {
    const agent_id = initialAgentId ?? agentId ?? '';
    if (!isEphemeralAgent(agent_id)) {
      setCurrentAgentId(agent_id);
    }
  }, [setCurrentAgentId, agentId, initialAgentId]);

  if (activePanel === Panel.version) {
    return <VersionPanel />;
  }
  return <AgentPanel fullPage={fullPage} />;
}
