/**
 * The UI kit inside a generated component's frame. It copies the chat's own answer-block styles
 * (Inter, neutral cards, pill buttons like the follow-up chips, fields, checkboxes) so generated
 * components blend in. The classes are listed for the author model in the server's frame contract.
 */

export type Palette = Record<
  | 'ink'
  | 'text'
  | 'muted'
  | 'line'
  | 'lineSoft'
  | 'field'
  | 'surface'
  | 'soft'
  | 'hover'
  | 'accent'
  | 'accentInk'
  | 'ring'
  | 'scheme',
  string
>;

export const LIGHT: Palette = {
  ink: '#171717',
  text: '#262626',
  muted: '#525252',
  line: '#e5e5e5',
  lineSoft: '#f0f0f0',
  field: '#d4d4d4',
  surface: '#ffffff',
  soft: '#f5f5f5',
  hover: '#f5f5f5',
  accent: '#171717',
  accentInk: '#ffffff',
  ring: '#a3a3a3',
  scheme: 'light',
};

export const DARK: Palette = {
  ink: '#fafafa',
  text: '#f5f5f5',
  muted: '#a3a3a3',
  line: '#404040',
  lineSoft: '#2e2e2e',
  field: '#525252',
  surface: '#171717',
  soft: '#262626',
  hover: '#262626',
  accent: '#ffffff',
  accentInk: '#171717',
  ring: '#737373',
  scheme: 'dark',
};

