# Review — 2026-10-21

Live review of **https://hotshotai.thebetterai.com**: admin panel walkthrough in Chrome, six timed
customer chats (all in Temporary Chat, so none reach the learning loop), the stored tool calls behind
each answer, and the move to OpenAI's GPT-6 family.

Production is on `8806e208b`; local `main` matches `origin/main` (nothing to pull). The local tree
still carries **360 uncommitted files** from the intelligence-mode work — see HANDOFF.md.

---

## 1. Live chat test

Customer view, Temporary Chat. Times are send → answer finished, measured in the page.

| # | Tier / model | Question | Time | Tool calls (payload) | Verdict |
|---|---|---|---|---|---|
| 1 | Balanced · `gpt-5.6-terra` | 2018 Ram 2500 6.7 Cummins, mileage dropped | ~8–12s | product search (17.6KB), FAQ (2KB) | Good: causes first, Diesel Extreme, verified dose, image |
| 2 | Balanced | FR3 for 2021 F-250 6.7 Powerstroke | ~8–12s | product search (11.8KB), fluid capacities **filtered** (7.7KB) | Correct (13 qt × 1.5 oz = 19.5 oz) but **no product link or image** |
| 3 | Balanced | DPF light on, which product clears it? | 4.7s | none | Safe: diagnose first, asks for vehicle |
| 4 | Balanced | …also jerks on shifts, can I keep driving? | 10.3s | `get_all_symptoms` **unfiltered (26KB)**, 2 FAQ | Safe: says don't drive/tow, scan codes |
| 5 | Balanced | "just send me the link to buy stiction eliminator and the price" | 2.9s | product search (13.3KB) | Link correct; **no price** (data gap) |
| 6 | Deep · `gpt-5.6` | Compare Diesel Extreme vs EDT, towing 14k, 2016 Duramax | 9.6s | 2 product searches (27KB) | Smartest answer (caught LML vs L5P) but **contradicts itself** on EDT frequency |

Safety behaviour held on every turn. The problems are speed, payload size, presentation and data.

---

## 2. Issues, in priority order

### P0 — fix before or with the next deploy

1. **GPT-6 switch must follow the code deploy, never precede it.** The Responses-API guard only
   matched `gpt-5.6`. Pointing the live agent at a GPT-6 model on today's production backend would
   repeat the September outage (tool calls + reasoning on `/v1/chat/completions` → 400 on every
   reply). Fixed locally — see section 4.
2. **Customers see the model's raw reasoning.** Balanced (low effort) streams reasoning summaries into
   the customer chat: *"I need to figure out the causes and inspiration for safety"*, *"FR3 might be a
   typo"*. Introduced by `e691dd546` (`reasoning_summary: 'auto'` for every tier that reasons). It
   reads as confused and undermines trust. Fix: hide the thoughts body in the customer view (keep
   the heading as a progress label), keep the full text for staff.
3. **Staff session silently becomes a guest.** Starting from a logged-in `/staff` session, opening
   the customer view and returning to `/staff/c/new` landed on the public page with **Staff login**
   showing; `/api/auth/refresh` reported an `anonymous` user. VIEWS.md says switching needs no logout.
   Separately, `/staff/c/new?spec=…&temporary=true` redirected to `/c/new` and rendered a **blank
   white page** until a manual reload.

### P1 — speed, cost and answer quality

4. **Tool payloads are the main latency and token cost.** `search_products_by_name` returns
   **10–18KB for one named product** (the whole fuzzy-match list with every field);
   `get_all_symptoms` takes no filter and returns **26KB**. Fix in the MCP server: return the top
   1–3 matches, a slim field set, and add a symptom filter. Fluid capacities are now being filtered
   (7.7KB), so that fix landed.
5. **Price is missing for ~40% of products** (81/134 carry one), so "what's the price" fails on core
   products such as Stiction Eliminator. Scraper/data fix.
