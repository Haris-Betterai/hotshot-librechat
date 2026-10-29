import { logger } from '@librechat/data-schemas';
import {
  ContentTypes,
  EModelEndpoint,
  parseUiBlock,
  UI_BLOCK_LANGUAGE,
} from 'librechat-data-provider';
import type { TGenUiResult, TMessageContentParts, TUiBlock } from 'librechat-data-provider';
import type { GenUiMethods, IMessage, IGenUiRender } from '@librechat/data-schemas';
import type { DecisionAnswer, DecisionChoice, OpenAICredentials } from './openai';
import { BUILT_IN_BLOCKS, BUILT_IN_BY_TYPE } from './catalog';
import { authorComponent } from './author';
import { decide, respondJson } from './openai';

export type GenUiDeps = GenUiMethods & {
  getMessage: (params: { user: string; messageId: string }) => Promise<IMessage | null>;
  getUserKeyValues: (params: { userId: string; name: string }) => Promise<Record<string, string>>;
};

export type GenUiRequest = {
  user: string;
  messageId: string;
  conversationId?: string;
  run?: boolean;
};

const NONE = 'none';
const NEW = 'new';
const BLOCK_PREFIX = 'block:';
const SAVED_PREFIX = 'saved:';
const MIN_CONFIDENCE = 0.45;
const MIN_NEW_WORTH = 0.6;
const MIN_ANSWER_CHARS = 60;
const MAX_EVIDENCE_CHARS = 12_000;
const STALE_PENDING_MS = 4 * 60_000;
const EXTRACT_MODEL = 'gpt-6-luna';
const MESSAGE_RETRY_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const env = () => ({
  enabled: process.env.GENUI_ENABLED !== 'false',
  authorModel: process.env.GENUI_AUTHOR_MODEL || 'gpt-6.1-sol',
  maxNewPerDay: Number(process.env.GENUI_MAX_NEW_PER_DAY) || 25,
});

const BLOCK_PATTERN = new RegExp('```' + UI_BLOCK_LANGUAGE + '\\s*([\\s\\S]*?)```', 'g');
const URL_PATTERN = /^https?:\/\//i;

type Transcript = {
  question: string;
  answer: string;
  evidence: string;
  /** The agent already put a visual block (not just follow-ups) in the answer. */
  hasVisualBlock: boolean;
};

const partText = (part: TMessageContentParts | undefined): string => {
  if (part?.type !== ContentTypes.TEXT) {
    return '';
  }
  const text: unknown = part.text;
  if (typeof text === 'string') {
    return text;
  }
  return text && typeof text === 'object' && 'value' in text ? String(text.value) : '';
};

const toolOutput = (part: TMessageContentParts | undefined): string => {
  if (part?.type !== ContentTypes.TOOL_CALL) {
    return '';
  }
  const call = part.tool_call as { name?: string; output?: string } | undefined;
  return call?.output ? `[${call.name ?? 'tool'}] ${call.output}` : '';
};

const messageText = (message: IMessage | null): string => {
  if (!message) {
    return '';
  }
  const parts = (message.content ?? []) as Array<TMessageContentParts | undefined>;
  const text = parts.map(partText).join('\n').trim();
  return text || (message.text ?? '');
};

function readTranscript(question: IMessage | null, message: IMessage): Transcript {
  const raw = messageText(message);
  let hasVisualBlock = false;
  const answer = raw
    .replace(BLOCK_PATTERN, (_match, source: string) => {
      const block = parseUiBlock(source.trim());
      if (block && block.type !== 'quick_replies') {
        hasVisualBlock = true;
      }
      return '';
    })
    .trim();
  const parts = (message.content ?? []) as Array<TMessageContentParts | undefined>;
  const evidence = parts.map(toolOutput).filter(Boolean).join('\n').slice(0, MAX_EVIDENCE_CHARS);
  return { question: messageText(question), answer, evidence, hasVisualBlock };
}

/** Drops any link or image the model wrote that the answer and its tool results never contained. */
function keepKnownUrls<T>(value: T, known: string): T {
  if (Array.isArray(value)) {
    return value.map((item) => keepKnownUrls(item, known)) as T;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, item]) => typeof item !== 'string' || !URL_PATTERN.test(item) || known.includes(item),
  );
  return Object.fromEntries(entries.map(([key, item]) => [key, keepKnownUrls(item, known)])) as T;
}