const check = (color: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-7'/%3E%3C/svg%3E")`;

const chevron = (color: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 4l4 4-4 4'/%3E%3C/svg%3E")`;

const fontFaces = (origin: string) =>
  [
    ['Inter-Regular', 400],
    ['Inter-SemiBold', 600],
    ['Inter-Bold', 700],
  ]
    .map(
      ([file, weight]) =>
        `@font-face{font-family:Inter;font-weight:${weight};font-display:swap;src:url(${origin}/assets/fonts/${file}.woff2) format("woff2")}`,
    )
    .join('');

export function kitCss(palette: Palette, origin: string): string {
  const p = palette;
  return `${fontFaces(origin)}
:root{--hs-ink:${p.ink};--hs-text:${p.text};--hs-muted:${p.muted};--hs-line:${p.line};--hs-line-soft:${p.lineSoft};--hs-field:${p.field};--hs-surface:${p.surface};--hs-soft:${p.soft};--hs-hover:${p.hover};--hs-accent:${p.accent};--hs-accent-ink:${p.accentInk};--hs-ring:${p.ring};--hs-radius:16px;color-scheme:${p.scheme}}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
body{padding:2px;color:var(--hs-text);font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0;color:var(--hs-ink);font-weight:600;line-height:1.35}
h1,h2{font-size:16px}h3{font-size:15px}h4{font-size:14px}
p{margin:0}
ul,ol{margin:0;padding:0;list-style:none}
img{max-width:100%;border-radius:12px}
a{color:var(--hs-ink);font-weight:500;text-underline-offset:2px}
:focus-visible{outline:2px solid var(--hs-ring);outline-offset:2px}
.hs-card{background:var(--hs-surface);border:1px solid var(--hs-line);border-radius:var(--hs-radius);padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.hs-stack{display:flex;flex-direction:column;gap:12px}
.hs-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.hs-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
.hs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.hs-title{font-size:15px;font-weight:600;color:var(--hs-ink)}
.hs-muted{color:var(--hs-muted);font-size:13px}
.hs-small{font-size:12px;color:var(--hs-muted)}
.hs-divider{height:1px;background:var(--hs-line);border:0;margin:4px 0}
.hs-badge{display:inline-flex;align-items:center;gap:4px;border-radius:999px;background:var(--hs-soft);color:var(--hs-muted);font-size:12px;font-weight:500;padding:2px 8px}
.hs-tile{border:1px solid var(--hs-line);border-radius:12px;padding:10px 12px;background:var(--hs-surface)}
.hs-tile strong{display:block;color:var(--hs-ink);font-size:15px;font-weight:600}
button,.hs-btn{font:inherit;font-size:14px;line-height:20px;color:var(--hs-text);background:var(--hs-surface);border:1px solid var(--hs-field);border-radius:999px;padding:6px 14px;cursor:pointer;transition:background-color .15s,border-color .15s,opacity .15s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
button:hover,.hs-btn:hover{background:var(--hs-hover)}
button:disabled{opacity:.5;cursor:not-allowed}
.hs-btn-primary{background:var(--hs-accent);border-color:var(--hs-accent);color:var(--hs-accent-ink);border-radius:12px;min-height:40px;padding:8px 16px;font-weight:500}
.hs-btn-primary:hover{background:var(--hs-accent);opacity:.9}
.hs-btn-ghost{border-color:transparent;background:transparent;color:var(--hs-muted);padding:4px 8px}
.hs-btn-ghost:hover{background:var(--hs-hover);color:var(--hs-ink)}
input,select,textarea,.hs-input{font:inherit;font-size:14px;color:var(--hs-ink);background:var(--hs-surface);border:1px solid var(--hs-field);border-radius:8px;padding:8px 12px;width:100%}
input[type=checkbox],input[type=radio]{appearance:none;-webkit-appearance:none;flex:none;width:18px;height:18px;padding:0;margin:1px 0 0;border:1.5px solid var(--hs-field);border-radius:6px;background:var(--hs-surface) center/12px no-repeat;cursor:pointer;transition:background-color .15s,border-color .15s}
input[type=radio]{border-radius:999px}
input[type=checkbox]:checked,input[type=radio]:checked{background-color:var(--hs-accent);border-color:var(--hs-accent);background-image:${check(p.accentInk)}}
.hs-list>li{padding:10px 0;border-bottom:1px solid var(--hs-line-soft)}
.hs-list>li:last-child{border-bottom:0;padding-bottom:0}
.hs-list>li:first-child{padding-top:0}
.hs-check{display:flex;align-items:flex-start;gap:10px;cursor:pointer}
.hs-check>span{flex:1;min-width:0}
.hs-check input:checked+span .hs-title,.hs-check input:checked+span>strong{color:var(--hs-muted);text-decoration:line-through;text-decoration-color:var(--hs-muted)}
.hs-check>span>strong,.hs-check>span>.hs-title{display:block}
.hs-check>span>.hs-muted{display:block;margin-top:2px}
.hs-check>span>br{display:none}
.hs-list .hs-btn-ghost{font-size:12px;line-height:16px;padding:2px 0;margin-top:4px;border:0;background:none;border-radius:4px;color:var(--hs-muted);text-decoration:underline;text-decoration-color:var(--hs-field);text-underline-offset:3px}
.hs-list .hs-btn-ghost:hover{background:none;color:var(--hs-ink);text-decoration-color:currentColor}
.hs-progress{height:6px;border-radius:999px;background:var(--hs-line);overflow:hidden}
.hs-progress>span{display:block;height:100%;border-radius:inherit;background:var(--hs-accent);transition:width .3s ease}
progress{appearance:none;-webkit-appearance:none;width:100%;height:6px;border:0;border-radius:999px;background:var(--hs-line);overflow:hidden}
progress::-webkit-progress-bar{background:var(--hs-line)}
progress::-webkit-progress-value{background:var(--hs-accent);border-radius:999px}
progress::-moz-progress-bar{background:var(--hs-accent)}
details>summary{list-style:none;cursor:pointer;color:var(--hs-muted);font-size:13px;display:inline-flex;align-items:center;gap:4px}
details>summary::-webkit-details-marker{display:none}
details>summary::before{content:"";width:14px;height:14px;background:${chevron(p.muted)} center/14px no-repeat;transition:transform .15s}
details[open]>summary::before{transform:rotate(90deg)}
details>*:not(summary){margin-top:6px;color:var(--hs-muted);font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font-weight:600;color:var(--hs-ink)}
th,td{padding:8px 6px;border-bottom:1px solid var(--hs-line-soft)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;
}
