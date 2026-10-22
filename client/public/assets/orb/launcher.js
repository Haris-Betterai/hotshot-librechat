/* Animated launcher orb for embed.js: black dots that cycle through the thinking-orbs
   states. Loaded as a module next to embed.js; embed.js keeps the static SVG if this
   never loads (old browsers, strict CSP). */
import { MODE_FRAMES, resolvePreset } from './engine.js';

const CYCLE = ['searching', 'breathing', 'composing', 'working'];
const SEG = 3.5;
const BLEND = 0.6;

function weights(t) {
  const i = Math.floor(t / SEG);
  const p = (t - i * SEG - (SEG - BLEND)) / BLEND;
  const current = CYCLE[i % CYCLE.length];
  if (p <= 0) {
    return [[current, 1]];
  }
  const k = Math.min(1, p) * Math.min(1, p) * (3 - 2 * Math.min(1, p));
  return [[current, 1 - k], [CYCLE[(i + 1) % CYCLE.length], k]];
}

/** Draws into `canvas` until it leaves the page; one still frame when motion is reduced. */
export function mountOrb(canvas, size) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const scale = (size * dpr) / 64;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();

  function paint(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (const [state, w] of weights(t)) {
      const preset = resolvePreset(state, 64);
      for (const d of MODE_FRAMES[preset.mode](64, t * preset.speed, preset.opts).dots) {
        const a = Math.min(1, (d.a == null ? 1 : d.a) * 2.2) * (0.5 + 0.5 * (1 - d.white)) * w;
        ctx.fillStyle = 'rgba(13,13,13,' + a + ')';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function frame(now) {
    if (!canvas.isConnected) {
      return;
    }
    paint((now - start) / 1000);
    window.requestAnimationFrame(frame);
  }

  if (reduced) {
    paint(0);
    return;
  }
  window.requestAnimationFrame(frame);
}

window.__hotshotMountOrb = mountOrb;
