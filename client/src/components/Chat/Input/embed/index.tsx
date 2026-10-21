import { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import useEmbedWidgetSettings from '~/hooks/useEmbedWidgetSettings';
import { useAgentLevels, pickStops } from './levels';
import { useChatContext } from '~/Providers';
import LevelSlider from './LevelSlider';
import LevelGauge from './LevelGauge';
import { useLocalize } from '~/hooks';

/** ChatGPT-style thinking-level control for the embed composer; hidden with fewer than 2 stops. */
export default function EmbedLevelControl() {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const { settings } = useEmbedWidgetSettings();
  const { conversation, setConversation } = useChatContext();
  const { levels, loaded } = useAgentLevels(conversation?.agent_id);
  const stops = useMemo(() => pickStops(levels, settings.levels), [levels, settings.levels]);
  const modelLabel = conversation?.modelLabel;
  const matched = stops.findIndex((stop) => stop.label === modelLabel);
  const hidden = stops.length < 2;
  const defaultLabel = stops[0]?.label;

  useEffect(() => {
    if (!loaded) {
      return;
    }
    if (hidden) {
      setConversation((prev) => (prev?.modelLabel ? { ...prev, modelLabel: undefined } : prev));
      return;
    }
    if (matched >= 0 || !defaultLabel) {
      return;
    }
    setConversation((prev) =>
      prev && prev.modelLabel !== defaultLabel ? { ...prev, modelLabel: defaultLabel } : prev,
    );
  }, [loaded, hidden, matched, defaultLabel, setConversation]);

  if (!conversation || hidden) {
    return null;
  }

  const selectedIndex = Math.max(0, matched);
  const names = stops.map((stop) => stop.name);
  const apply = (index: number) => {
    const label = stops[index]?.label;
    if (!label) {
      return;
    }
    setConversation((prev) => (prev ? { ...prev, modelLabel: label } : prev));
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <LevelGauge
          name={names[selectedIndex]}
          fraction={selectedIndex / (stops.length - 1)}
          open={open}
          onClick={(event) => event.stopPropagation()}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          aria-label={localize('com_ui_embed_level_label')}
          onClick={(event) => event.stopPropagation()}
          className="z-50 w-64 max-w-[calc(100vw-24px)] rounded-2xl border border-border-light bg-surface-primary px-5 py-4 shadow-xl outline-none"
        >
          <LevelSlider names={names} selectedIndex={selectedIndex} onChange={apply} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
