import { useEffect, useMemo } from 'react';
import { getIntelligenceOptions } from 'librechat-data-provider';
import { useGetAgentByIdQuery } from '~/data-provider';
import { useChatContext } from '~/Providers';
import Control from './intelligence/Control';
import { useLocalize } from '~/hooks';

const presetLabels = {
  fast: 'com_ui_intelligence_fast',
  balanced: 'com_ui_intelligence_balanced',
  deep: 'com_ui_intelligence_deep',
  deeper: 'com_ui_intelligence_deeper',
  deepest: 'com_ui_intelligence_deepest',
} as const;

export default function Intelligence() {
  const localize = useLocalize();
  const { conversation, setConversation } = useChatContext();
  const { data: agent } = useGetAgentByIdQuery(conversation?.agent_id);
  const levels = useMemo(
    () => getIntelligenceOptions(agent?.intelligence, agent?.provider),
    [agent?.intelligence, agent?.provider],
  );
  const heading =
    agent?.intelligence?.heading?.trim() || localize('com_ui_intelligence_heading_placeholder');
  const firstLabel = levels[0]?.label;
  const modelLabel = conversation?.modelLabel;

  useEffect(() => {
    if (!firstLabel || modelLabel) {
      return;
    }
    setConversation((prev) =>
      prev && !prev.modelLabel ? { ...prev, modelLabel: firstLabel } : prev,
    );
  }, [firstLabel, modelLabel, setConversation]);

  if (!conversation || !levels.length) {
    return null;
  }

  const selectedIndex = Math.max(
    0,
    levels.findIndex((level) => level.label === modelLabel),
  );
  const applyLevel = (index: number) => {
    const level = levels[index];
    if (!level) {
      return;
    }
    setConversation((prev) => (prev ? { ...prev, modelLabel: level.label } : prev));
  };

  return (
    <Control
      heading={heading}
      labels={levels.map((level) =>
        level.preset ? localize(presetLabels[level.preset]) : level.label,
      )}
      selectedIndex={selectedIndex}
      onChange={applyLevel}
    />
  );
}
