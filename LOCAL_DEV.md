# Local Hotshot (laptop + live Mongo)

Follow **this file** the first time. Later: **[WORKFLOW.md](./WORKFLOW.md)** (push/deploy), **[VIEWS.md](./VIEWS.md)** (guest vs staff).

Laptop runs the **app**. The **database** (Hotshot Secret AI) stays on the server. `./run.sh` opens an SSH tunnel and points Docker at that DB.

Do **not** use plain `docker compose up` (empty local Mongo — no Hotshot).  
Keep **port 6041** (same as the server). Do not remap to 3080.

Live site: https://hotshotai.thebetterai.com

---

## First time (one computer)

Need: Docker (`docker info`), git, SSH to the server (`ssh betterai-server` or `ssh root@187.77.205.200`). If Docker says permission denied: `sudo usermod -aG docker "$USER"` then log out/in.

```bash
cd ~/better-ai-projects/hotshot-librechat   # or wherever you cloned
git checkout main && git pull

scp betterai-server:/root/better-ai-projects/hotshot-librechat/.env ./.env
```

In `.env` keep `PORT=6041`. Change only:

```env
DOMAIN_CLIENT=http://localhost:6041
DOMAIN_SERVER=http://localhost:6041
PUBLIC_GUEST_MODE=true
```

```bash
mkdir -p logs uploads images skill
sudo chown -R "$(id -u):$(id -g)" logs uploads images skill 2>/dev/null || true
```

**Build the image** (required on a new machine). First build can take **~1 hour** and look stuck after `npm run frontend` — wait until `Image librechat Built`.

```bash
./run.sh build
./run.sh
```

`./run.sh` starts the tunnel, creates `docker-compose.local.yml` if missing (do not commit it), and refreshes guest `index.html` so JS hashes match the image.

Open **http://localhost:6041** — hard-refresh (**Ctrl+Shift+R**). Guest chat + **Staff login** (or `/login?staff=1`).

This uses the **live** DB. Test chats and agent edits are production data.

---

## Every day

```bash
./run.sh                  # http://localhost:6041
./run.sh build            # after code changes (not UID=... — readonly in bash)
./run.sh restart
./run.sh status
./run.sh down             # tunnel stays up
```

Stop the tunnel: `lsof -tiTCP:27018 | xargs -r kill`

---

## If something looks wrong

| What you see | What to do |
|--------------|------------|
| No **Staff login**, `/api/config` has no `publicGuestMode` | Image is old. Run `./run.sh build`, then `./run.sh`. |
| `bash: UID: readonly variable` | Do not prefix commands with `UID=...`. Use `./run.sh build`. |
| Console **404** on `hooks.*.js` / blank page after a rebuild | Stale guest HTML. `./run.sh` should fix it; then Ctrl+Shift+R. Or: `docker run --rm --entrypoint cat librechat /app/client/dist/index.html > admin-branding/guest/index.html` then `./run.sh restart`. |
| Blank page, spam **401** on `/api/auth/refresh` | Old cookies. Incognito, or clear site data for `localhost:6041` + unregister service workers. A few 401s then guest chat is normal. |
| Chat works but not Hotshot / empty Mongo errors | Tunnel down: `./run.sh tunnel`. Must listen on `0.0.0.0:27018`, not only 127.0.0.1. |
| `EACCES` on `/app/logs` | `sudo chown -R "$(id -u):$(id -g)" logs uploads images skill` then `docker restart LibreChat`. |
| Docker permission denied | Add user to `docker` group (above), then `newgrp docker`. |

Never commit `.env` or `docker-compose.local.yml`.
