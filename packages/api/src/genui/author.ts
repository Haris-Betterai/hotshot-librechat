import type { OpenAICredentials } from './openai';
import { respondJson } from './openai';

export const MAX_COMPONENT_HTML = 60_000;

/** What a generated component may rely on inside its sandboxed frame. */
export const FRAME_CONTRACT = `The component runs inside a sandboxed iframe in a chat answer (no same-origin access, no network).
- Write only the inner content: HTML elements, one <style> and one inline <script>. No <html>, <head> or <body> tags.
- Data arrives as window.hotshot.props (a plain object matching your props schema). Render from it; never hard-code the example values.
- window.hotshot.send(text) sends text as the customer's next chat message. Use it for buttons that continue the conversation.
- window.hotshot.open(url) opens an https link in a new tab. Plain <a href> links do not work in the sandbox.
- No external scripts, stylesheets, fonts, fetch, XHR, WebSocket, forms that submit, localStorage or cookies. Images only from https URLs found in the props.
- CSS variables are provided: --hs-ink (text), --hs-muted (secondary text), --hs-line (borders), --hs-surface (card background), --hs-soft (subtle fill), --hs-accent (#3b6cf6 brand blue), --hs-accent-ink (text on accent), --hs-radius (16px). The body already uses a system font at 15px on a transparent background.
- Look modern and calm: one card or a clean list, 12-16px padding, rounded corners, thin borders, no heavy shadows, no emoji. It must fit widths from 300px to 720px with no horizontal scroll.
- Be accessible: real <button> elements with clear labels, visible focus, enough contrast, and keyboard support (Enter on inputs).
- Keep it under 400 lines. It must work with any props that match the schema.`;

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
  params: { model: string; conversation: string; existingKeys: string[] },
): Promise<AuthoredComponent> {
  const output = await respondJson<AuthorOutput>(credentials, {
    model: params.model,
    effort: 'low',
    timeoutMs: 150_000,
    schema: AUTHOR_SCHEMA,
    instructions: `You design small interactive UI components for Hotshot AI, the customer chat of Hot Shot's Secret (diesel and gasoline additives, oils and treatments).
A decision model judged that the latest answer below needs a visual or interactive component that does not exist yet. Write one reusable component for this kind of answer, then fill its props from the answer.
Use only facts from the conversation; never invent prices, doses, URLs or claims. The component sits under the answer text, so it should add structure or interaction (a checklist, steps, a schedule, a chart, a selector), not repeat the text.
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