const conversationText = (transcript: Transcript) =>
  [
    `Customer: ${transcript.question}`,
    `Assistant answer:\n${transcript.answer}`,
    transcript.evidence ? `Tool results the answer used:\n${transcript.evidence}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

function decisionChoices(saved: Array<{ key: string; description: string }>): DecisionChoice[] {
  return [
    {
      value: NONE,
      description: 'Plain text is enough. No visual or interactive element would help.',
    },
    ...BUILT_IN_BLOCKS.map((block) => ({
      value: `${BLOCK_PREFIX}${block.type}`,
      description: block.description,
    })),
    ...saved.map((component) => ({
      value: `${SAVED_PREFIX}${component.key}`,
      description: component.description,
    })),
    {
      value: NEW,
      description:
        'None of the other options fit, but a purpose-built visual or interactive component (for example a checklist, step-by-step guide, maintenance schedule, timeline, symptom checker or chart) would make this answer clearly easier to act on.',
    },
  ];
}

const answerNamed = (answers: DecisionAnswer[], name: string) =>
  answers.find((answer) => answer.name === name);

async function chooseUi(
  credentials: OpenAICredentials,
  transcript: Transcript,
  saved: Array<{ key: string; description: string }>,
): Promise<{ choice: string; confidence: number }> {
  const answers = await decide(
    credentials,
    [
      { role: 'user', content: transcript.question },
      { role: 'assistant', content: transcript.answer },
    ],
    [
      {
        type: 'choice',
        name: 'ui',
        instructions:
          "Which UI, shown under the assistant's latest answer, would help the customer most? Pick a component only when the answer contains the facts it needs.",
        choices: decisionChoices(saved),
      },
      {
        type: 'predicate',
        name: 'worth',
        instructions:
          'A visual or interactive component would make this answer clearly easier to understand or act on than the text alone.',
      },
    ],
  );
  const ui = answerNamed(answers, 'ui');
  const worth = answerNamed(answers, 'worth');
  if (ui?.type !== 'choice' || typeof ui.choice !== 'string') {
    return { choice: NONE, confidence: 0 };
  }
  const worthProbability = worth?.type === 'predicate' ? worth.probability : 0;
  const tooUnsure = ui.confidence < MIN_CONFIDENCE;
  const notWorthNew = ui.choice === NEW && worthProbability < MIN_NEW_WORTH;
  if (tooUnsure || notWorthNew) {
    return { choice: NONE, confidence: ui.confidence };
  }
  return { choice: ui.choice, confidence: ui.confidence };
}

async function fillBuiltIn(
  credentials: OpenAICredentials,
  type: string,
  transcript: Transcript,
): Promise<TUiBlock | null> {
  const builtIn = BUILT_IN_BY_TYPE.get(type);
  if (!builtIn) {
    return null;
  }
  const raw = await respondJson<Record<string, unknown>>(credentials, {
    model: EXTRACT_MODEL,
    timeoutMs: 45_000,
    instructions: `Fill one "${type}" UI block for the assistant's answer, as a JSON object in exactly this shape:
${builtIn.format}
Use only facts, names, prices, links and image URLs that appear in the conversation or tool results. Leave optional fields out rather than guessing.`,
    input: conversationText(transcript),
  });
  const known = `${transcript.answer}\n${transcript.evidence}`;
  return parseUiBlock(JSON.stringify(keepKnownUrls({ ...raw, type }, known)));
}

async function fillSaved(
  credentials: OpenAICredentials,
  component: { name: string; propsSchema: Record<string, unknown> },
  transcript: Transcript,
): Promise<Record<string, unknown>> {
  const props = await respondJson<Record<string, unknown>>(credentials, {
    model: EXTRACT_MODEL,
    timeoutMs: 45_000,
    instructions: `Fill the props of the "${component.name}" UI component for the assistant's answer, as one JSON object matching this JSON Schema:
${JSON.stringify(component.propsSchema)}
Use only facts that appear in the conversation or tool results; never invent prices, doses or links.`,
    input: conversationText(transcript),
  });
  return keepKnownUrls(props, `${transcript.answer}\n${transcript.evidence}`);
}

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

async function build(deps: GenUiDeps, request: GenUiRequest): Promise<void> {
  const { user, messageId } = request;
  const message =
    (await deps.getMessage({ user, messageId })) ??
    (await wait(MESSAGE_RETRY_MS).then(() => deps.getMessage({ user, messageId })));
  if (!message || message.isCreatedByUser || message.error || message.unfinished) {
    await deps.updateGenUiRender(messageId, { status: 'none', choice: NONE });
    return;
  }
  const question = message.parentMessageId
    ? await deps.getMessage({ user, messageId: message.parentMessageId })
    : null;
  const transcript = readTranscript(question, message);
  if (transcript.hasVisualBlock || transcript.answer.length < MIN_ANSWER_CHARS) {
    await deps.updateGenUiRender(messageId, { status: 'none', choice: 'agent' });
    return;
  }

  const keys = await deps.getUserKeyValues({ userId: user, name: EModelEndpoint.openAI });
  if (!keys?.apiKey) {
    throw new Error('no OpenAI key available');
  }
  const credentials: OpenAICredentials = { apiKey: keys.apiKey, baseURL: keys.baseURL };
  const saved = await deps.listGenUiComponents(80);
  const { choice, confidence } = await chooseUi(credentials, transcript, saved);
  logger.info(`[genui] ${messageId} → ${choice} (${confidence.toFixed(2)})`);
  if (choice !== NONE) {
    await deps.updateGenUiRender(messageId, { choice, confidence });
  }

  if (choice.startsWith(BLOCK_PREFIX)) {
    const block = await fillBuiltIn(credentials, choice.slice(BLOCK_PREFIX.length), transcript);
    await deps.updateGenUiRender(messageId, {
      choice,
      confidence,
      ...(block ? { status: 'ready', block } : { status: 'none' }),
    });
    return;
  }

  if (choice.startsWith(SAVED_PREFIX)) {
    const key = choice.slice(SAVED_PREFIX.length);
    const component = saved.find((item) => item.key === key);
    if (!component) {
      await deps.updateGenUiRender(messageId, { status: 'none', choice, confidence });
      return;
    }
    const props = await fillSaved(credentials, component, transcript);
    await deps.markGenUiComponentUsed(key);
    await deps.updateGenUiRender(messageId, {
      status: 'ready',
      choice,
      confidence,
      componentKey: key,
      props,
    });
    return;
  }

  if (choice !== NEW) {
    await deps.updateGenUiRender(messageId, { status: 'none', choice, confidence });
    return;
  }

  const createdToday = await deps.countGenUiComponentsSince(startOfToday());
  if (createdToday >= env().maxNewPerDay) {
    await deps.updateGenUiRender(messageId, {
      status: 'none',
      choice,
      confidence,
      error: 'daily limit',
    });
    return;
  }
  const authored = await authorComponent(credentials, {
    model: env().authorModel,
    conversation: conversationText(transcript),
    existingKeys: saved.map((item) => item.key),
  });
  const component = await deps.saveGenUiComponent({
    key: authored.key,
    name: authored.name,
    description: authored.description,
    propsSchema: authored.propsSchema,
    html: authored.html,
    authorModel: env().authorModel,
  });
  await deps.markGenUiComponentUsed(component.key);
  await deps.updateGenUiRender(messageId, {
    status: 'ready',
    choice,
    confidence,
    componentKey: component.key,
    props: keepKnownUrls(authored.props, `${transcript.answer}\n${transcript.evidence}`),
  });
}

async function toResult(deps: GenUiDeps, render: IGenUiRender): Promise<TGenUiResult> {
  const stale =
    render.status === 'pending' &&
    Date.now() - new Date(render.updatedAt ?? render.createdAt ?? 0).getTime() > STALE_PENDING_MS;
  if (stale) {
    return { status: 'none' };
  }
  if (render.status !== 'ready') {
    return { status: render.status, choice: render.choice };
  }
  if (render.block) {
    const block = parseUiBlock(JSON.stringify(render.block));
    return block ? { status: 'ready', choice: render.choice, block } : { status: 'none' };
  }
  const component = render.componentKey ? await deps.getGenUiComponent(render.componentKey) : null;
  if (!component) {
    return { status: 'none' };
  }
  return {
    status: 'ready',
    choice: render.choice,
    created: render.choice === NEW,
    component: { key: component.key, name: component.name, html: component.html },
    props: render.props ?? {},
  };
}

/**
 * Generative UI for one assistant message. OpenAI's Decisions model picks the UI: nothing, one of
 * the built-in answer blocks, a component saved earlier, or a new one. A new component is written
 * by an LLM on the spot and saved, so later answers can pick it too.
 *
 * With `run`, the first call claims the message and builds in the background (returns `pending`);
 * later calls return the stored result.
 */
export async function getGenUi(deps: GenUiDeps, request: GenUiRequest): Promise<TGenUiResult> {
  const existing = await deps.getGenUiRender(request.messageId, request.user);
  if (existing) {
    return toResult(deps, existing);
  }
  if (!request.run || !env().enabled) {
    return { status: 'none' };
  }
  const claimed = await deps.claimGenUiRender({
    messageId: request.messageId,
    conversationId: request.conversationId,
    user: request.user,
  });
  if (!claimed) {
    return { status: 'pending' };
  }
  build(deps, request).catch(async (error: Error) => {
    logger.error(`[genui] ${request.messageId} failed: ${error.message}`);
    await deps
      .updateGenUiRender(request.messageId, { status: 'error', error: error.message.slice(0, 300) })
      .catch(() => undefined);
  });
  return { status: 'pending' };
}
