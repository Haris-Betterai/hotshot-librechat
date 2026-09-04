import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import * as Popover from '@radix-ui/react-popover';
import { useLocalize } from '~/hooks';

type ControlProps = {
  heading: string;
  labels: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
};

export default function Control({ heading, labels, selectedIndex, onChange }: ControlProps) {
  const localize = useLocalize();
  const hintId = useId();
  const selectedLabel = labels[selectedIndex];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={labels.length < 2}
          aria-label={`${heading} ${selectedLabel}`}
          title={`${heading}: ${selectedLabel}`}
          onClick={(event) => event.stopPropagation()}
          className="group inline-flex h-9 max-w-32 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default motion-reduce:transition-none"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown
            className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          aria-label={heading}
          onClick={(event) => event.stopPropagation()}
          className="z-50 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-border-light bg-surface-secondary p-5 shadow-xl outline-none"
        >
          <div
            className="mb-3 flex items-center justify-between text-sm font-medium text-text-secondary"
            aria-hidden="true"
          >
            <span>{localize('com_ui_intelligence_faster')}</span>
            <span>{localize('com_ui_intelligence_smarter')}</span>
          </div>
          <div className="relative">
            <Slider.Root
              min={0}
              max={Math.max(1, labels.length - 1)}
              step={1}
              value={[selectedIndex]}
              onValueChange={([index]) => onChange(index)}
              className="relative flex h-12 w-full touch-none select-none items-center"
            >
              <Slider.Track className="relative h-7 grow overflow-hidden rounded-full bg-black/10 ring-1 ring-inset ring-black/5 dark:bg-white/10 dark:ring-white/5">
                <Slider.Range className="absolute h-full rounded-full bg-[#2494ff]" />
              </Slider.Track>
              <div
                className="pointer-events-none absolute inset-x-[18px] flex justify-between"
                aria-hidden="true"
              >
                {labels.map((label, index) => (
                  <span
                    key={`${label}-${index}`}
                    className="size-1.5 rounded-full bg-black/20 dark:bg-white/25"
                  />
                ))}
              </div>
              <Slider.Thumb
                aria-label={heading}
                aria-valuetext={selectedLabel}
                aria-describedby={hintId}
                className="relative block size-9 cursor-grab rounded-full bg-white shadow-md ring-1 ring-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2494ff] focus-visible:ring-offset-2 focus-visible:ring-offset-surface-secondary active:cursor-grabbing"
              />
            </Slider.Root>
          </div>
          <p id={hintId} className="sr-only">
            {localize('com_ui_intelligence_hint')}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
