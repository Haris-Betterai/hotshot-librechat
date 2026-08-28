import { useEffect, useMemo, useState } from 'react';
import { Slider } from '@librechat/client';
import type { Agent } from 'librechat-data-provider';
import { useChatContext, useAgentsMapContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn, isEmbedWidget } from '~/utils';

type Level = { label: string; model: string };

function configuredLevels(agent?: Agent | null): { heading: string; levels: Level[] } | null {
  const levels = (agent?.intelligence?.levels ?? []).filter(
    (level): level is Level => Boolean(level?.label && level?.model),
  );
  if (levels.length === 0) {
    return null;
  }
  return {
    heading: agent?.intelligence?.heading?.trim() || 'Intelligence',
    levels,
  };
}

export default function Intelligence() {
  const localize = useLocalize();
  const { conversation, setConversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const [open, setOpen] = useState(false);
  const isEmbed = isEmbedWidget();

  const agent =
    conversation?.agent_id != null ? agentsMap?.[conversation.agent_id] : undefined;
  const config = useMemo(() => configuredLevels(agent), [agent]);

  useEffect(() => {
    const first = config?.levels[0];
    if (!first || !conversation || conversation.modelLabel) {
      return;
    }
    setConversation((prev) =>
      prev && !prev.modelLabel ? { ...prev, modelLabel: first.label } : prev,
    );
  }, [config, conversation, setConversation]);

  if (!config) {
    return null;
  }

  const selectedIndex = Math.max(
    0,
    config.levels.findIndex((level) => level.label === conversation?.modelLabel),
  );
  const current = config.levels[selectedIndex] ?? config.levels[0];
  const columns = config.levels.length === 1 ? 1 : 2;

  const applyLevel = (index: number) => {
    const level = config.levels[index];
    if (!level) {
      return;
    }
    setConversation((prev) => (prev ? { ...prev, modelLabel: level.label } : prev));
  };

  return (
    <div className={cn('w-full min-w-0 px-3', isEmbed ? 'pb-1 pt-1' : 'pb-1 pt-2')}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border-light bg-surface-primary px-3 py-2 text-left',
          'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span className="min-w-0 truncate text-xs font-semibold text-text-secondary">
          {config.heading}
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-text-primary">
          {current.label}
        </span>
      </button>

      {open && (
        <div className="mt-2 flex w-full min-w-0 flex-col gap-3 rounded-xl border border-border-light bg-surface-primary px-3 py-3">
          <Slider
            value={[selectedIndex]}
            min={0}
            max={Math.max(config.levels.length - 1, 0)}
            step={1}
            onValueChange={(value) => applyLevel(value[0] ?? 0)}
            aria-label={config.heading}
            className="h-10 w-full"
          />
          <div
            className="grid w-full gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${isEmbed || config.levels.length > 2 ? columns : config.levels.length}, minmax(0, 1fr))`,
            }}
          >
            {config.levels.map((level, index) => {
              const selected = index === selectedIndex;
              return (
                <button
                  key={`${level.label}-${index}`}
                  type="button"
                  onClick={() => applyLevel(index)}
                  aria-pressed={selected}
                  className={cn(
                    'min-h-10 truncate rounded-lg border px-2 py-2 text-xs font-medium',
                    selected
                      ? 'border-border-heavy bg-surface-hover text-text-primary'
                      : 'border-border-light text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
          <p className="sr-only">{localize('com_ui_intelligence_hint')}</p>
        </div>
      )}
    </div>
  );
}
