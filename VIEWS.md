# Customer view vs Admin / Staff — no more env restarts

**Keep `PUBLIC_GUEST_MODE=true` always.** Do not flip it and restart.

Both views stay available at the same time.

---

## Three URLs (bookmark these)

### 1) Customer chat (guest)
Anyone can chat as Hotshot Secret AI — no login.

| Where | URL |
|-------|-----|
| Laptop | http://localhost:3080 |
| Live | https://hotshotai.thebetterai.com |

### 2) Staff login (edit agents inside LibreChat)
Same app, but **log in as your admin user**.

| Where | URL |
|-------|-----|
| Laptop | http://localhost:3080/login?staff=1 |
| Live | https://hotshotai.thebetterai.com/login?staff=1 |

Or click **Staff login** in the guest chat header.

### 3) Admin panel (LibreChat Admin UI)
Separate app (already running next to LibreChat).

| Where | URL |
|-------|-----|
| Laptop | http://localhost:3000 |
| Server | http://SERVER_IP:3000 (or SSH tunnel) |

No env change. No restart.

---

## What NOT to do anymore

```bash
# DON'T do this anymore:
# edit .env PUBLIC_GUEST_MODE=false
# docker restart LibreChat
# ... then flip back to true later
```

That was the painful loop. It is unnecessary now.

---

## How to switch as a human

| I want… | I open… |
|---------|---------|
| Customer experience | `/` (guest auto-starts) |
| Staff / agent builder in chat app | `/login?staff=1` then sign in |
| Admin panel | `:3000` |

To go back to customer view after staff login: open `/` in a private window, or log out and clear `sessionStorage` key `lc-staff-login`, then visit `/`.

Quick customer reset in the browser console:

```js
sessionStorage.removeItem('lc-staff-login');
location.href = '/';
```

---

## Server `.env` (set once)

```env
PUBLIC_GUEST_MODE=true
```

Leave it. Forever (until you intentionally disable public guest chat).

---

## After UI code changes

Staff login button ships with the app build. Deploy with:

```bash
# on server
./deploy.sh
```

See **[WORKFLOW.md](./WORKFLOW.md)**.
