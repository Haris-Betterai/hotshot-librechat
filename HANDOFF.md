# Handoff — Hotshot Secret AI session (2026-09-04)

Live site: **https://hotshotai.thebetterai.com** — verified on commit `8f6e2281d`, confirmed
by sending a real message and reading the rendered DOM, not just trusting the deploy script.

For the deploy mechanics themselves (branches, `deploy.sh`, tunnel setup), see
**[CHANGES.md](./CHANGES.md)**, **[WORKFLOW.md](./WORKFLOW.md)**, **[LOCAL_DEV.md](./LOCAL_DEV.md)**.
This file is a session log: what changed, why, what's still open, and one real incident.

---

## What shipped, in commit order

1. **`7d8486e45`** — Branding, copy, tool-call UI
   - Hotshot orb avatar (from the Dribbble GIF, converted to a 241 KB animated WebP) wired via
     the model spec's `iconURL`. This also fixed the broken default avatar (the agent record
     points at a `/images/...` path that only exists on the server, not in a local checkout).
   - Landing description, 4 conversation starters, meta description — replaced LibreChat
     boilerplate with real Hotshot copy in `librechat.yaml`.
   - `showOnLanding` now takes precedence over the agent's own description when set (was
     backwards — the agent record always won before).
   - Humanized MCP tool names (`get_all_fluid_capacities` → "fluid capacities") and added a
     running label for the tool group (was stuck on "Used N tools" even while still running).

2. **`b8c46b93a`** — Quiet tool block, readable JSON
   - Collapsed tool group reads as a plain "Tools" chip once settled; card chrome only while
     running or expanded.
   - Structured tool output renders as labelled rows / bulleted lists instead of raw JSON, with
     humanized keys and clickable URLs (`JsonView.tsx`).
   - `parseLenient()` handles two real failure modes found in production payloads: multiple JSON
     documents concatenated (one per MCP content block — `JSON.parse` rejects this outright) and
     genuinely truncated payloads. Both covered by tests.

3. **`679befece` → `d753fe869` → `8d000dc2d`** — Intelligence selector, and the outage it caused
   **Read the incident section below before touching `intelligence.ts` or the model levels.**

4. **`8f6e2281d`** — Responding-model badge, streaming pacing
   - See "Four message-header implementations" below — this is the one worth knowing before
     you next touch anything in `client/src/components/*Messages*`.
   - `useSmoothedStreamText` paces the visual reveal of streaming text to ~420 chars/sec instead
     of popping in whatever a network chunk happened to contain. Does **not** add a per-character
     fade — see "Not done" below.

Also shipped, smaller: MCP URL trailing-slash fix (was causing a 307 redirect on every single
tool call — cosmetic in prod since redirects are fast, but pure waste), a widget-specific model
spec (`hotshot-secret-ai-widget`) with shorter formatting instructions for the embed iframe, and
a brand color wash (lime/amber radial gradients sampled from hotshotsecret.com, `hs-brand-wash`
in `style.css`).

---

## Incident: intelligence selector broke every reply in production

**What happened.** The intelligence/model-level selector was disconnected from the backend
(`modelLabel` was commented out of the schema). Re-enabling it — a one-line change — was tested
locally against the *transactions log*, which showed the model correctly switching
(`gpt-5.6-luna`, `gpt-5.6`, etc.). That looked like success and shipped to production. Every
reply then started failing with:

```
400 Function tools with reasoning_effort are not supported for gpt-5.6-luna in
/v1/chat/completions. To use function tools, use /v1/responses or set
reasoning_effort to 'none'.
```

**Root cause.** The local verification only sent single-word prompts that never triggered a tool
call. This agent calls MCP tools on nearly every real question. GPT-5.6 models reason by default
and OpenAI rejects function tools alongside reasoning on `/v1/chat/completions` — the codebase
already had a guard for this (`requiresResponsesApiForReasoning` in
`packages/api/src/endpoints/openai/llm.ts`), but it only fires when a `reasoning_effort` was
*explicitly requested*. The "Fast" tier maps to `gpt-5.6-luna` with **no** effort configured, so
it never entered the guard and stayed on the endpoint that rejects tool calls — meaning the
model's own default reasoning broke it, not anything the app sent.

**Fix (`8d000dc2d`).** `responsesApiOverride()` in `packages/api/src/agents/intelligence.ts` sets
`useResponsesApi: true` directly from the agent's tool list, at the point in
`packages/api/src/agents/initialize.ts` where the resolved model and tools are both already
known — instead of trying to widen the shared, well-tested upstream guard (which has a
deliberate test asserting it should *not* auto-switch without an explicit effort — don't touch
that guard for this).

**Verification that actually caught it, before the next deploy:** a tool-calling question sent at
*both ends* of the slider (Fast → `gpt-5.6-luna`, Deepest → `gpt-5.6`) on the live site, checking
the tool chip fires and a real answer comes back — not just checking the transactions log for the
right model name.

**Takeaway for next time:** verifying "the model switched" is not the same as verifying "the
agent still works." For a tool-heavy agent, the cheap single-word test proves nothing about the
actual failure mode. Always send a question that forces at least one tool call before calling a
model-routing change verified.

---

## Four message-header implementations (read before touching message rendering)

