# Changelog

What changed in Hotshot AI (the LibreChat app at https://hotshotai.thebetterai.com), newest first.
Each day lists what was **added**, **changed** and **fixed**, the commits, and what was **deployed**.
Changes made outside the code (agent instructions, server settings) are listed under **Config**.

How the product works today is in [CHANGES.md](./CHANGES.md). The tool server has its own log in
`hotshot-ai-mcp-server/CHANGELOG.md`.

---

## 2026-10-29

### Changed
- **Generated cards blend into the chat.** The frame now loads a UI kit copied from the chat's own answer blocks: Inter (served from the app), white cards with a thin border, pill buttons like the follow-up chips, a dark primary button, fields, rounded checkboxes with a check mark, progress bars, expandable notes and tables. The writer must build with these classes and may only add layout CSS, so it can no longer invent its own colours, fonts or form controls. Components written for the old look are no longer offered (they still show under their original answers).
- **No more reading the same list twice.** The same Decisions API call now also asks whether the card shows the answer's main list in full (`covers`). When it does (≥ 0.6), the answer's top-level list or table folds away smoothly once the card has appeared; the intro, closing notes and follow-up buttons stay. A "Show it as text" link under the card brings the list back. The Developer view shows the `covers` score.
- **Reusing a card failed live.** When the Decisions API picked a saved card or a built-in block (live: the saved checklist at 91%), filling in its data errored, because OpenAI's JSON mode needs the word "json" in the input and it was only in the instructions. The input now asks for one JSON object.
- **The list never folded** ("card repeats the list" scored 0): the question was asked before the card existed. It is now a second Decisions API call made once the card's data is ready, with that data as input.
- The Developer button could not be clicked: a theme rule set its stacking order to 1, so the footer strip covered it.
- Checked rows in generated checklists strike through more visibly, and progress bars have a clearer track.
- New cards are written by `gpt-6.1-sol` with **low** reasoning for speed (a brief switch to `gpt-6-luna` was reverted). `GENUI_AUTHOR_EFFORT=medium` raises it; medium is the ceiling.

### Verified live
- After `ca3e9f40e`: the winter checklist question reused the saved "Ordered preparation checklist" (Decisions API 93%, 304 ms) with its data filled in, the answer's 8-step list folded away under the card with "Show it as text" beside it, and the Developer button opens with a normal click.
- After the UI kit change, the same question produced a new "Winter prep tracker" built only from kit classes: the chat's white card, Inter, rounded checkboxes that fill dark with a white tick, and a progress bar (Decisions API: `new` at 97% in 151 ms).
- Asked for a winter checklist: the Decisions API chose `new` at 92% in 188 ms, `gpt-6.1-sol` wrote an interactive "Ordered preparation checklist" (checkboxes, progress, task notes), it rendered under the answer and now appears under **Cards** as a saved component.

### Added
- **Generative UI.** After each answer, OpenAI's Decisions model (`gpt-6-luna`, `POST /v1/decisions`) picks the UI that helps most: nothing, one of the built-in answer blocks, a component saved earlier, or a new one. Built-in blocks and saved components get their data from the answer and its tool results (gpt-6-luna), and any link or image the conversation never contained is dropped. When nothing fits and a visual is clearly worth it, `gpt-6.1-sol` writes a new component on the spot; it renders live under the answer in a sandboxed frame (scripts only, no network, CSP `default-src 'none'`) and is saved as a reusable component, so the decision model can pick it for later answers. Buttons inside a component can send the customer's next message. Answers where the agent already drew a block are skipped. New `GenUiComponent` and `GenUiRender` collections, `POST /api/genui/:messageId`, and tests. Settings: `GENUI_ENABLED`, `GENUI_AUTHOR_MODEL`, `GENUI_MAX_NEW_PER_DAY` (25).
- **Developer panel.** A "Developer" button at the bottom left of a chat (staff always; guests by opening the site with `?dev=1`) opens a side panel with two tabs: **Decisions** (every Decisions API answer loaded in this tab: the choice, its confidence, what happened, the time taken and a probability bar for each option) and **Cards** (everything the decision model can pick: built-in blocks, saved generated components with their use count and author model, plus the models and thresholds). A switch also shows each answer's decision under the reply, expandable to the full probabilities. New `GET /api/genui/catalog`; the full decision is stored with each message.

### Changed
- **Generated UI appears smoothly.** It grows in with a height animation and a fade instead of jumping into place, the placeholder stays until a generated component has laid out and then crossfades into it, and a reader already at the bottom of the chat stays there while it grows.

### Fixed
- A generated component's frame reloaded whenever the message re-rendered, because its colours were rebuilt each time; it now loads once.
- `?dev=1` did nothing for guests, because the router drops the query string before the chat mounts; it is now read when the app loads (`?dev=0` turns it off). The Developer button sat at the top left instead of the bottom left.
- Generated components drew black corners and black checkboxes when the computer was in dark mode but the page was light: the frame now uses the page's colour scheme.
- A confident "new component" decision was vetoed by the separate "is a visual worth it" check (live: `new` at 95%, worth 16%). A new component now goes ahead at confidence ≥ 0.75, or worth ≥ 0.5.

---

## 2026-10-23

### Added
- **Photo gallery for products.** Clicking a product photo in a comparison table or a product card opens it large with its name and price. Arrows, ← → keys and thumbnails step between the products; Escape, the X or a click outside closes it. (`81c9c470b`, `ee5ff9b5a`)
- **YouTube videos in the chat.** A new `video` answer block plays Hot Shot's Secret videos inline (youtube-nocookie, loads on click). (`61959a249`)
- **Product document status.** The live status line names the sheet being read, e.g. "Reading the Gasoline Extreme safety data sheet…". (`430700dc3`)
- **Premium landing screen.** A large animated orb with a soft glow and a fine dot grid, and a cool gradient instead of flat white. (`57ff472d4`, `b2744c101`, `d548ebd95`, `5f035a3e8`, `13bdcb245`)
- **Composer beam.** A blue arc travels around the input bar on the landing screen. It flares and fades out when the first message is sent, stays off while a reply streams or the user types, and returns at about a third of the strength after 12 seconds idle. New `useBeam` hook with tests. (`87d5d3a50`, `c54bbe48d`, `2e41ad5d3`, `d548310d6`)

### Changed
- **The photo gallery is now a product viewer.** The photo sits beside the product's details (the comparison rows for that product, or a product card's summary and dose), its price, and a **View product** button to its store page. Switching products swaps the details too; it stacks photo above details on phones. (`57aefa32d`)
- **Comparison tables** span the full answer column, so the right edge lines up with the input bar; product photos are larger. (`81c9c470b`)
- **Reply header.** The orb beside the latest reply now animates (older replies stay still). "Checked N sources" shows a spinner, then a green check, instead of wrench icons, for staff as well as customers. The thinking line matches it in size, colour and alignment. Answer text size is unchanged. (`99cee28a6`, `5ab45a5b8`)
- **Widget launcher** shows the bare black animated orb, like the main site, with no dark disc while closed. The orbs in the widget header and welcome message cycle too. (`13bdcb245`)
- The composer beam is drawn in Hotshot blues with a teal tip instead of a rainbow; the `border-beam` package was removed. (`87d5d3a50`, `c54bbe48d`)

