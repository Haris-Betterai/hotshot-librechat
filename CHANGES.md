# Hotshot LibreChat — what we changed

Summary of product/UI/workflow changes made for Hotshot (customer guest chat + staff admin in one deploy, without flipping env vars).

For **laptop local setup** (`./run.sh`, live Mongo tunnel), see **[LOCAL_DEV.md](./LOCAL_DEV.md)** — that guide is separate and not repeated here.

---

## Goals we solved

1. **Stop toggling `PUBLIC_GUEST_MODE`** and restarting to switch customer ↔ admin.
2. **Staff can log in**, see/edit agents, use the model/agent dropdown, then **log out back to guest chat**.
3. **Simple server update path**: push to `main`, then `./deploy.sh` on the server.
4. Keep the **customer experience** simple (guest, Hotshot Secret AI only).

---

## How it works now (product)

| Who | URL | What they get |
|-----|-----|----------------|
| Customer | `/` (e.g. https://hotshotai.thebetterai.com) | Auto guest session, Hotshot Secret AI |
| Staff / admin | `/login?staff=1` or **Staff login** button | Normal login → agents, model dropdown |
| After staff logout | `/` | Guest chat again |

Keep in `.env` (server + local):

```env
PUBLIC_GUEST_MODE=true
```

Do **not** flip this for day-to-day admin work.

The separate Admin Panel on `:3000` is **not** used for editing Hotshot chat agents. Use staff login inside LibreChat.

More detail: **[VIEWS.md](./VIEWS.md)** · **[WORKFLOW.md](./WORKFLOW.md)**

---

## UI / app behavior changes

### 1) Staff login without killing guest mode

**Problem:** Guest auto-login always ran; `/login` bounced authenticated guests back to chat; teams flipped `PUBLIC_GUEST_MODE` and restarted.

**What we did:**

- Expose `publicGuestMode` from the API so the UI knows guest mode is on.
- Skip auto-guest when `?staff=1` or `sessionStorage lc-staff-login=1`.
- Add a **Staff login** button for guests (logs out guest → `/login?staff=1`).
- If a guest hits `/login?staff=1`, end the guest session instead of redirecting to `/c/new`.
- On normal staff logout: clear staff flag and go to `/` so guest starts again.
- Staff login button still uses `logout('/login?staff=1')` and keeps the staff flag.

**Files:**

| File | Why |
|------|-----|
| `api/server/routes/config.js` | Add `publicGuestMode` to startup/config payload |
| `packages/data-provider/src/config.ts` | Type `TStartupConfig.publicGuestMode` |
| `client/src/hooks/AuthContext.tsx` | Staff flag, guest vs staff login/logout redirects |
| `client/src/components/Chat/Header.tsx` | **Staff login** button; hide model selector for guests |
| `client/src/routes/Layouts/Startup.tsx` | Guest + `?staff=1` → logout to staff login (no bounce to chat) |
| `client/src/routes/__tests__/StartupLayout.spec.tsx` | Mock `useAuthContext` for Startup tests |
| `client/src/locales/en/translation.json` | `com_ui_staff_login` → “Staff login” |

---

### 2) Model / agent dropdown for staff only

**Problem:** `interface.modelSelect: false` hid the full agents/endpoints menu, so staff could not easily pick agents or open endpoint API-key UI.

**What we did:**

- Set `modelSelect: true` in `librechat.yaml`.
- Hide the header **ModelSelector** for guest (`provider === 'anonymous'`) so customers stay on Hotshot only.
- Staff (logged in) see the dropdown and can switch agents / manage keys.

**Files:**

| File | Why |
|------|-----|
| `librechat.yaml` | `interface.modelSelect: true` |
| `client/src/components/Chat/Header.tsx` | `{!isGuest && <ModelSelector ... />}` |

---

## Deploy / server workflow (not UI, but required)

**Problem:** Server was on branch `live`; updating production was unclear; local-dev compose overlay must never run on the server.

**What we did:**

- Server repo uses **`main`**.
- Added `./deploy.sh`: pull `main`, rebuild LibreChat image, refresh guest `index.html` hashes, restart, health-check.
- Documented laptop → push → server deploy, and agent-vs-code change rules.

**Files:**

| File | Why |
|------|-----|
| `deploy.sh` | One-command production update |
| `WORKFLOW.md` | Push/deploy + agent-vs-code explanation |
| `VIEWS.md` | Customer vs staff URLs (no env toggle) |
| `AGENTS.md` | Links to LOCAL_DEV / WORKFLOW / VIEWS |

---

## Docs added (reference)

| File | Purpose |
|------|---------|
| `VIEWS.md` | Customer vs staff; no `PUBLIC_GUEST_MODE` flip |
| `WORKFLOW.md` | Edit → push → `./deploy.sh` |
| `LOCAL_DEV.md` | Laptop + live Mongo via `./run.sh` (see that file) |
| `CHANGES.md` | This summary |

Local-dev tooling also touched (details in LOCAL_DEV.md): `run.sh`, `docker-compose.local.yml.example`, `.gitignore`, `what-i-did.md`.

---

## What we did **not** change (important)

- Hotshot agent **data** still lives in **MongoDB** (not git). Staff edits in the UI are live DB.
- Default agent id in yaml remains `agent_nKWTo2vBXJZCNFl57pA6K` (`modelSpecs`).
- Guest branding still uses `admin-branding/guest/index.html` bind-mount; `deploy.sh` refreshes it after each image build so asset hashes match.
- Separate Admin Panel (`:3000`) was left running but is **out of scope** for agent editing.

---

## Ops notes from this work

- Admin user email on live DB: `betteraibots@gmail.com` (password was reset once during setup — change it in-app if needed).
- After UI deploys, hard-refresh or clear service worker if the browser looks stale.
- Production update:

```bash
ssh betterai-server
cd /root/better-ai-projects/hotshot-librechat
./deploy.sh
```

---

## Quick file map (product-facing)

```
api/server/routes/config.js          → publicGuestMode flag to UI
packages/data-provider/src/config.ts → TS type for that flag
client/.../AuthContext.tsx           → guest vs staff auth flow
client/.../Header.tsx                → Staff login button; model select for staff only
client/.../Startup.tsx               → fix staff login when already guest
client/.../en/translation.json       → Staff login label
librechat.yaml                       → modelSelect: true
deploy.sh / WORKFLOW.md / VIEWS.md   → how to run and update production
```
