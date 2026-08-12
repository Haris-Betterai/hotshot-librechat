# Customer view vs Staff (edit agents)

**Keep `PUBLIC_GUEST_MODE=true` always.** Do not flip it and restart.

You only need **two** views. Ignore the separate Admin Panel (`:3000`) for Hotshot agent work — it does not show/edit your chat agents.

---

## The two URLs that matter

### 1) Customer chat (guest)
No login. Customers talk to Hotshot Secret AI.

| Where | URL |
|-------|-----|
| Laptop | http://localhost:3080 |
| Live | https://hotshotai.thebetterai.com |

### 2) Staff login (see + edit agents)
Same LibreChat app, logged in as admin.

| Where | URL |
|-------|-----|
| Laptop | http://localhost:3080/login?staff=1 |
| Live | https://hotshotai.thebetterai.com/login?staff=1 |

**If `/login?staff=1` keeps sending you back to chat:** you are still a guest.
In the browser console run:

```js
sessionStorage.setItem('lc-staff-login', '1');
location.href = '/login?staff=1';
```

Or open a **private/incognito** window → go to `/login?staff=1`.

Login with:

- Email: `betteraibots@gmail.com`
- Your admin password

Then open **Agents** in the side panel to view/edit Hotshot Secret AI.

Staff also get the **model / agent dropdown** in the header (enabled via `interface.modelSelect` in `librechat.yaml`). Guests do not see it — they stay on Hotshot Secret AI only.

(Or click **Staff login** in the guest header after you deploy the latest UI.)

---

## What NOT to do

```bash
# DON'T:
# edit .env PUBLIC_GUEST_MODE=false
# docker restart
# use :3000 admin panel to edit agents  ← wrong tool for this
```

---

## Switch back to customer view

Just **Log out** from the staff account — you should return to guest chat automatically.

If you are stuck on the login page:

```js
sessionStorage.removeItem('lc-staff-login');
location.href = '/';
```

Or open a private window on `/`.

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
