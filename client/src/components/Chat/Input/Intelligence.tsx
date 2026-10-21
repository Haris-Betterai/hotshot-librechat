import { useEffect, useMemo } from 'react';
import { getIntelligenceOptions, getDefaultIntelligenceIndex } from 'librechat-data-provider';
import type { IntelligenceOption } from 'librechat-data-provider';
import { useGetAgentByIdQuery } from '~/data-provider';
import { useChatContext } from '~/Providers';
import Control from './intelligence/Control';
import { useLocalize } from '~/hooks';

type Localize = ReturnType<typeof useLocalize>;

const presetLabels = {
  fast: 'com_ui_intelligence_fast',
  balanced: 'com_ui_intelligence_balanced',
  deep: 'com_ui_intelligence_deep',
  deeper: 'com_ui_intelligence_deeper',
  deepest: 'com_ui_intelligence_deepest',
} as const;

const purposeLabels = {
  fast: 'com_ui_intelligence_fast_purpose',
  balanced: 'com_ui_intelligence_balanced_purpose',
  deep: 'com_ui_intelligence_deep_purpose',
  deeper: 'com_ui_intelligence_deeper_purpose',
  deepest: 'com_ui_intelligence_deepest_purpose',
} as const;

export function resolveLabel(level: IntelligenceOption, localize: Localize): string {
  if (level.auto) {
    return level.label || localize('com_ui_intelligence_auto');
  }
  return level.preset ? localize(presetLabels[level.preset]) : level.label;
}

function resolveDescription(level: IntelligenceOption, localize: Localize): string {
  if (level.description) {
    return level.description;
  }
  if (level.auto) {
    return localize('com_ui_intelligence_auto_purpose');
  }
  return level.preset ? localize(purposeLabels[level.preset]) : '';
}

export default function Intelligence() {
  const localize = useLocalize();
  const { conversation, setConversation } = useChatContext();
  const { data: agent } = useGetAgentByIdQuery(conversation?.agent_id);
  const levels = useMemo(
    () => getIntelligenceOptions(agent?.intelligence, agent?.provider),
    [agent?.intelligence, agent?.provider],
  );
  const { labels, descriptions } = useMemo(() => {
    const levelLabels: string[] = [];
    const levelDescriptions: string[] = [];
    for (const level of levels) {
      levelLabels.push(resolveLabel(level, localize));
      levelDescriptions.push(resolveDescription(level, localize));
    }
    return { labels: levelLabels, descriptions: levelDescriptions };
  }, [levels, localize]);
  const heading =
    agent?.intelligence?.heading?.trim() || localize('com_ui_intelligence_heading_placeholder');
  const defaultIndex = getDefaultIntelligenceIndex(levels, agent?.intelligence?.default_level);
  const defaultLabel = levels[defaultIndex]?.label;
  const modelLabel = conversation?.modelLabel;

  useEffect(() => {
    if (!defaultLabel || modelLabel) {
      return;
    }
    setConversation((prev) =>
      prev && !prev.modelLabel ? { ...prev, modelLabel: defaultLabel } : prev,
    );
  }, [defaultLabel, modelLabel, setConversation]);

  if (!conversation || !levels.length) {
    return null;
  }

  const matchedIndex = levels.findIndex((level) => level.label === modelLabel);
  const selectedIndex = matchedIndex >= 0 ? matchedIndex : defaultIndex;
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
      labels={labels}
      descriptions={descriptions}
      selectedIndex={selectedIndex}
      onChange={applyLevel}
    />
  );
}
