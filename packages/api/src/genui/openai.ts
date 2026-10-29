const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export type OpenAICredentials = { apiKey: string; baseURL?: string };

export type DecisionChoice = { value: string; description: string };

export type DecisionQuestion =
  | { type: 'predicate'; name: string; instructions: string }
  | { type: 'choice'; name: string; instructions: string; choices: DecisionChoice[] };

export type DecisionMessage = { role: 'user' | 'assistant' | 'developer'; content: string };

export type DecisionAnswer =
  | { type: 'predicate'; name: string | null; probability: number }
  | { type: 'choice'; name: string | null; choice: string | boolean; confidence: number }
  | { type: 'refusal'; name: string | null };

type ResponsesOutput = {
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  error?: { message?: string } | null;
};

const endpoint = (credentials: OpenAICredentials, path: string) =>
  `${(credentials.baseURL || DEFAULT_BASE_URL).replace(/\/+$/, '')}${path}`;

async function post<T>(
  credentials: OpenAICredentials,
  path: string,
  body: object,
  timeoutMs: number,
): Promise<T> {
  const response = await fetch(endpoint(credentials, path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`OpenAI ${path} ${response.status}: ${detail}`);
  }
  return (await response.json()) as T;
}

/** Asks OpenAI's Decisions API (gpt-6-luna) classification questions about a conversation. */
export async function decide(
  credentials: OpenAICredentials,
  input: DecisionMessage[],
  questions: DecisionQuestion[],
): Promise<DecisionAnswer[]> {
  const result = await post<{ answers?: DecisionAnswer[] }>(
    credentials,
    '/decisions',
    { model: 'gpt-6-luna', input, questions, prompt_cache_key: 'hotshot-genui' },
    20_000,
  );
  return result.answers ?? [];
}

const outputText = (result: ResponsesOutput): string =>
  (result.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .map((part) => (part.type === 'output_text' ? (part.text ?? '') : ''))
    .join('');

/** Runs a Responses API call whose answer must be one JSON object. */
export async function respondJson<T>(
  credentials: OpenAICredentials,
  params: {
    model: string;
    instructions: string;
    input: string;
    schema?: { name: string; schema: object };
    effort?: 'none' | 'low' | 'medium' | 'high';
    timeoutMs: number;
  },
): Promise<T> {
  const format = params.schema
    ? { type: 'json_schema', name: params.schema.name, schema: params.schema.schema, strict: true }
    : { type: 'json_object' };
  const result = await post<ResponsesOutput>(
    credentials,
    '/responses',
    {
      model: params.model,
      instructions: params.instructions,
      input: params.input,
      text: { format },
      ...(params.effort ? { reasoning: { effort: params.effort } } : {}),
      store: false,
    },
    params.timeoutMs,
  );
  const text = outputText(result);
  if (!text) {
    throw new Error(`OpenAI ${params.model} returned no text`);
  }
  return JSON.parse(text) as T;
}
