import React, { useEffect, useMemo, useRef, useState } from 'react';
import { safeUiUrl } from 'librechat-data-provider';
import type { TGenUiComponent } from 'librechat-data-provider';
import { DARK, LIGHT, kitCss } from './kit';
import type { Palette } from './kit';
import { SendGate, useIsEmbed } from './shared';
import { useLocalize } from '~/hooks';

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 1400;
const MAX_SEND = 500;

const csp = (origin: string) =>
  `default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src ${origin} data:`;

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
  /** Where the chat's own fonts are served from. */
  origin?: string;
}): string {
  const origin = params.origin ?? window.location.origin;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp(origin)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${kitCss(params.palette, origin)}</style>
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
