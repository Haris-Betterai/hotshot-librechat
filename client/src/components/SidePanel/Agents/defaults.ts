import type { TModelSpec } from 'librechat-data-provider';

type AgentSummary = { id?: string; updatedAt?: string | Date };

const timestamp = (agent: AgentSummary): number =>
  agent.updatedAt ? new Date(agent.updatedAt).getTime() || 0 : 0;

/** Agent id of the model spec marked default, if any. */
export function getDefaultSpecAgentId(specs?: TModelSpec[]): string | undefined {
  return specs?.find((spec) => spec.default && spec.preset.agent_id)?.preset.agent_id ?? undefined;
}

/** The agent the builder opens on: the default spec's agent, else the most recently updated one. */
export function pickDefaultAgentId(
  editableAgents: AgentSummary[],
  specs?: TModelSpec[],
): string | undefined {
  const specAgentId = getDefaultSpecAgentId(specs);
  if (specAgentId && editableAgents.some((agent) => agent.id === specAgentId)) {
    return specAgentId;
  }
  const [latest] = [...editableAgents].sort((a, b) => timestamp(b) - timestamp(a));
  return latest?.id;
}

/** Icon configured on a model spec that targets this agent. */
export function getSpecIconForAgent(
  agentId?: string | null,
  specs?: TModelSpec[],
): string | undefined {
  if (!agentId) {
    return undefined;
  }
  const spec = specs?.find(
    (entry) => entry.preset.agent_id === agentId && (entry.iconURL || entry.preset.iconURL),
  );
  return spec?.iconURL || spec?.preset.iconURL || undefined;
}
