# Customer view vs Staff (edit agents)

**Keep `PUBLIC_GUEST_MODE=true` always.** Do not flip it and restart.

Customer chat and staff tools are **different URLs**. You can keep both open at the same time. You do **not** need to log out to see the customer view.

---

## The two URLs that matter

### 1) Customer chat (public)

No login. Customers talk to Hotshot Secret AI.

| Where | URL |
|-------|-----|
| Laptop | http://localhost:6041 |
| Live | https://hotshotai.thebetterai.com |

Staff who are already logged in can open this same URL (or click **Customer view** in the header). It stays the public chrome — no sidebar — without ending the staff session.

### 2) Staff workspace

Logged-in staff: sidebar, agents, model selector.

| Where | URL |
|-------|-----|
| Laptop | http://localhost:6041/staff |
| Live | https://hotshotai.thebetterai.com/staff |

First time: http://localhost:6041/login?staff=1 (or **Staff login** on the public header).

Login with:

- Email: `betteraibots@gmail.com`
- Your admin password

After login you land on `/staff`. Open **Agents** in the side panel to view/edit Hotshot Secret AI.

**If `/login?staff=1` keeps sending you back to chat:** you are still a guest.
In the browser console run:

```js
sessionStorage.setItem('lc-staff-login', '1');
location.href = '/login?staff=1';
```

Or open a **private/incognito** window → go to `/login?staff=1`.

---

## Switch without logout

| You want | Open |
|----------|------|
| Customer UI | `/` or `/c/new` (or **Customer view**) |
| Staff UI | `/staff` (or **Staff** on the public header) |

Two browser tabs — one on each URL — is the intended workflow.

Logout is only needed when you want to end the staff session entirely.

---

## What NOT to do

```bash
# DON'T:
# edit .env PUBLIC_GUEST_MODE=false
# docker restart
# use :3000 admin panel to edit agents  ← wrong tool for this
```

---

## Server `.env` (once)

```env
PUBLIC_GUEST_MODE=true
```

Leave it on.

---

## Related

- Local setup: [LOCAL_DEV.md](./LOCAL_DEV.md)
- Push / deploy: [WORKFLOW.md](./WORKFLOW.md)
