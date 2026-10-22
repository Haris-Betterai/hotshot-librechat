import { useState, useEffect } from 'react';

export type BeamMode = 'full' | 'dim' | 'off';

const IDLE_MS = 12000;
const FADE_MS = 700;

type BeamOptions = {
  enabled: boolean;
  /** The landing screen shows the beam at full strength. */
  landing: boolean;
  /** A reply is streaming. */
  busy: boolean;
  /** Changes whenever the user types, restarting the idle timer. */
  activity: string;
};

function beamMode(enabled: boolean, landing: boolean, idle: boolean): BeamMode {
  if (!enabled) {
    return 'off';
  }
  if (landing) {
    return 'full';
  }
  return idle ? 'dim' : 'off';
}

/**
 * Composer beam state: full on the landing screen, off while a reply streams or the
 * user types, and back at reduced strength once the composer has been idle a while.
 * `mounted` stays true through the fade-out so the beam can animate away before it unmounts.
 */
export default function useBeam({ enabled, landing, busy, activity }: BeamOptions) {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    setIdle(false);
    if (!enabled || landing || busy) {
      return;
    }
    const timer = setTimeout(() => setIdle(true), IDLE_MS);
    return () => clearTimeout(timer);
  }, [enabled, landing, busy, activity]);

  const mode = beamMode(enabled, landing, idle);
  const [mounted, setMounted] = useState(mode !== 'off');

  useEffect(() => {
    if (mode !== 'off') {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(timer);
  }, [mode]);

  return { mode, mounted };
}