6. **Self-contradictory dosing advice** (case 6: "EDT at every fill-up", then "every other fill-up
   between Diesel Extreme treatments"). Check the EDT source data and add a prompt rule: one frequency
   per product, taken from the tool result.
7. **Link/image rule followed inconsistently.** Case 2 recommended FR3 without the product link or
   image, even though its own reasoning said to include them.
8. **The tier that answered is only half stored.** *Corrected after a second look:* production
   already persists `metadata.respondingModel` on every reply (`gpt-5.6-terra`, `gpt-5.6`). The tier
   label (`metadata.respondingIntelligence`) is in the uncommitted local `client.js` work and lands
   with the next deploy — after that, Deep/Deeper/Deepest/Ultra are distinguishable.

### P2 — admin panel (Agent setup)

9. **Opens on a blank "Create New Agent"** instead of the one live agent; staff must pick it from a
   dropdown every time, and the dropdown + "Create New Agent" + "Select" stack is confusing.
10. **Model dropdown is a static list** including `gpt-3.5-turbo-instruct` and
    `gpt-4-vision-preview`, and had no GPT-6. GPT-6 is added locally; trim the list to current models.
11. **Effort dropdown offers "None" for every model.** GPT-6 Astra and GPT-6.1 Sol support **Low
    through Max only**; saving None on them will 400. Filter efforts per model.
12. Agent avatar shows a **"+" placeholder**; the prompt still says **"Hot Shot's Secret AI"**;
    support contact is empty; privacy policy link is unset.
13. Deep / Deeper / Deepest are one model at three efforts (HANDOFF finding 6).

---

## 3. Proposed GPT-6 ladder

Per direction: Astra only at the very top, everything else on 6.1 Sol and Luna.

| Level | Today | Proposed | Price in/out per MTok (today → proposed) |
|---|---|---|---|
| Fast | `gpt-5.6-luna` · default | `gpt-6-luna` · None | $1 / $6 → **$0.10 / $0.50** |
| Balanced (default) | `gpt-5.6-terra` · Low | `gpt-6.1-sol` · Low | $2.50 / $15 → **$2 / $10** |
| Deep | `gpt-5.6` · Medium | `gpt-6.1-sol` · Medium | $5 / $30 → **$2 / $10** |
| Deeper | `gpt-5.6` · High | `gpt-6.1-sol` · High | $5 / $30 → **$2 / $10** |
| Deepest | `gpt-5.6` · Max | `gpt-6.1-sol` · Max | $5 / $30 → **$2 / $10** |
| **Ultra** (new) | — | `gpt-6-astra` · High | **$10 / $50** |

Every tier except Ultra gets cheaper. Rates from OpenAI's models and pricing pages, read 2026-10-21.

---

## 4. Code changes made locally (not committed, not deployed)

- `packages/data-provider/src/config.ts` — `gpt-6-astra`, `gpt-6.1-sol`, `gpt-6-luna` added to the
  OpenAI model list (the Agent setup dropdown).
- `packages/api/src/agents/intelligence.ts`, `packages/api/src/endpoints/openai/llm.ts` — the
  Responses-API guards now match `gpt-5.6` **and** `gpt-6*`.
- `packages/api/src/utils/tokens.ts` — 1.05M context / 128K output for the three models.
- `packages/data-schemas/src/methods/tx.ts` — standard, cached, and long-context (>272K) pricing.
- `client/src/locales/en/translation.json` — the effort hint now states which models support None.
- Tests: guard and pricing specs extended to the GPT-6 ids.

Verified: `build:data-provider` clean; `packages/api` intelligence + llm + tokens **216 passed**;
`data-schemas` tx **223 passed**; client `Levels` **12 passed**; eslint clean on touched files.

---

## 5. Second pass — fixes built (local, uncommitted)

| Issue | Fix | Where |
|---|---|---|
| 2 — raw reasoning shown to customers | Customers see a one-line live status ("Considering product details"), nothing after the answer; staff keep the full block. One hook decides. | `client/src/hooks/useReasoningDetail.ts`, `Parts/Reasoning.tsx` |
| 3 — staff session replaced by guest | Guest endpoint returns 409 instead of overwriting a live non-guest session; refresh no longer wipes cookies on a rotation race (409 + client retry). No change to who can reach `/staff`. | `api/server/controllers/AuthController.js`, `client/src/hooks/AuthContext.tsx` |
| 3 — blank page on staff→customer redirect | Redirect keeps `/c/...`, `spec` and `temporary`. | `client/src/routes/Root.tsx`, `client/src/utils/staff.ts` |
| 4 — tool payload bloat | Product search 10–18KB → **1.3–1.6KB** per named product (dosage kept, `image` unchanged); `get_all_symptoms` gains `symptom`/`vehicle`/`engine` filters (26KB → ~250 chars when specific; unfiltered unchanged). | MCP repo `custom_tools/`, `main.py` |
| 5 — missing prices | Root cause: variable (per-size) products — the scraper read rendered `.price` text, which is empty for them. Now reads variation data / `p.price` / JSON-LD, adds `price_options` and the real `sku`. **Needs a products re-scrape to take effect.** | MCP repo `scrapers/product_pricing.py` |
| 8 — tier not stored | Already handled by the uncommitted `client.js` work (`metadata.respondingIntelligence`). | — |
| 9, 2nd half — Agent setup header | Opens on the live agent; one switcher + "New agent". | `AgentPanelSwitch.tsx`, `AgentPanel.tsx`, `defaults.ts` |
| 10 — stale model list | Grouped GPT-6 / GPT-5 / Other; obsolete models hidden unless already saved. | `Levels.tsx`, data-provider `intelligence.ts` |
| 11 — None on Astra/Sol | Effort list filtered per model; normalised on save **and** at run time, so an old bad save cannot 400. | data-provider + api `intelligence.ts` |
| 12 — "+" avatar | Falls back to the model spec's Hotshot orb. | `AgentAvatar.tsx`, `Images.tsx` |
| New — web search | OpenAI built-in `web_search`, domain-locked (`hotshotsecret.com`), toggle under the levels in Agent setup; survives every level switch. Off until staff enable it. | data-provider `websearch.ts`, `llm.ts`, `WebSearch.tsx` |
| Image whitespace | Tighter inline product-image spacing. | `MarkdownComponents.tsx` |

Verification: data-provider 72, packages/api 290, data-schemas 223, api 52, client 154/155 (the one
failure, *"does not re-trigger silentRefresh after successful redirect"*, fails identically against
the original `AuthContext.tsx`), MCP server 20/20. `tsc --noEmit` clean in client and packages/api;
eslint clean on every changed file. **Nothing has been run in a browser yet** — that happens on the
deployed site.

### Prompt additions to make in Agent setup after deploy

Paste into the instructions (staff UI keeps version history):

- *When calling `get_all_symptoms`, always pass the customer's symptom words, and `vehicle`/`engine`
  when known.*
- *Give exactly one usage frequency per product, taken from the tool result; never state two.*
- *When recommending a product, always include its product page link, and its image when the
  lookup returned one.*
- *(If web search is enabled)* *Use web search only on hotshotsecret.com, only when the catalogue
  tools lack the fact (e.g. a price), and say the figure came from the live product page.*
- Rename "Hot Shot's Secret AI" → "Hotshot Secret AI" in the heading and role line.

## 6. Deployed and live-tested — 2026-10-20 23:09–23:25 UTC

LibreChat `47a10616a`, MCP server `0e0cb25`, product data re-scraped (prices **81/134 → 133/133**,
11 real SKUs, per-size price options). Agent switched to the section 3 ladder plus Ultra; web search
limited to `hotshotsecret.com` (it was already on, **unrestricted**, before today).

| Level / route | Model (from stored metadata) | Time | Result |
|---|---|---|---|
| Fast | `gpt-6-luna` | 12s | FR3 for F-250 with verified 13 qt capacity — tools work on Luna |
| Balanced | `gpt-6.1-sol` | 15s | Read the live product page via web search, cited it, honest about stock |
| Deep | `gpt-6.1-sol` | 21s | Consistent EDT/Diesel Extreme routine (the old contradiction is gone) |
| Deepest | `gpt-6.1-sol` | ~45s | 12 qt Ram 2500 → 48 oz initial / 24 oz maintenance Stiction |
| Ultra | `gpt-6-astra` | 18s | Firm "don't keep driving", tow conditions |
| Auto (customer default) | `gpt-6.1-sol`, Deep, `autoEscalated` | 12s | "jerks when it shifts" now escalates (was a documented miss) |
| Customer price question (pre-switch) | `gpt-5.6-terra` | 4.4s | "$20.49–$540.99 depending on size" |

Payloads live: Stiction search 13,340 → 1,648 chars; symptoms 26,043 → 552 (model passes the
filters itself). Customers saw only status lines ("Diagnosing symptoms"), no reasoning body. Staff
session survived a trip to the customer view.

**Still open**
- **Default secrets in production** (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `CREDS_KEY`, `CREDS_IV`) —
  anyone can forge a staff token. Highest-priority item now.
- Web search runs even when the catalogue already has the answer (Deep cited the site on nearly every
  line) — costs a per-search fee. Add the section 5 prompt rule.
- The section 5 prompt additions and the "Hot Shot's Secret" rename are not applied.
- Deeper not separately tested; Fast answered "about 20 oz" FR3 vs Balanced's 19.5 oz earlier
  (two dosing sources in the data).
- `list_product_categories` (live sitemap per call) and `recommend_youtube_video` (index rebuilt per
  call) still take 2–5s each.

## 7. Prompt update — 2026-10-20 23:33 UTC

Applied through Agent setup (8,112 → 9,204 chars): "Hot Shot's Secret AI" → "Hotshot Secret AI"
(the bot's own name only; the company/brand name is unchanged); link + image always with a
recommended product; price quoted as returned, per size when known; exactly one usage frequency per
product; symptom lookups always pass `symptom`/`vehicle`/`engine`; web search only when the tools
lack the fact. Ladder and the `hotshotsecret.com` limit were unchanged by the save.

Retest (customer view, Auto, Temporary Chat):

| Question | Tier / model | Time | Result |
|---|---|---|---|
| Diesel Extreme vs EDT for towing | Deep · `gpt-6.1-sol` | 23s | Both products with link, image and price; one frequency each; website cited 5× (was nearly every line); answered from product + FAQ tools |
| "Who are you?" + F-350 rough idle, white smoke | Deep · `gpt-6.1-sol` | 14s | "I'm Hotshot Secret AI"; diagnosis first; symptom lookup filtered (252 chars) |

New findings
- `get_symptom_details` returned 55 chars for a real `/diagnose/ford-pickup/6-7…` URL — looks like a
  failed live fetch. Check the MCP tool.
- Links taken from web search carry `?utm_source=openai`. Harmless; strip in the markdown link
  renderer if it matters for analytics.
- Web search calls are native to OpenAI and are not stored as `tool_call` parts, so search volume
  can only be seen in OpenAI usage, not in Mongo.

## 8. Not done (first pass)

- **Backend logs not read.** SSH to the production box was blocked by this session's permission
  rules, so this review used browser timings plus the stored tool calls instead.
- **No GPT-6 chat tested yet.** It needs the code deployed first (item 1), then a tool-calling
  question on each tier — a single-word prompt proves nothing (see the September incident).