### Fixed
- **Answer-block placeholders while a reply streams.** Every unfinished block showed the same product-card placeholder, so answers ending in follow-up buttons flashed a card that then shrank to a few buttons. Now nothing shows until the block's type is known, follow-ups get small button placeholders, other blocks get a placeholder in their own shape, and a block that never becomes valid shows nothing. (`495dafe6f`)
- **Enter in the dose calculator** did nothing, so it wasn't clear the dose was already worked out. Enter now confirms it with a brief highlight on the result, and the field says "Dose updates as you type". (`61a945ce7`)
- **Auto-scroll while a reply streams.** Any wheel or touch scroll over a message mid-reply (even scrolling down) stopped following for the rest of that reply, and scrolling back to the bottom never resumed it. Now scrolling up pauses following and shows the scroll-down button; scrolling back to the bottom resumes it. Tall blocks that land at once no longer knock the view out of following, and it keeps following for 2.5 seconds after a reply ends while images and tables finish loading. (`570f17bd3`)
- **Enter in the vehicle form.** On an unfinished form, Enter did nothing because Send was disabled; it now moves to the next empty field, and sends once every field is filled. (`570f17bd3`)
- The widget launcher showed the old orb because browsers cached `embed.js` for 2 days; the script URL now carries a per-build version. (`57ff472d4`)
- The landing hero overlapped the starter questions, and its two orb layers rendered side by side. (`d548ebd95`, `5f035a3e8`)
- The photo gallery sat under the site's chat launcher and teaser. (`ee5ff9b5a`)

