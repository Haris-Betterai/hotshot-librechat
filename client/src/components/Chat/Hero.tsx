import { memo } from 'react';
import { Package, Activity, ShieldCheck } from 'lucide-react';
import EmbedOrb from '~/components/Chat/EmbedOrb';
import { useLocalize } from '~/hooks';

const ORB_SIZE = 112;

/** Decorative backdrop: a soft spotlight and a fine dot grid that fades out towards the edges. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-[18%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(59,108,246,0.10),rgba(59,108,246,0))] dark:bg-[radial-gradient(closest-side,rgba(120,150,255,0.14),rgba(120,150,255,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(13,13,13,0.07)_1px,transparent_1.4px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_55%_50%_at_50%_38%,#000_20%,transparent_100%)] dark:bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1.4px)]" />
    </div>
  );
}

/** The large living orb on the landing screen, set in a soft halo. */
export const HeroOrb = memo(function HeroOrb() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 168, height: 168 }}>
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,1),rgba(255,255,255,0.6)_55%,rgba(255,255,255,0))] dark:bg-[radial-gradient(closest-side,rgba(40,44,56,0.9),rgba(40,44,56,0))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-[18px] rounded-full border border-neutral-900/[0.06] shadow-[0_10px_40px_-12px_rgba(13,13,13,0.18)] dark:border-white/10 dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]"
      />
      <EmbedOrb size={ORB_SIZE} className="relative" />
    </div>
  );
});

/** Three short capability chips under the landing description. */
export function Capabilities() {
  const localize = useLocalize();
  const items = [
    { icon: Package, label: localize('com_ui_landing_cap_product') },
    { icon: Activity, label: localize('com_ui_landing_cap_diagnostics') },
    { icon: ShieldCheck, label: localize('com_ui_landing_cap_safety') },
  ];
  return (
    <ul className="animate-fadeIn mt-5 flex flex-wrap items-center justify-center gap-2">
      {items.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
        >
          <Icon className="size-3.5 text-[#3B6CF6] dark:text-[#8DB0FF]" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

export default Backdrop;
