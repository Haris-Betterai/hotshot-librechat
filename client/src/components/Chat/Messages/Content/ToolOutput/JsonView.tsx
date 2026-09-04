import { useMemo } from 'react';

/**
 * Readable renderer for structured tool output. MCP tools return records
 * (product rows, fluid capacities, scrape metadata) that read poorly as a raw
 * `JSON.stringify` dump — this renders them as labelled rows, bulleted lists
 * and links instead, falling back to preformatted text for shapes that do not
 * map cleanly (very deep nesting, mixed arrays).
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const MAX_DEPTH = 4;

/** `fluid_capacity_name` → `Fluid capacity name` */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, (_m, a: string, b: string) => `${a} ${b.toLowerCase()}`);
  const trimmed = spaced.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return key;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function isPrimitive(value: JsonValue): value is string | number | boolean | null {
  return value === null || typeof value !== 'object';
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function ScalarValue({ value }: { value: string | number | boolean | null }) {
  if (value === null || value === '') {
    return <span className="text-text-secondary">—</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-text-primary">{value ? 'Yes' : 'No'}</span>;
  }
  if (typeof value === 'number') {
    return <span className="tabular-nums text-text-primary">{value}</span>;
  }
  if (isHttpUrl(value)) {
    return (
      <a
        href={value.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-text-primary underline underline-offset-2 hover:text-text-primary"
      >
        {value.trim()}
      </a>
    );
  }
  return <span className="whitespace-pre-wrap break-words text-text-primary">{value}</span>;
}

function ValueNode({ value, depth }: { value: JsonValue; depth: number }) {
  if (isPrimitive(value)) {
    return <ScalarValue value={value} />;
  }

  if (depth >= MAX_DEPTH) {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-secondary">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-text-secondary">—</span>;
    }
    if (value.every(isPrimitive)) {
      return (
        <ul className="list-disc space-y-1 pl-4 marker:text-text-secondary">
          {value.map((entry, index) => (
            <li key={index}>
              <ScalarValue value={entry as string | number | boolean | null} />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-2">
        {value.map((entry, index) => (
          <div
            key={index}
            className="border-l border-border-medium pl-3 first:border-l-transparent first:pl-0"
          >
            <ValueNode value={entry} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <ObjectNode data={value} depth={depth} />;
}

function ObjectNode({ data, depth }: { data: { [key: string]: JsonValue }; depth: number }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <span className="text-text-secondary">—</span>;
  }

  return (
    <dl className="space-y-2">
      {entries.map(([key, value]) => {
        const label = humanizeKey(key);
        /** Scalars read best inline; nested structures need the label on its
         *  own line so the block below it is not squeezed into a narrow column. */
        if (isPrimitive(value)) {
          return (
            <div key={key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="shrink-0 font-medium text-text-secondary">{label}</dt>
              <dd className="min-w-0 flex-1">
                <ScalarValue value={value} />
              </dd>
            </div>
          );
        }
        return (
          <div key={key} className="space-y-1">
            <dt className="font-medium text-text-secondary">{label}</dt>
            <dd className="min-w-0">
              <ValueNode value={value} depth={depth + 1} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Close whatever brackets are still open, ignoring bracket characters that
 *  appear inside strings. Returns undefined if the text ends mid-string. */
function closeOpenBrackets(text: string): string | undefined {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      stack.pop();
    }
  }

  if (inString) {
    return undefined;
  }
  return text + stack.reverse().join('');
}

/** Indices of every top-level-safe comma (not inside a string), latest first. */
function commaPositions(text: string): number[] {
  const positions: number[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === ',') {
      positions.push(i);
    }
  }
  return positions.reverse();
}

const MAX_REPAIR_ATTEMPTS = 8;

interface ParsedOutput {
  value: JsonValue;
  truncated: boolean;
}

/**
 * Split text into consecutive balanced JSON documents. A tool that returns
 * several content blocks arrives as those documents concatenated, which
 * `JSON.parse` rejects outright ("unexpected non-whitespace character after
 * JSON"). A trailing unbalanced document is returned as-is for repair.
 */
function splitJsonDocuments(text: string): string[] {
  const documents: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0 && start >= 0) {
        documents.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  if (depth > 0 && start >= 0) {
    documents.push(text.slice(start));
  }
  return documents;
}

/** Parse one document, repairing a cut-off tail if needed. */
function parseDocument(text: string): ParsedOutput | undefined {
  const trimmed = text.trim();
  try {
    return { value: JSON.parse(trimmed) as JsonValue, truncated: false };
  } catch {
    // Fall through to repair
  }

  const commas = commaPositions(trimmed);
  for (let i = 0; i < Math.min(commas.length, MAX_REPAIR_ATTEMPTS); i++) {
    const candidate = closeOpenBrackets(trimmed.slice(0, commas[i]));
    if (candidate === undefined) {
      continue;
    }
    try {
      return { value: JSON.parse(candidate) as JsonValue, truncated: true };
    } catch {
      // Try an earlier cut point
    }
  }
  return undefined;
}

/**
 * Parse tool output that may not be a single clean JSON document: MCP tools
 * return several content blocks (which arrive concatenated), and long payloads
 * can be cut off mid-value. Recovers whichever documents did arrive intact.
 */
export function parseLenient(json: string): ParsedOutput | undefined {
  const trimmed = json.trim();
  const direct = parseDocument(trimmed);
  if (direct && !direct.truncated) {
    return direct;
  }

  const documents = splitJsonDocuments(trimmed);
  if (documents.length > 1) {
    const values: JsonValue[] = [];
    let truncated = false;
    for (const document of documents) {
      const parsed = parseDocument(document);
      if (!parsed) {
        truncated = true;
        continue;
      }
      values.push(parsed.value);
      truncated = truncated || parsed.truncated;
    }
    if (values.length > 0) {
      return { value: values.length === 1 ? values[0] : values, truncated };
    }
  }

  return direct;
}

export default function JsonView({ json }: { json: string }) {
  const parsed = useMemo(() => parseLenient(json), [json]);

  if (parsed === undefined) {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-secondary">
        {json}
      </pre>
    );
  }

  return (
    <div className="text-xs leading-relaxed">
      <ValueNode value={parsed.value} depth={0} />
      {parsed.truncated && (
        <p className="mt-2 border-t border-border-light pt-2 text-text-secondary">
          Result was cut off — showing the part that was returned.
        </p>
      )}
    </div>
  );
}
