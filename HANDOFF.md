# Handoff — Hotshot Secret AI

Working notes for the LibreChat fork behind **https://hotshotai.thebetterai.com**. Organised by
topic rather than by session — the condensed session log is at the end.

Companion docs: **[STRESS_TESTS.md](./STRESS_TESTS.md)** (adversarial scenarios + results),
**[VIEWS.md](./VIEWS.md)** (customer vs staff URLs), **[WORKFLOW.md](./WORKFLOW.md)** (deploy),
**[LOCAL_DEV.md](./LOCAL_DEV.md)**, **[CHANGES.md](./CHANGES.md)**.

Last substantive update: **2026-09-08** (intelligence-mode audit, five fixes, tier policy).

---

## Where things stand today

| | State |
|---|---|
| Production | `https://hotshotai.thebetterai.com`, LibreChat commit **`47a10616a`** on `main` (deployed 2026-10-20 23:09 UTC) |
| MCP server | commit **`0e0cb25`** on the **`improving`** branch (NOT `main` — see [MCP server](#mcp-server)); product data re-scraped 2026-10-20, **133/133 priced** |
| Live agent | Hotshot Secret AI — 6 levels on GPT-6, **Auto** default (Balanced → Deep), web search limited to `hotshotsecret.com`, learning enabled |
| Local tree | clean apart from the generated `admin-branding/guest/index.html` |
| Local app | `http://localhost:6041`, runs against the **production** agent, prompt, MCP and Mongo via SSH tunnel |

**The live intelligence ladder**, saved on the agent record 2026-10-20 (see [REVIEW.md](./REVIEW.md)):

| Level | Model | Reasoning effort | Live test (tool-calling question) |
|---|---|---|---|
| Fast | `gpt-6-luna` | None | 12s, 3 tool calls, OK |
| Balanced | `gpt-6.1-sol` | Low | 15s, product search + web search, OK |
| Deep | `gpt-6.1-sol` | Medium | 21s, OK |
| Deeper | `gpt-6.1-sol` | High | not separately tested |
| Deepest | `gpt-6.1-sol` | Max | ~45s, OK |
| Ultra | `gpt-6-astra` | High | 18s, OK — most expensive ($10/$50 per MTok); top tier only |

GPT-6 Astra and GPT-6.1 Sol reject `none`; the editor filters it out and the server normalises it at
save and run time. **Never point the ladder at a new model family without first widening the
Responses-API guard** (`RESPONSES_API_MODEL_PATTERN` / `responsesApiRequiredPattern`) — see the
incident below.

**Production uses LibreChat's default `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CREDS_KEY` and
`CREDS_IV`** (startup log warnings). These are public values: anyone can mint a valid token. Rotate
them — it logs everyone out, and `CREDS_KEY`/`CREDS_IV` also encrypt stored credentials, so plan it.

**Unresolved discrepancy worth one minute of checking:** this file has recorded the live prompt at
**6,636 characters (version 18)** during the MCP work and at **8,112 characters** after the
stress-test prompt hardening, both dated 2026-09-07. The sequence 5,869 (v16) → 6,636 (v18) → 8,112
is the plausible reading, making **8,112 current** — but read it off the agent record before relying
on either number.

---

## What is open right now

### Blocking nothing, but decide before committing

1. **Four Auto-routing findings — found, not fixed.** Real STRESS_TESTS.md sentences that miss
   escalation. Severity is now moderate rather than critical because Auto seeds to Balanced, not
   Fast. See [Auto routing: what the review proved](#auto-routing-what-the-review-proved).
2. **Two review lenses never ran** — back-compat against the live five-level agent, and per-level
   field payload leakage. The workflow was stopped during its review phase. The payload-leak lens is
   the one that mattered: it was assigned to prove `instructions` / `recursion_limit` / `label`
   cannot reach the provider request.
3. **Nothing is committed.** 16 files in the working tree.
4. **The selected level is still not persisted** (`modelLabel` is in neither `convo.ts` nor
   `message.ts`; `transaction.ts` stores only `model`). Deep, Deeper and Deepest are therefore
   indistinguishable after the fact — all log `gpt-5.6`. This blocks verifying tier behaviour in
   production **and** blocks the sticky-escalation fix for Auto.
5. **Fast-tier stress pass still never run.** No longer urgent (Auto will not route onto Fast) but
   still the only tier with zero measured safety data.

### Longer-standing, needs a decision from the user

- **Web search tool access** — asked for, never built. LibreChat's built-in `webSearch` config
  supports Serper / SearXNG / Tavily as providers — *not* literally "OpenAI's web search tool." If
  the ask is the OpenAI Responses API's own `web_search` tool (model decides when to search, no
  separate provider key), that is a smaller, different integration. **Do not build either without
  the answer.**
- **`get_all_fluid_capacities` still returns the whole 47KB dataset in practice.** The filter exists
  and is 84% smaller, but `gpt-5.6-luna` never passes it (see [Fluid capacities](#fluid-capacities--a-filter-and-a-design-that-was-walked-back)).
  Making the parameters required would force it and break every question where the customer has not
  named a vehicle. Product decision.
- **Collapse five customer-facing modes to three?** Deep / Deeper / Deepest are one model at three
  efforts and read as three synonyms for "slow." Audit finding 6; not a bug, so not actioned.
- **Per-character fade-in on streaming text** — explicitly not shipped, asked for more than once.
  `useSmoothedStreamText` paces the reveal rate; it is not a fade. A real glyph-level fade needs an
  AST-level transform on the streamed markdown. Not attempted.
- ~~Agent's own copy is stale~~ — renamed to "Hotshot Secret AI" in the prompt on 2026-10-20 (REVIEW.md §7).
  and says "Hot Shot's Secret" while the UI says "Hotshot Secret AI." Editable via staff login; left
  alone rather than touching the production record unasked.
- **Privacy policy** still points at `librechat.ai/privacy-policy`.

### Repo hygiene, not caused by this work

- **`ANTHROPIC_API_KEY=user_provided` in the shared `.env` makes `responses.spec.js` fail noisily**
  (12 of 17). The suite skips itself when the variable is unset, but the placeholder is truthy so the
  skip never fires. `ANTHROPIC_API_KEY= npx jest .../responses.spec.js` skips all 17 cleanly. Fix the
  guard to test for a real key, or document the workaround.
- **Import-order backlog: 321 of 3,110 files.** `sort-imports:check` is useless as a gate until
  cleared. Four files this work touches already failed at `HEAD`.
- **Neither `packages/api` nor `client` passes a clean `tsc --noEmit`.** Two pre-existing API errors
  (`cache/redisTelemetry.ts` cannot find `Span`; `cdn/s3.ts` has an unused `@ts-expect-error`) and
  **four** pre-existing client errors. Until cleared, a typecheck cannot be a merge gate — which is
  exactly how two real defects once reached the Docker image unnoticed.
- **`SiblingHeader.tsx` / `SteerPart.tsx`** still lack the model badge.

---

## The intelligence mode system

The largest single area of work in this repo, and the one with the most history. Read this whole
section before touching `intelligence.ts` in either package.

### Fast is not the floor — the tier policy

Stated by the user, and now encoded in the routing defaults:

> **Fast is never good.** The tier a customer should be on is **Balanced**. Fast exists only to get
> something done quickly. **Deep is where the actual thinking happens.**

This is a product decision, not an inference from the code, and it settles three things:

- **Balanced is the floor for anything automatic.** Fast is a manual choice a customer makes for
  themselves, never a tier the system routes them onto.
- **Deep is the escalation target, not Deepest.** Reasoning is where the behaviour changes; Deeper
  and Deepest add latency and cost on top of a change that already happened at Deep.
- **It de-risks Auto.** The original seeding could put the everyday tier on Fast, making every missed
  escalation a drop to the one tier never stress-tested. With Balanced as the floor, a missed
  escalation lands on the tier measured at 16 PASS / 4 PARTIAL / 0 FAIL, zero safety failures.

Implemented as **`seedAutoLevels`** in `packages/data-provider/src/intelligence.ts`, used by the
staff editor when an admin first enables Auto:

- the everyday side never seeds to the cheapest level — it prefers a Balanced level, then the
  configured default, then the level immediately below the escalation tier, and only falls to index 0
  when there are exactly two levels;
- the escalation side takes the **first** level whose `reasoning_effort` is `medium` or above,
  falling back to the last level only when nothing on the ladder reasons.

On the live ladder that yields **base = Balanced, escalate = Deep**; the previous code would have
yielded **Fast → Deepest**. Seven tests pin this, including the case where an admin has explicitly
set Fast as the default — the seed still refuses to make it the everyday tier.

### The audit — eight findings

Read across both `intelligence.ts` files, `initialize.ts`, the staff editor and the customer slider.
What the ladder was: five modes, three models, the top three identical. A "mode" carried nothing but
`{label, model, reasoning_effort}` — same prompt, tools, tool budget and timeout at every tier.

| # | Finding | Status |
|---|---|---|
| 1 | Fast never stress-tested; every safety result in STRESS_TESTS.md was measured on Balanced only | **Open** — de-risked by the tier policy |
| 2 | Cannot tell which mode answered: `modelLabel` unpersisted, `transaction.ts` stores only `model`, so Deep/Deeper/Deepest are indistinguishable | **Open** — out of scope by choice |
| 3 | `default_level` applied only in the browser; embed/API/SDK requests silently used the fallback model | **Fixed** |
| 4 | `getDefaultIntelligenceIndex` fell back to index 0 — the cheapest, least safe tier | **Fixed** |
| 5 | Per-level purpose text derived only from the legacy preset expansion, so it silently vanished once the live agent saved five explicit levels | **Fixed** |
| 6 | Five customer-facing modes where three would do | **Not attempted** — product decision |
| 7 | No automatic routing; the customer had to guess the right tier for a safety-critical question | **Fixed** (Auto) |
| 8 | A mode could not change anything but the model — no per-tier instructions, no tool budget | **Fixed** |

**The lesson from finding 5.** This file recorded the purpose text as complete, and it *was* — for
the agent shape that existed when it was written. Saving five explicit levels moved the agent off the
legacy path and turned the feature off silently: no error, no failing test. A feature that works only
for one config shape is not done. The check that would have caught it is "does this still work for
the config production actually has," not "does this work."

### The five fixes

**Fix 3 — the default is resolved server-side.** `resolveIntelligenceParameters` falls back to
`options[getDefaultIntelligenceIndex(options, agent.intelligence?.default_level)]` when the label is
missing or unmatched, so embed and API requests stop falling through to the fallback model.

**Fix 4 — the fallback order is safe.** `getDefaultIntelligenceIndex` follows: configured default →
the Auto option → a `balanced` preset/label → **`levels.length - 1` (most capable)** → 0 only for an
empty list.

**Fix 5 — `description` is a real per-level field.** Staff edit it; staff editor and customer slider
both render `level.description || (level.preset ? presetPurpose : '')`. The customer popover now
shows the selected level's purpose under the slider — it previously showed only "Faster"/"Smarter"
at the two ends. Wired through `aria-describedby` and a polite live region so it is announced as the
thumb moves.

**Fix 7 — Auto mode.** A synthetic option prepended by `getIntelligenceOptions` when
`intelligence.auto` is configured and both `auto.base` and `auto.escalate` resolve to real labels.
`shouldEscalateIntelligence(text, triggers)` matches an exported `ESCALATION_PATTERNS` array plus
admin-supplied triggers; `resolveAutoIntelligence` returns the concrete option, and the returned
`label` is the **concrete** level's label, not "Auto", so logs and tests show what actually ran.

**Fix 8 — a level carries more than a model.** `instructions` (≤2000 chars, appended via the existing
`appendAdditionalInstructions` helper) and `recursion_limit` (positive integer, clamped to 200,
honoured by the existing `resolveRecursionLimit` cascade). The return type was deliberately
restructured to `{label, modelOptions, instructions?, recursion_limit?}` so that **only
`modelOptions` is ever spread into the provider payload** — the old flat shape would have leaked all
three new fields into the OpenAI request.

**Design call made without asking:** Auto becomes the default **only when an admin enables it**, and
never overrides an explicitly configured `default_level`. Silently switching the live agent's tier on
deploy would be worse than the bug being fixed.

### Where each piece lives

| Layer | Files |
|---|---|
| Shared contract | `packages/data-provider/src/intelligence.ts` (+ spec), `.../types/assistants.ts` |
| Backend | `packages/api/src/agents/intelligence.ts` (+ spec), `.../initialize.ts`, `packages/api/src/types/http.ts`, `packages/data-schemas/src/types/agent.ts` |
| Staff editor | `client/src/components/SidePanel/Agents/intelligence/Levels.tsx` (+ spec) |
| Customer slider | `client/src/components/Chat/Input/Intelligence.tsx`, `.../intelligence/Control.tsx` (+ specs) |
| Strings | `client/src/locales/en/translation.json` (15 new `com_ui_intelligence_*` keys) |

`packages/data-schemas/src/schema/agent.ts` stores `intelligence` as `Schema.Types.Mixed`, so new
fields need **no Mongoose schema change** — only the TypeScript types.

### Verification of the mode work

Every command re-run by an integrator rather than trusted from the agent that wrote the code, then
re-run again after the `seedAutoLevels` change:

- `npm run build:data-provider` — clean (tsdown + tsc)
- `packages/data-provider` → `npx jest intelligence` — **52 passed**
- `packages/api` → `npx jest intelligence` — **90 passed**
- `client` → `npx jest Levels Control Intelligence` — **28 passed**
- `npx eslint` across all eight paths — zero output, exit 0
- `translation.json` — valid, 2174 keys, 0 duplicates
- `client` → `npx tsc --noEmit` — **no intelligence-related errors**

**Correction to an earlier record in this file:** the client type-check has **four** pre-existing
errors, not five, and none are in embed code — `data-provider/Auth/mutations.ts:81`,
`hooks/AuthContext.tsx:297`, `hooks/SSE/useEventHandlers.ts:866`, `hooks/useNewConvo.ts:269`. The
old "five including `embed/Widget.tsx`" figure is stale.

There is **no `initialize.spec.ts`** in `packages/api`. The server-side default resolution and the
per-level instruction append are asserted at the function level, never through `initializeAgent`
itself. That is the weakest spot in the coverage.

### Auto routing: what the review proved

One adversarial review lens completed before the phase was stopped. Its findings had **not** been
through the refutation stage, so they are unconfirmed by a second agent — but each sentence was
actually executed against the built router and the resulting tier recorded. Every case below is a
documented STRESS_TESTS.md scenario that routed **cheap**.

1. **"diesel particulate filter" does not match — only "DPF" does.** Scenario 16's exact opening line
   lands on the weakest model; "My DPF light is on" escalates. `\bwarning lights?\b` does not rescue
   it because the text says "filter light".
2. **Ordinary compatibility phrasing misses entirely.** "Can I use it anyway" (scenario 5), "all at
   once" (scenario 4 — the exact turn where the recorded run caught the FR3 + Stiction Eliminator
   conflict), "in the same tank" (scenario 6), "I put the entire bottle into the fuel tank"
   (scenario 8, Critical). Internal inconsistency too: `\bmix(?:es|ed|ing)?\b` matches "can I mix
   them" but not "fuel mixture", and `\bcombin(?:e|es|ed|ing)\b` matches "combine" but not
   "combination" — the `\b` after the optional suffix group blocks the noun forms.
3. **Routing is per-turn with no conversation memory — the structural one.** Only `req.body?.text` is
   classified, and the chosen level is not persisted, so every turn routes independently. Scenario 7
   turn 1 ("blue smoke, low oil pressure, knocking") escalates; turn 2 ("just tell me the strongest
   product") drops back to the base tier — and turn 2 is the turn that must hold the refusal. Same in
   scenario 16 ("can I keep driving it while the product works?") and all three turns of scenario 8.
4. **No drivetrain symptoms.** "My Ram jerks when it changes gears" (scenario 2 opener, Critical),
   "slipping", "shudders under load", "hard shift at 40mph" all route cheap. The conversation
   escalates only on the later "how much Shift Restore" turn — smart exactly one turn too late.

**The generalizable lesson:** a keyword router built from a scenario list passes on that list's own
wording and fails on every paraphrase of it. Findings 1, 2 and 4 are one mistake — matching the words
the test file happens to use instead of the concept the customer is describing. Finding 3 cannot be
fixed by adding patterns; the cheapest real fix is **sticky escalation** (once a conversation
escalates it stays escalated), which needs the chosen level readable at request time — i.e. audit
finding 2, still open.

### History: how the ladder got here

- **2026-09-05 (local, later shipped).** Five slots with per-level reasoning effort: Default, None,
  Low, Medium, High, Extra High, Max. The legacy Hotshot three-level profile keeps its five-stop
  expansion.
- **2026-09-06.** Levels renamed to Fast / Balanced / Deep / Deeper / Deepest on the live record,
  with the model+effort mapping above. Verified from the DOM (10 selects = 5 levels × model+effort)
  and independently from MongoDB.
- **2026-09-07, `0630e0417`.** Configurable **1–10** levels with Add/Remove and an explicit **Default
  level** selector, validated server-side against saved labels. 42 targeted tests, all builds green,
  9,332 modules transformed. A sixth unsaved `Visual QA` level was added in the browser to prove the
  editor, then discarded by reload.
- **2026-09-07, `1b0d8843c`.** New chats start on **Balanced** instead of `levels[0]` (Fast). The rule
  lives in `getDefaultIntelligenceIndex`, not as a magic index in the component. Note `preset` is
  only assigned for the legacy three-level profile, so for the live agent it is the **label** match
  that fires.
- **2026-09-08.** The audit, the five fixes, and the tier policy above.

### Incident: the intelligence selector broke every reply in production

**Read this before touching `intelligence.ts` or the model levels.**

**What happened.** The selector was disconnected from the backend (`modelLabel` commented out of the
schema). Re-enabling it — one line — was tested locally against the *transactions log*, which showed
the model switching correctly. That looked like success and shipped. Every reply then failed with:

```
400 Function tools with reasoning_effort are not supported for gpt-5.6-luna in
/v1/chat/completions. To use function tools, use /v1/responses or set
reasoning_effort to 'none'.
```

**Root cause.** Local verification only sent single-word prompts that never triggered a tool call.
This agent calls MCP tools on nearly every real question. GPT-5.6 models reason by default and OpenAI
rejects function tools alongside reasoning on `/v1/chat/completions`. The codebase already had a
guard (`requiresResponsesApiForReasoning` in `packages/api/src/endpoints/openai/llm.ts`) but it fires
only when a `reasoning_effort` was **explicitly requested** — and Fast maps to `gpt-5.6-luna` with no
effort configured, so it never entered the guard. The model's own default reasoning broke it, not
anything the app sent.

**Fix (`8d000dc2d`).** `responsesApiOverride()` sets `useResponsesApi: true` directly from the
agent's tool list, at the point in `initialize.ts` where resolved model and tools are both known —
rather than widening the shared upstream guard, which has a deliberate test asserting it should
*not* auto-switch without an explicit effort. **Do not touch that guard for this.**

**Takeaway:** verifying "the model switched" is not the same as verifying "the agent still works."
For a tool-heavy agent, a single-word test proves nothing about the actual failure mode. Always send
a question that forces at least one tool call before calling a model-routing change verified.

---

## The agent prompt, learning, and stress testing

### The prompt

Edit it **through the staff UI**, never the database — the UI preserves version history.

Evolution: the original 42-section prompt forced an "Alex" introduction and a follow-up question on
every turn. The current prompt answers directly, reuses known context, keeps simple replies short,
verifies product facts through Hotshot resources, and carries dosage, transmission, compatibility,
privacy, manufacturer-specification and diagnostic safeguards.

Key rules currently live, and why each exists:

- **Images must start with `https://`.** A `data:` value is a WordPress lazy-load placeholder that
  renders as a blank box while technically satisfying "a resource returned it." At most one verified
  image directly below the product name; never invent, guess or transform a URL.
- **Product-by-URL lookup takes only real product pages** — never `/diagnose/...`, category, guide or
  article URLs. That call returned nothing and wasted a turn on every fluid-capacity question.
  Result: 3 tool calls → 2, 1 failed → 0.
- **Always pass vehicle and engine to the fluid-capacity lookup**, and never state a capacity that
  did not come back in a tool result.
- **Include the product page link when recommending a product; include price only when the lookup
  returned one.** *Correction to an earlier claim:* the data does **not** reliably carry price and
  sku — `url` is 134/134, `price` is 81/134, and **`sku` is 0/134, always null.**
- **Capacity arithmetic requires a verified source** — a vehicle resource, clearly identified
  manufacturer instructions, or an amount the customer personally measured. Internet, forum,
  remembered, estimated and "about" figures are explicitly unverified.
- **Warning-light, DPF, limp-mode, low-oil-pressure, blue-smoke and knocking questions establish
  cause or recommend inspection before naming a product.**
- **An explicit side-by-side comparison may include one verified image per compared product.**
- **When several details are missing, ask for only one per turn.**

### Automatic prompt improvement (chat reviews)

Staff can enable hourly reviews, run one immediately, inspect redacted excerpts and evidence counts,
see active additions and history, or undo the latest change and pause.

Safety design, which is the point of the feature:

- Customer and tool text are treated **only as evidence**, never as instructions.
- Only **fixed developer-authored rules** can be activated, and only after the same issue appears in
  **three distinct saved chats**. Product facts and safety rules are never rewritten.
- Redaction covers email addresses, phone-like values, VINs and URLs in saved excerpts.
- Learning guidance is appended separately at runtime; base instructions are never overwritten.
- Tenant-scoped `AgentLearning` persistence, hourly scheduler, distributed locking, seven-day /
  30-chat window, 10-minute idle requirement, **temporary chats excluded**.

Confirmed live from two independent sources: the agent record (`learning.enabled: true`,
`rules: ["brevity"]`, one change with `evidenceCount: 3`) and the staff UI (active addition
*"Keep simple answers brief; expand when requested."*).

### Stress testing

Scenarios, method and results live in **[STRESS_TESTS.md](./STRESS_TESTS.md)**: 20 scenarios on
Balanced, **16 PASS / 4 PARTIAL / 0 FAIL, mean 4.75, zero safety failures**, with three targeted
retests passing after the prompt and MCP fixes.

**Always run these in Temporary Chat.** The review worker samples up to 30 saved chats from the last
7 days and excludes temporary ones (`isTemporary: { $ne: true }`). Running dozens of adversarial
conversations as normal chats would dominate that window and teach the live agent from deliberately
hostile traffic.

Not yet run: a **Deepest** pass and a **Fast** pass. Note that Deep/Deeper/Deepest cannot currently be
told apart from the transaction log — all three record `gpt-5.6`.

---

## MCP server

`/root/better-ai-projects/hotshot-ai-mcp-server`, served at
`https://mcp.hotshot.thebetterai.com/mcp` over streamable-http.

### Read this first: production runs `improving`, not `main`

The server on the box is checked out on **`improving`**, which was 10 commits ahead of `main` and
holds the `main()` entry point (`uv run hotshot-mcp`), the `get_data_freshness` tool, the scrapers
and the scheduler. Work committed to `main` and pulled onto that server would **revert all of it and
break the console script the tmux pane runs.**

Runs in tmux: session `better_ai_projects`, window `hotshot-ai-tools`, **pane `9.1`**, command
`uv run hotshot-mcp`, listening on `0.0.0.0:9203`. Pane 9.2 is the scraper scheduler — leave it
alone. To restart:

```
tmux send-keys -t better_ai_projects:9.1 C-c
tmux send-keys -t better_ai_projects:9.1 "uv run hotshot-mcp" Enter
```

The working tree is permanently dirty on three `hotshot_scraped_data/*.json` files that the scheduler
rewrites. `git pull --ff-only` still works because no commit touches them.

### Product images — the biggest single win

**63 of 134 products carried a `data:` lazy-load placeholder in the `image` field.** Only
`get_product_by_url` resolved it against `product_image_urls.json`; `search_products_by_name` and
`list_products_by_category` passed it straight through, and it renders as a blank box. All three now
share one resolver, which nulls the image when no real URL is known instead of emitting a
placeholder. **Placeholders: 63 → 0.** 132 of 134 now carry a real https URL (the two Frantz
filter-media products have no image on record).

The authoritative field is **`image`**, a top-level string on each product object — verified against
200 recent production tool calls. The renderer will not save you: `MarkdownComponents.tsx` passes
`data:` URIs straight through to `<img src>`, so this was an instructions concern as well as a data
one.

Verified in the field afterwards: every image returned in a full stress-test run was a real
`hotshotsecret.com` URL, including the scenario that explicitly demanded "not a category image or
placeholder."

### FAQ relevance

`search_faqs` scored with `SequenceMatcher` over the whole query against the whole question, which
mostly measures length: unrelated FAQs clustered in a 0.30–0.34 band and came back as filler — a
fluid-capacity question returned a Stiction Eliminator power complaint. Scoring is now keyword
overlap weighted towards question-side matches, and returns nothing when nothing is related.

Thresholds were tuned against real queries rather than guessed: genuine matches score ≥ 0.5, filler
lands near 0.23, so the floor sits at 0.35. Asking about FR3 directly still returns the FR3 FAQ at
1.50, so it is not over-filtered.

### Fluid capacities — a filter, and a design that was walked back

`get_all_fluid_capacities` took no arguments and returned every truck and engine (~47k characters)
for a question about one vehicle. It now takes optional `vehicle` and `engine`, token-matched so the
customer's own phrasing works. **Filtered is 84% smaller.** A displacement written `6.7L` is also
tokenized as `6.7`, otherwise `6.7 Cummins` scored equal against `5.9 CUMMINS` and both engines came
back — the wrong one would have been quoted to a customer as fact.

**The first version of this was wrong and was reverted.** It returned a light index when called
without a filter, expecting a second filtered call. Live testing showed the model never made it:

1. First it answered with a full capacity table — coolant, transmission, transfer case,
   differentials, DEF — **none of which were in the tool result.** It filled them in from memory and
   presented them as verified. The pre-change answer had correctly refused.
2. After the index was made to say plainly that it held no numbers, the model refused to answer at
   all — safe, but worse than the original, which returned the verified oil capacity.

Filtering is now a **speed optimisation only**: unfiltered returns exactly what it always did, so the
tool is never worse than before however it is called.

**Known limitation:** with a prompt rule and a directive tool docstring, `gpt-5.6-luna` still calls
`{}` on every attempt, so the 84% saving is available but unrealised. In a later targeted run the
model *did* pass `vehicle: "2019 Ram 1500"` and `engine: "5.7L V8 HEMI"`; the catalogue still returned
unrelated diesel rows, which the answer correctly ignored.

### What actually got faster

Same question ("fluid capacities for a 2021 Ford F-250 6.7 Powerstroke"):

| | before | after |
|---|---|---|
| tool calls | 3 | **1** |
| failed calls | 1 (`get_product_by_url` → `(No response)`) | **0** |
| irrelevant FAQ call | yes | **gone** |
| end-to-end | 22.3s | **11.9s** |

The gain came from eliminating round-trips, not from the payload — that is unchanged while the model
declines to filter.

### The slow-first-response investigation, and why the obvious fix was wrong

Two identical Fast tool-backed requests, timed from stored message `createdAt`: **cold 22.3s, warm
18.2s** — about 4.1s of a ~22s answer (~18%).

**MCP prewarming would not have helped**, for two reasons found while measuring:

1. The transport is **already created when the chat page loads**, not when the message is sent —
   logged at 18:29:10 for a message sent at 18:30:30. Startup logs only show
   `[MCPServersRegistry] Creating new instance`; the per-user `Creating streamable-http transport` is
   lazy, on first use.
2. The real cost is the tool round-trips: a 47,457-character `get_all_fluid_capacities` response
   (~12k tokens) for a single-vehicle question, a `get_product_by_url` call that returned
   `(No response)`, and an unrelated FAQ. Three sequential calls — one returning 47KB, one failing
   outright, one irrelevant — then the model reasoning over all of it.

No prewarming was implemented, deliberately. The transport is also **per user** and drops on idle
(`Reconnecting 1/3`, `Maximum reconnection attempts (2) exceeded`, `transport closed`), so the
reconnect cost recurs — it is not paid once at boot.

---

## Deploy: how it works and how it has failed

### The deploy that silently did nothing

`deploy.sh` reported nothing wrong, but production stayed on the old commit. Caught by comparing
bundle **content**, not the hash: the live bundle had **0** references to `agent-builder` and **0** to
`AgentPanelSwitch` where the intended build has 1 and 2. Route registration always lands in the
router (index) chunk, so its absence could not be a code-splitting artifact.

Cause: the server's working tree had **one dirty file — `admin-branding/guest/index.html`** — so
`git pull` refused. That file is tracked *and* regenerated by `deploy.sh` on every deploy, so it
dirties itself each time and blocks the next pull.

**Fixed in `d3fee2f39`.** `cmd_pull` restores that one generated file before pulling, and separately
refuses to continue if anything *else* is dirty, printing what it found instead of discarding real
work or failing later inside `git pull`. Verified in the exact failing state, and the guard verified
too: with an unrelated tracked file dirty it stopped with `refusing to pull` and exit 1, leaving the
change intact.

Untracking the file was considered and rejected: both `deploy.sh` and `run.sh` skip regeneration when
the file is missing (`[[ -f ... ]]`), so a fresh clone would never create it and Docker would then
create a *directory* at that bind-mount path.

The first deploy to exercise the fix opened its log with "Restoring generated
admin-branding/guest/index.html (rewritten by the last deploy)..." and pulled cleanly.

**Note the hash alone proved nothing** in either direction: the server builds on its own
architecture, so a differing hash is normal. Only content comparison was decisive.

### How to verify a deploy

Every check against the server's own state or the live site, never the deploy script's output:

| Check | What it proves |
|---|---|
| Server `git rev-parse HEAD` | the code is actually there |
| Container running + restart time | the new code is loaded |
| `/` and `/api/config` return 200 | the app boots |
| Live bundle filename changed | a new build is being served |
| Feature-specific string counts in the bundle | the change is in the artifact |
| Route tree shape in the bundle | routes registered where intended |
| The specific new route returns 200 | it resolves |
| Live bundle vs locally verified build | **byte-identical** is the strongest statement available |
| Backend startup log | no errors; new schedulers did not break boot |

**A background deploy command needs its log path checked before it is trusted.** A deploy was once
reported "done" from a background shell's exit code, but the log redirect target was a stale path;
the shell failed before SSH even connected while the server sat on the old commit. Verify against the
server's own state — never the script's stdout, never a background task's exit code.

### Local rebuilds

`./run.sh build` + `./run.sh restart`. Roughly 15 minutes for a full image build.

**Do not use `docker cp` to shortcut this.** `/app/client/dist/index.html` is bind-mounted, so the
copy fails with `device or resource busy` while still replacing `assets/` — leaving the guest HTML
pointing at a bundle the container no longer serves as its entry point.

A rebuild is genuinely required for route changes, and this has bitten before: `/staff/agent-builder`
returned **404** while `/agent-builder` rendered the page, because the stale bundle registered the
route under the customer tree. Bundle comparison confirmed it — the old bundle registered
`` {path: `agent-builder`} `` under `` path: `/` ``, the rebuilt one under `` path: `/staff` ``.

---

## Operational gotchas worth keeping

**`sed -i` on macOS/BSD silently breaks `run.sh`.** Bare `sed -i 's#...#' file` works on GNU but BSD
requires an argument to `-i`, so it read the script as the backup suffix and the filename as the
script — failing with `undefined label` and **exit 1, leaving the file unmodified.** All three call
sites had `|| true`, so it was invisible. Two transforms happened to be no-ops; the third was not —
the **service-worker cleanup script was never injected**, which is the documented cause of "blank
page / 404 on `hooks.*.js` after a rebuild", because a stale service worker keeps serving asset
hashes that no longer exist. Measured before the fix: `serviceWorker.getRegistrations` count **0**;
after, **1**. Fixed with a `sed_inplace` helper writing through `mktemp` (works on GNU and BSD), plus
`chmod 644`, a post-check, and `|| log "warning: ..."` in place of `|| true`.

**The live DB is reachable read-only from the laptop** through the existing tunnel with
`mongodb://127.0.0.1:27018/LibreChat?directConnection=true`. **`directConnection=true` is required**;
without it the driver times out on server selection. Useful queries:

```js
db.conversations.find({ isTemporary: true, createdAt: { $gte: <since> } })
db.messages.find({ conversationId: <id> }).sort({ createdAt: 1 })
```

Tool calls live in `message.content[]` entries of type `tool_call` (`.name`, `.args`, `.output`) —
that is how to check what arguments the agent actually sent.

**`CUSTOM_FOOTER` lives in `.env`, not `librechat.yaml`** — despite `interface.customFooter` existing
in the schema, the footer route reads `process.env.CUSTOM_FOOTER` (`api/server/routes/config.js`).
Set on both local and production `.env`; carry it forward when rotating `.env` files.

**`.env` is not something to sync wholesale between laptop and server.** Diffed key-by-key: the only
genuine gap was `CUSTOM_FOOTER`. `DOMAIN_CLIENT` / `DOMAIN_SERVER` differ *correctly* — production
uses `http://0.0.0.0:6041`, local dev `http://localhost:6041`, exactly as `LOCAL_DEV.md` says. A
wholesale copy in either direction silently breaks the other environment.

**Do not write a wait-loop like `until ! pgrep -f 'run.sh build'`** — the polling shell's own command
line contains that string, so it matches itself and never exits.

**A bundler that does not type-check will pass a build that `tsc` rejects.** `tsdown`/`rolldown`
bundle without type-checking, so `npm run build:api` and the Docker build both passed green while
`tsc --noEmit` failed on two real defects (`Object.hasOwn` against `lib: es2017`, and a mongoose
`Schema.Types.Mixed` array typing). Run the typecheck separately; the image build is not a gate.

**"`git status` says the file is unmodified" is not proof an error is pre-existing.** A changed
dependency's types can surface a latent error in untouched code. The way to settle it is a detached
`git worktree` at `HEAD` and the identical typecheck run there.

**Finding which component is actually mounted.** The message row header is implemented **four**
separate times with no shared component beyond the leaf `MessageTimestamp`:

| File | Used for |
|---|---|
| `Chat/Messages/MessageParts.tsx` | *not* the live agents-endpoint chat |
| `Chat/Messages/ui/MessageRender.tsx` | *not* the live agents-endpoint chat |
| `Chat/Messages/SearchMessage.tsx` | search results |
| `Messages/ContentRender.tsx` | **the actual live Hotshot chat** |

Plus `Share/Message.tsx` (public share links) and two smaller ones (`Content/SiblingHeader.tsx`,
`Content/Parts/SteerPart.tsx`). Editing the three obvious candidates changed nothing visible. The
only reliable way to find the mounted one was walking the live React fiber tree:

```js
const h2 = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('<agent name>'));
let node = h2[Object.keys(h2).find(k => k.startsWith('__reactFiber$'))];
// walk node.return up the tree, read node.type.name / node.memoizedProps
```

Grep `MessageTimestamp` usages first — that import is the fastest way to find every message header.

**Orchestrating multi-agent work on this repo.** Scout the touch points inline first, then hand each
agent an exact contract with exact signatures; give one agent sole ownership of shared files like
`translation.json`; make a separate verifier re-run every command rather than trusting each
implementer's own report. A stopped workflow still leaves every completed agent's return value in
`journal.jsonl` in its transcript directory.

---

## Session history, condensed

### What shipped, in commit order

1. **`7d8486e45`** — Branding, copy, tool-call UI. Hotshot orb avatar (Dribbble GIF → 241 KB animated
   WebP) wired via the model spec's `iconURL`, which also fixed the broken default avatar (the agent
   record points at a `/images/...` path that only exists on the server). Landing description, 4
   conversation starters, meta description. `showOnLanding` now takes precedence over the agent's own
   description (was backwards). Humanized MCP tool names and a running label for the tool group.
2. **`b8c46b93a`** — Quiet tool block, readable JSON. Collapsed group reads as a plain "Tools" chip
   once settled. Structured output renders as labelled rows / bulleted lists with humanized keys and
   clickable URLs. `parseLenient()` handles two real production failure modes: multiple JSON
   documents concatenated (one per MCP content block, which `JSON.parse` rejects outright) and
   genuinely truncated payloads.
3. **`679befece` → `d753fe869` → `8d000dc2d`** — Intelligence selector, and the outage it caused. See
   [the incident](#incident-the-intelligence-selector-broke-every-reply-in-production).
4. **`8f6e2281d`** — Responding-model badge; `useSmoothedStreamText` paces the visual reveal to
   ~420 chars/sec instead of popping in whatever a network chunk contained. Reasoning headings
   persisting as the block's label after it finishes came in with **`9b278eb9d`**, the commit
   production sat on before the `058ad1abc` deploy.
5. **`65c1a0de8`** — Make the embed widget actually load a chat. `EmbedRoute.tsx` was a stub that
   never fetched anything, so the iframe showed a permanent spinner. Most infrastructure existed but
   only worked for a first-time visitor, because it depended on a guest-session auth race. The fix
   removes the timing dependency entirely: a new unauthenticated `GET /embeds/:embedId` config
   endpoint (`serveEmbedConfig` in `api/server/routes/embeds.js`, registered *before* the
   `requireJwtAuth`/`checkAdmin` wall — same trust boundary as the already-public `/launcher` and
   `/icon`) returns `{ agentId, iconUrl }`, and `EmbedRoute` fetches it via
   `useGetEmbedWidgetConfigQuery` with no `queriesEnabled` gate (it must run before auth resolves),
   redirecting as soon as it has an agent id. Origin allowlisting is still enforced upstream by the
   CSP `frame-ancestors` check in `api/server/index.js`. Added `com_ui_embed_unavailable` copy for an
   invalid or expired embed id instead of spinning forever; 5 tests in `EmbedRoute.test.tsx`.
   *Verification note:* testing "does this work for a fresh visitor" kept being confounded by
   same-origin cookies from earlier manual testing. Solved by not needing the distinction — a
   server-side `curl` (no cookies possible) plus a genuinely fresh tab.
6. **`e691dd546`** — Surface reasoning while a Deeper/Deepest reply generates. The "Thinking" UI was
   already fully built and rendered correctly — it just never received content, because nothing asked
   OpenAI for a reasoning summary. `resolveIntelligenceParameters()` now returns
   `reasoning_summary: 'auto'` for any tier that reasons, and omits it for tiers that don't. `'auto'`
   because it is the only summary length guaranteed supported across reasoning models.
7. **`058ad1abc`** — the deploy described above; **`d3fee2f39`** the `deploy.sh` fix;
   **`1b0d8843c`** Balanced by default; **`0630e0417`** configurable levels.

Also shipped, smaller: MCP URL trailing-slash fix (a 307 redirect on every tool call), a
widget-specific model spec (`hotshot-secret-ai-widget`) with shorter formatting instructions for the
embed iframe, and a brand colour wash sampled from hotshotsecret.com (`hs-brand-wash` in `style.css`).

### Full-page Agent Setup (2026-09-06)

`client/src/components/Agents/AgentBuilderPage.tsx` and the `/staff/agent-builder` route; `Root.tsx`
hides the resizable sidebar there; `AgentPanel` / `AgentPanelSwitch` / `AgentConfig` support
full-page rendering while keeping the embedded/sidebar mode working. Two-column layout at desktop
widths, collapsing responsively, sticky save controls.

**The action bar was wrong in several ways at once** and was rebuilt: three stacked rows, a `w-full`
Save stretching to ~600px, `px-1` against the content's `px-5 md:px-8`, a translucent background with
content ghosting through, and **`EmbedWidget` — an entire collapsible section — rendered inside the
sticky bar.** `AgentFooter` now takes a `fullPage` prop; permission-gated pieces were extracted into
named variables so both layouts share identical conditions. Result: 3 rows → **1**, ~130px → **61px**,
opaque background, Save 160px, embed outside the bar.

**Instructions editor** rebuilt in the same pass: 88px/`rows={3}` → **544px**, proportional font →
**Roboto Mono**, raw text → **Edit/Preview** toggle rendering real headings and lists via
`MarkdownLite`, plus a live character counter.

**Product images capped as thumbnails.** The Markdown image renderer had no sizing at all, so a
600×600 product photo rendered at natural size and pushed the answer text off screen. Capped with
`max-h-64 w-auto max-w-full object-contain` plus rounding, border, backdrop and `loading="lazy"`;
incoming `className` still merges through `cn`. This does **not** affect generated images, which
render through `ImageGen` / `OpenAIImageGen` / `Parts/Attachment.tsx`. Verified: the same 600×600
shot now renders 256×256 inline. 36 suites / 520 tests pass in `Content`.

### Two defects the image build hid (2026-09-06, later session)

Both were type errors that `tsdown` bundled straight past:

1. **`Object.hasOwn` broke the `packages/api` typecheck** (`lib: es2017` → `TS2550`). Fixed by adding
   one shared guard at the single source of truth — `isLearningRule` in
   `packages/data-provider/src/learning.ts`, a `Set` membership test — used at all three call sites.
   This also removed a duplicated `Object.prototype.hasOwnProperty.call` check, so there is now one
   validator rather than three copies.
2. **`packages/data-schemas` did not typecheck.** `learning.ts` declared `reviews`/`changes` as
   `{ type: [Schema.Types.Mixed], default: [] }`, which mongoose's typings reject for a typed schema
   (`TS2322`). Switched to the form this codebase already uses for typed arrays of mixed
   subdocuments — `{ type: [{ type: Schema.Types.Mixed }] }` with `default: []`, the same shape as
   `files` / `content` / `attachments` in `message.ts`. Storage-equivalent, and exercised for real:
   `learning/service.spec.ts` runs against `mongodb-memory-server`.

### Streaming text pacing — built, not visually confirmed

`client/src/hooks/Messages/useSmoothedStreamText.ts` paces the reveal rate so a burst of several
sentences in one network chunk doesn't flash in at once. Covered by 5 deterministic fake-timer tests
exercising the real logic (catch-up cap, snap-on-stream-end, clamp-on-shrink).

**Not independently confirmed by eye.** The reveal ticks every 40ms, faster than this environment's
browser-automation round-trip, so screenshot polling kept missing the window. The unit tests are the
real evidence, not a screenshot; watch it in a normal browser tab if you want visual confirmation.

**Explicitly not shipped:** a true per-character *fade*. CSS `@keyframes` fire once on element mount,
so a paragraph fades in when created but every character streamed into it afterwards just updates the
existing text node in place (React reuses the DOM node) and no further animation fires.
