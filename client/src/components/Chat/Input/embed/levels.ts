import { useMemo } from 'react';
import { getIntelligenceOptions } from 'librechat-data-provider';
import { useGetAgentByIdQuery } from '~/data-provider';
import { resolveLabel } from '../Intelligence';
import { useLocalize } from '~/hooks';

/** A level the agent offers: `label` is what the server receives, `name` is what visitors read. */
export type EmbedLevel = { label: string; name: string };

const sameName = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** Every level the agent offers, including the synthetic Auto option, in the agent's order. */
export function useAgentLevels(agentId?: string | null): { levels: EmbedLevel[]; loaded: boolean } {
  const localize = useLocalize();
  const { data: agent } = useGetAgentByIdQuery(agentId);
  const levels = useMemo(
    () =>
      getIntelligenceOptions(agent?.intelligence, agent?.provider).map((option) => ({
        label: option.label,
        name: resolveLabel(option, localize),
      })),
    [agent?.intelligence, agent?.provider, localize],
  );
  return { levels, loaded: agent != null };
}

/** Widget stops: configured names, in order, that the agent actually offers (deduped). */
export function pickStops(available: EmbedLevel[], wanted: string[]): EmbedLevel[] {
  return wanted.reduce<EmbedLevel[]>((stops, want) => {
    const match = available.find(
      (level) => sameName(level.name, want) || sameName(level.label, want),
    );
    return match && !stops.includes(match) ? [...stops, match] : stops;
  }, []);
}