This surprised me and cost real time to find, so it's worth writing down explicitly: the message
row header (name + timestamp) is implemented **four separate times**, with no shared component
beyond the leaf-level `MessageTimestamp`:

| File | Used for |
|---|---|
| `client/src/components/Chat/Messages/MessageParts.tsx` | *(not the live agents-endpoint chat)* |
| `client/src/components/Chat/Messages/ui/MessageRender.tsx` | *(not the live agents-endpoint chat)* |
| `client/src/components/Chat/Messages/SearchMessage.tsx` | Search results view |
| `client/src/components/Messages/ContentRender.tsx` | **The actual live Hotshot chat** |

Also: `client/src/components/Share/Message.tsx` (public share links), and two smaller ones
(`Content/SiblingHeader.tsx`, `Content/Parts/SteerPart.tsx`) not touched this session — lower
traffic, left alone to keep the change scoped.

**How I found the live one:** I added a header badge to the first three (obvious candidates by
name/location), tested them, confirmed via unit tests, and reported it working. It wasn't
visible in the browser. The server-side field was confirmed correct via a direct network
response check. The only reliable way to find which component was *actually mounted* was walking
the live React fiber tree in the browser console:

```js
const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('<agent name>'));
let node = h2[Object.keys(h2).find(k => k.startsWith('__reactFiber$'))];
// walk node.return up the tree, read node.type.name / node.memoizedProps
```

`MessageModelBadge.tsx` (`client/src/components/Chat/Messages/ui/MessageModelBadge.tsx`) is now
wired into all five of the header implementations above except the two left alone. If you add a
sibling header feature in the future, grep `MessageTimestamp` usages first — that import is the
fastest way to find every place a message header exists in this codebase.

---

## What's built but not fully proven: streaming text pacing

`client/src/hooks/Messages/useSmoothedStreamText.ts` — paces the reveal rate of streaming text
so a burst of several sentences in one network chunk doesn't pop in as a single flash. Covered by
5 deterministic tests using fake timers (`useSmoothedStreamText.test.ts`) — those pass and
exercise the real logic (catch-up cap, snap-on-stream-end, clamp-on-shrink).

**Not independently confirmed by eye in this session.** The reveal ticks every 40ms, faster than
this environment's browser-automation round-trip time, so screenshot/poll-based visual
verification kept missing the window. I stopped trying rather than keep spending turns on it —
the unit tests are the real evidence here, not a screenshot. If you want visual confirmation,
watch it directly in a normal browser tab rather than through automation.

**Explicitly not shipped:** a true per-character *fade* on newly-revealed text (the original ask).
CSS `@keyframes` animations only fire once, on element mount — a paragraph fades in when first
created, but every character streamed into it afterward just updates the existing text node in
place (React reuses the DOM node), so no further animation fires. A real glyph-level fade needs
either an AST-level transform on the markdown tree (isolating just-streamed characters into their
own animated span without breaking mid-token bold/links/code blocks) or a masking trick that only
works correctly for single-line text. Neither was attempted — pacing alone was judged the safer,
still-valuable improvement to ship same-day as a production incident.

---

## Open items

- **Web search tool access** — asked for, not built. Confirmed LibreChat's built-in `webSearch`
  config supports Serper/SearXNG/Tavily as providers — not literally "OpenAI's web search tool."
  If the ask is the OpenAI Responses API's own `web_search` tool (model decides when to search,
  no separate provider key), that's a smaller, different integration. Needs a decision on which
  before building either.
- **`CUSTOM_FOOTER` lives in `.env`, not `librechat.yaml`** — despite `interface.customFooter`
  existing in the schema, the actual footer route reads `process.env.CUSTOM_FOOTER`
  (`api/server/routes/config.js`). Set on both local and production `.env` this session; anyone
  rotating `.env` files should carry it forward. A comment was left in `librechat.yaml` noting
  this so it isn't rediscovered the hard way again.
- **Agent's own copy is stale** — the agent (DB record, not this repo) re-introduces itself as
  "Alex from Hot Shot's Secret" on every turn before answering, and says "Hot Shot's Secret"
  while the UI says "Hotshot Secret AI." Left alone deliberately — editable via staff login,
  didn't want to touch the production agent record without being asked.
- **Privacy policy** still points at `librechat.ai/privacy-policy`.
- **`SiblingHeader.tsx` / `SteerPart.tsx`** don't have the model badge — see table above.

---

## Two things worth knowing about this deploy setup specifically

**`.env` is not something to sync wholesale between laptop and server.** Diffed key-by-key this
session: the only genuine gap was `CUSTOM_FOOTER`. `DOMAIN_CLIENT`/`DOMAIN_SERVER` differ
*correctly* — production uses `http://0.0.0.0:6041`, local dev uses `http://localhost:6041`,
exactly as `LOCAL_DEV.md` says to set them. A wholesale copy in either direction silently breaks
the other environment.

**A background deploy command needs its log path checked before it's trusted.** Mid-session, a
deploy was reported as "done" based on a background shell's exit code, but the log redirect
target was a stale path from before an earlier session interruption — the shell failed before
SSH even connected, and the server sat on the old commit while it was reported live. Caught by
checking the server's actual git HEAD directly rather than trusting the command's own report.
The lesson generalizes: **verify a deploy against the server's own state** (git HEAD, a live
request, a DOM check) — never the deploy script's stdout alone, and never a background task's
exit code alone.