### Config
- **Agent instructions** (staff UI → Agent setup), saved and verified:
  - New "Product documents (SDS and Tech Data)" section: say what's being checked, give the urgent first-aid step first (eyes: rinse; skin: wash; swallowed: Poison Control 1-800-222-1222 or 911; pets: vet or ASPCA (888) 426-4435), fetch the SDS together with the product, and offer a follow-up.
  - Video block rule: only use URLs from `recommend_youtube_video` or `get_youtube_video_by_url`.
  - Response style: no em dashes touching words.
  - Fast level: call `get_product_document` with `detail: "full"`.
  - `get_product_document` enabled on the agent.
  - Follow-up suggestions: after a complete product, dose, comparison or diagnosis answer, the agent ends with 2 to 3 tappable follow-up questions specific to that answer (not for urgent safety answers, or when the reply already ends with a question). This replaces the rule "When the request is fully answered, stop. Do not add a generic follow-up question."

### Deployed
- All of the above is live. Last deploy: `495dafe6f`.

---

## 2026-10-22

### Changed
- **Embed widget settings** in Agent setup redesigned into clear groups (Look, Placement, Greeting, Behaviour) with a live preview; a second pass fixed the orb and layout issues. (`1daf6ef3a`, `bebd1eb73`)

### Deployed
- `bebd1eb73`.

---

## 2026-10-21

### Added
- **Interactive answer blocks:** product card with size picker and live price, side-by-side comparison with a verdict, dose calculator, and quick-reply buttons. Customer chat modernised. (`eba2c743c`)
- **Configurable embed widget** from Agent setup: one script tag, launcher, teaser bubble, branded panel, starter questions, Auto · Deep · Ultra slider, allowed domains. (`d7a0c0ffa`, `454e6b97f`, `3bde6fbf3`, `9d7c7ab26`)
- The floating widget on the public chat pages, and a demo page styled as a Hot Shot's Secret storefront. (`26334977b`, `f9ce23ae3`, `1fa8c68ce`)
- The thinking-orbs orb as the Hotshot AI icon, cycling through its states on the landing screen. (`889e58b86`, `cba9f47c5`)
- **GPT-6 models** (gpt-6-luna, gpt-6.1-sol, gpt-6-astra), web search limited to hotshotsecret.com, and customer and staff fixes. (`47a10616a`)

### Fixed
- Three rounds of chat fixes: user bubbles, block styling, streaming dot, block links and tables, actions, widget width, calculator name key, empty-state copy. (`08f2683ce`, `7bc3f5b23`, `22c2a9562`)
- Staff sessions silently turning into guest sessions. (`26ec688f1`)
- Widget mode leaking into the full app outside a frame; widget settings not loading for first-time visitors. (`673fd93b7`, `3543d8f97`)
- The embed loader, demo page and orb are revalidated on every use. (`883a80560`)

---

## 2026-09-01 to 2026-09-07

### Added
- Hotshot branding, customer copy and a quieter tool-call UI. (`7d8486e45`, `b8c46b93a`)
- Intelligence levels with a configurable default (new chats start on Balanced), and per-level reasoning effort. (`0630e0417`, `1b0d8843c`, `058ad1abc`)
- Automatic chat reviews and a full-page Agent setup. (`058ad1abc`)
- The responding model per message; the live reasoning heading while a reply is generated. (`8f6e2281d`, `201a7d180`, `e691dd546`)
- Full-size product images; `STRESS_TESTS.md` for repeatable agent testing. (`5fd7ad39a`, `cbe01f1c6`)

### Fixed
- The embed widget loading a chat; tool-using GPT-5.6 agents routed through the Responses API. (`65c1a0de8`, `8d000dc2d`)
- A regenerated guest index blocking deploys; `run.sh` guest HTML edits failing on macOS. (`d3fee2f39`, `dc8ad9aa6`)
