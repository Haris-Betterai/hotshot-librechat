import type { OpenAICredentials } from './openai';
import { respondJson } from './openai';

export const MAX_COMPONENT_HTML = 60_000;

/** What a generated component may rely on inside its sandboxed frame. */
/** Bump when the frame's UI kit changes; components written for an older kit are no longer offered. */
export const KIT_VERSION = 3;

/** What a generated component may rely on inside its sandboxed frame. */
export const FRAME_CONTRACT = `The component runs inside a sandboxed iframe under a chat answer (no same-origin access, no network).
- Write only the inner content: HTML elements, at most one small <style> and one inline <script>. No <html>, <head> or <body> tags.
- Data arrives as window.hotshot.props (a plain object matching your props schema). Render from it; never hard-code the example values.
- window.hotshot.send(text) sends text as the customer's next chat message. Use it for buttons that continue the conversation.
- window.hotshot.open(url) opens an https link in a new tab. Plain <a href> links do not work in the sandbox.
- No external scripts, stylesheets, fonts, fetch, XHR, WebSocket, forms that submit, localStorage or cookies. Images only from https URLs found in the props.

It must look like part of the chat, which already loads a UI kit in the frame (Inter 14px, neutral greys, white cards). Build only with these classes and plain elements:
- .hs-card: the outer wrapper (white, thin border, 16px radius). Use exactly one, around everything.
- Layout: .hs-stack (vertical, 12px gap), .hs-row (wrapping row, 8px gap), .hs-between (space-between row), .hs-grid (responsive tiles).
- Text: h3 for the title (or .hs-title), .hs-muted for secondary text, .hs-small for fine print, .hs-badge for a small pill label, .hs-divider for a rule.
- .hs-tile: a small bordered box, e.g. a stat with <strong> value and .hs-small label.
- Buttons: a plain <button> already looks like the chat's follow-up chips; .hs-btn-primary for the one main action; .hs-btn-ghost for quiet actions such as Reset.
- Calls to action are required. End the card with a footer row (.hs-row) holding one .hs-btn-primary that moves the customer forward: hotshot.open(url) to a product or page URL from the props, or, when there is no URL, hotshot.send(text) with the natural next question (e.g. "Which anti-gel should I use for -20°F?"). Add one or two plain <button> chips beside it for other next steps. In lists of steps or items, give each row a small .hs-btn-ghost "Ask about this" (or similar) button that calls hotshot.send with a question about that row. Put CTA labels and messages in the props, written from the answer.
- Fields: <input>, <select> and <textarea> are pre-styled; checkboxes and radios are pre-styled rounded boxes with a check mark.
- Lists: <ul class="hs-list"> gives separated rows. A checklist row is <li><label class="hs-check"><input type="checkbox"><span><strong>Step</strong><span class="hs-muted">detail</span></span></label></li>; checked rows fade and strike through on their own.
- Progress: <div class="hs-progress"><span style="width:40%"></span></div>, or a <progress> element.
- <details><summary>More</summary>…</details> is pre-styled for expandable notes. Tables are pre-styled.
Do not set colours, fonts, font sizes, borders, radii, shadows or form-control styles yourself, and do not restyle these classes. Your <style>, if any, may only add layout (grid, flex, widths, gaps, spacing). Use no emoji and no icons.
- It must fit widths from 300px to 720px with no horizontal scroll, and stay compact: short labels, no repeated paragraphs from the answer.
- Be accessible: real <button> and <label> elements, clear labels, keyboard support (Enter on inputs).
- Keep it under 300 lines. It must work with any props that match the schema.`;

export type AuthoredComponent = {
  key: string;
  name: string;
  description: string;
  propsSchema: Record<string, unknown>;
  props: Record<string, unknown>;
  html: string;
};

type AuthorOutput = {
  key: string;
  name: string;
  description: string;
  props_schema_json: string;
  props_json: string;
  html: string;
};

const AUTHOR_SCHEMA = {
  name: 'hotshot_component',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['key', 'name', 'description', 'props_schema_json', 'props_json', 'html'],
    properties: {
      key: {
        type: 'string',
        description: 'snake_case slug, 3-40 chars, describing the kind of UI',
      },
      name: { type: 'string', description: 'Short human name, e.g. "Maintenance schedule"' },
      description: {
        type: 'string',
        description:
          'One or two sentences: what it shows and which answers it fits. Generic, reusable.',
      },
      props_schema_json: {
        type: 'string',
        description: 'JSON Schema (as a JSON string) of the props',
      },
      props_json: { type: 'string', description: 'Props for this answer (as a JSON string)' },
      html: { type: 'string', description: 'The component markup, style and script' },
    },
  },
};

const FORBIDDEN = [
  /<script[^>]+src\s*=/i,
  /<link\b/i,
  /<iframe\b/i,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /WebSocket/,
  /\bimport\s*\(/,
  /document\.cookie/,
  /localStorage|sessionStorage|indexedDB/,
  /window\.(top|parent)\b/,
];

const parseObject = (json: string): Record<string, unknown> | null => {
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

/** Rejects code that breaks the frame contract; the sandbox and CSP enforce it again. */
export function checkComponentHtml(html: string): string | null {
  if (!html.trim()) {
    return 'empty';
  }
  if (html.length > MAX_COMPONENT_HTML) {
    return 'too large';
  }
  const hit = FORBIDDEN.find((pattern) => pattern.test(html));
  return hit ? `uses ${hit.source}` : null;
}

/** Asks a model to write a new reusable component for this answer. */
export async function authorComponent(
  credentials: OpenAICredentials,
  params: {
    model: string;
    effort: 'low' | 'medium';
    conversation: string;
    existingKeys: string[];
  },
): Promise<AuthoredComponent> {
  const output = await respondJson<AuthorOutput>(credentials, {
    model: params.model,
    effort: params.effort,
    timeoutMs: 150_000,
    schema: AUTHOR_SCHEMA,
    instructions: `You design small interactive UI components for Hotshot AI, the customer chat of Hot Shot's Secret (diesel and gasoline additives, oils and treatments).
A decision model judged that the latest answer below needs a visual or interactive component that does not exist yet. Write one reusable component for this kind of answer, then fill its props from the answer.
Use only facts from the conversation; never invent prices, doses, URLs or claims. The component sits under the answer text, so it should add structure or interaction (a checklist, steps, a schedule, a chart, a selector), not repeat the text. It must end with calls to action that lead the customer to the next step or the right product.
Do not reuse these existing keys: ${params.existingKeys.join(', ') || 'none'}.

${FRAME_CONTRACT}`,
    input: params.conversation,
  });

  const propsSchema = parseObject(output.props_schema_json);
  const props = parseObject(output.props_json);
  const key = slug(output.key);
  const problem = checkComponentHtml(output.html);
  if (!propsSchema || !props || key.length < 3 || problem) {
    throw new Error(`authored component rejected: ${problem ?? 'bad key, schema or props'}`);
  }
  return {
    key,
    name: output.name.trim().slice(0, 80),
    description: output.description.trim().slice(0, 400),
    propsSchema,
    props,
    html: output.html,
  };
}
