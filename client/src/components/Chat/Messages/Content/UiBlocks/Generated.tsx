import React, { useEffect, useMemo, useRef, useState } from 'react';
import { safeUiUrl } from 'librechat-data-provider';
import type { TGenUiComponent } from 'librechat-data-provider';
import { SendGate, useIsEmbed } from './shared';
import { useLocalize } from '~/hooks';

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 1400;
const MAX_SEND = 500;

const CSP =
  "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:";

type Palette = Record<
  'ink' | 'muted' | 'line' | 'surface' | 'soft' | 'accent' | 'accentInk' | 'scheme',
  string
>;

const LIGHT: Palette = {
  ink: '#171717',
  muted: '#525252',
  line: '#e5e5e5',
  surface: '#ffffff',
  soft: '#f5f5f5',
  accent: '#171717',
  accentInk: '#ffffff',
  scheme: 'light',
};

const DARK: Palette = {
  ink: '#f5f5f5',
  muted: '#a3a3a3',
  line: '#404040',
  surface: '#171717',
  soft: '#262626',
  accent: '#ffffff',
  accentInk: '#171717',
  scheme: 'dark',
};

const LINE_SEPARATOR = new RegExp('\\u2028', 'g');
const PARAGRAPH_SEPARATOR = new RegExp('\\u2029', 'g');

/** JSON that is safe inside an inline script. */
const inlineJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029');

/** Wraps a generated component in a document with the frame contract it was written against. */
export function buildFrameDocument(params: {
  html: string;
  props: Record<string, unknown>;
  token: string;
  palette: Palette;
}): string {
  const { palette } = params;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{--hs-ink:${palette.ink};--hs-muted:${palette.muted};--hs-line:${palette.line};--hs-surface:${palette.surface};--hs-soft:${palette.soft};--hs-accent:${palette.accent};--hs-accent-ink:${palette.accentInk};--hs-radius:16px;color-scheme:${palette.scheme}}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent;color:var(--hs-ink);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}
body{padding:2px}
img{max-width:100%}
</style>
<script>
(function(){
  var token=${inlineJson(params.token)};
  function post(message){message.token=token;parent.postMessage(message,'*');}
  window.hotshot={
    props:${inlineJson(params.props)},
    send:function(text){post({type:'send',text:String(text)});},
    open:function(url){post({type:'open',url:String(url)});}
  };
  function size(){post({type:'resize',height:Math.ceil(document.body.getBoundingClientRect().height)+4});}
  addEventListener('load',function(){size();new ResizeObserver(size).observe(document.body);});
  addEventListener('error',function(){post({type:'error'});});
})();
</script></head><body>${params.html}</body></html>`;
}

type FrameMessage =
  | { type: 'resize'; height: number; token: string }
  | { type: 'send'; text: string; token: string }
  | { type: 'open'; url: string; token: string }
  | { type: 'error'; token: string };

const isFrameMessage = (data: unknown, token: string): data is FrameMessage =>
  typeof data === 'object' &&
  data !== null &&
  (data as { token?: unknown }).token === token &&
  typeof (data as { type?: unknown }).type === 'string';

/** Read once per frame: a new palette would rebuild the document and reload the frame. */
const readPalette = (isEmbed: boolean): Palette => {
  const dark = document.documentElement.classList.contains('dark');
  const base = dark ? DARK : LIGHT;
  if (!isEmbed) {
    return base;
  }
  const brand = getComputedStyle(document.documentElement).getPropertyValue('--embed-brand').trim();
  return { ...base, accent: brand || '#3b6cf6', accentInk: '#ffffff' };
};

type FrameProps = {
  component: TGenUiComponent;
  props: Record<string, unknown>;
  send?: (text: string) => void;
  canSend: boolean;
  onReady?: () => void;
  onFail?: () => void;
};

function Frame({ component, props, send, canSend, onReady, onFail }: FrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const isEmbed = useIsEmbed();
  const [palette] = useState(() => readPalette(isEmbed));
  const [token] = useState(() => Math.random().toString(36).slice(2));
  const srcDoc = useMemo(
    () => buildFrameDocument({ html: component.html, props, token, palette }),
    [component.html, props, token, palette],
  );
  const callbacks = useRef({ onReady, onFail, send, canSend });
  callbacks.current = { onReady, onFail, send, canSend };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || !isFrameMessage(event.data, token)) {
        return;
      }
      const message = event.data;
      const current = callbacks.current;
      if (message.type === 'resize') {
        setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Number(message.height) || 0)));
        current.onReady?.();
        return;
      }
      if (message.type === 'error') {
        current.onFail?.();
        return;
      }
      if (message.type === 'open') {
        const url = safeUiUrl(message.url);
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        return;
      }
      const text = message.text.trim().slice(0, MAX_SEND);
      if (current.canSend && current.send && text) {
        current.send(text);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [token]);

  return (
    <iframe
      ref={frameRef}
      title={component.name}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="block w-full border-0 bg-transparent"
      style={{ height: height || MIN_HEIGHT }}
    />
  );
}

type GeneratedProps = {
  component: TGenUiComponent;
  props: Record<string, unknown>;
  /** Called once the frame has laid out and reported its height. */
  onReady?: () => void;
  onFail?: () => void;
};

/** A component an LLM wrote, run in a sandboxed frame under the answer. */
export default function Generated({ component, props, onReady, onFail }: GeneratedProps) {
  const localize = useLocalize();
  return (
    <section
      aria-label={localize('com_ui_genui_label', { 0: component.name })}
      className="ui-block not-prose w-full max-w-2xl"
      data-genui={component.key}
    >
      <SendGate>
        {(send, enabled) => (
          <Frame
            component={component}
            props={props}
            send={send}
            canSend={enabled}
            onReady={onReady}
            onFail={onFail}
          />
        )}
      </SendGate>
    </section>
  );
}
