import { memo } from 'react';
import EmbedOrb from '~/components/Chat/EmbedOrb';

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

/** The large living orb on the landing screen, in a soft glow with a hairline ring. */
export const HeroOrb = memo(function HeroOrb() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 168, height: 168 }}>
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-full bg-[radial-gradient(closest-side,rgba(59,108,246,0.12),rgba(59,108,246,0))] dark:bg-[radial-gradient(closest-side,rgba(120,150,255,0.18),rgba(120,150,255,0))]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-[14px] rounded-full border border-neutral-900/[0.05] dark:border-white/[0.08]"
      />
      <EmbedOrb size={ORB_SIZE} className="relative" />
    </div>
  );
});

export default Backdrop;
