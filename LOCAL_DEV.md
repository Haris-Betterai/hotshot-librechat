# Local development against the live Hotshot database

This fork is set up so your **local LibreChat containers** talk to the **production MongoDB** on `betterai-server` through an SSH tunnel.

That is why **Hotshot Secret AI** (`agent_nKWTo2vBXJZCNFl57pA6K`) appears on the live site but not when you only run `docker compose up`: the agent document lives in live Mongo, not in git and not in a fresh local DB.

```text
  WSL / laptop                         betterai-server
  ┌─────────────────────────┐          ┌──────────────────────────┐
  │ LibreChat (Docker)      │          │                          │
  │  MONGO_URI ─────────────┼──SSH───► │  MongoDB :27017/LibreChat│
  │  host.docker.internal   │ tunnel   │  (Hotshot Secret AI,     │
  │       :27018            │          │   users, chats, ACLs)    │
  └─────────────────────────┘          └──────────────────────────┘
```

---

## Prerequisites

1. **Docker** (Docker Engine) running in WSL.
2. Your Linux user must be able to run `docker info` **without sudo**.
3. **SSH access** to the live server (same key you use for `ssh betterai-server` or `ssh root@187.77.205.200`).
4. Repo checkout of this project.

### Docker permission (common WSL issue)

`docker --version` can work while `./run.sh` still fails with “Docker is not running”.
That usually means the **daemon is up**, but your user cannot access `/var/run/docker.sock`.

Check:

```bash
sudo systemctl status docker    # should be active (running)
docker info                     # must work WITHOUT sudo
```

If `docker info` says permission denied:

```bash
sudo usermod -aG docker "$USER"
newgrp docker                   # or log out of WSL and back in
docker info                     # confirm it works
./run.sh
```

5. Recommended SSH config on your machine (`~/.ssh/config`):

```sshconfig
Host betterai-server
  HostName 187.77.205.200
  User root
  IdentityFile ~/.ssh/id_ed25519
```

`./run.sh` defaults to `SERVER_SSH=root@187.77.205.200`. To use your Host alias:

```bash
export SERVER_SSH=betterai-server
```

---

## One-time setup

From the repo root:

```bash
# 1) Env file (secrets + keys). Do not commit .env.
cp .env.example .env
# Edit .env: set API keys (DeepSeek, etc.), JWT secrets, ADMIN_PANEL_SESSION_SECRET.
# For local UI ports, keep something like:
#   HOST=localhost
#   PORT=3080
#   DOMAIN_CLIENT=http://localhost:3080
#   DOMAIN_SERVER=http://localhost:3080
# MONGO_URI in .env is overridden by docker-compose.local.yml for the API container.

# 2) Live-Mongo overlay (gitignored). ./run.sh will create this if missing.
cp docker-compose.local.yml.example docker-compose.local.yml

# 3) Confirm SSH works (BatchMode = key auth, no password prompt)
ssh -o BatchMode=yes "${SERVER_SSH:-root@187.77.205.200}" 'hostname; docker ps --format "{{.Names}}" | grep -E "mongodb|LibreChat"'
```

What `docker-compose.local.yml` does:

- Sets API `MONGO_URI` to `mongodb://host.docker.internal:27018/LibreChat`
- Replaces the local `mongodb` service with a no-op (so you do not spin up an empty DB)

`librechat.yaml` (including `modelSpecs` → Hotshot Secret AI) is already bind-mounted via `docker-compose.override.yml`.

---

## Daily workflow

```bash
chmod +x ./run.sh   # once

./run.sh            # open SSH tunnel :27018 → server Mongo, then docker compose up -d
```

When ready:

| URL | What |
|-----|------|
| http://localhost:3080 | LibreChat (guest / chat) |
| http://localhost:3000 | Admin panel |

### Commands

| Command | Meaning |
|---------|---------|
| `./run.sh` / `./run.sh up` | Tunnel + start stack |
| `./run.sh status` | Containers + tunnel health |
| `./run.sh restart` | Recreate `api` + `admin-panel` (keeps / refreshes tunnel) |
| `./run.sh tunnel` | Only ensure the SSH tunnel is up |
| `./run.sh down` | Stop containers; **leaves tunnel running** |

Stop the tunnel when finished:

```bash
lsof -tiTCP:27018 | xargs -r kill
```

---

## Verify Hotshot Secret AI is wired correctly

1. Tunnel is listening:

```bash
lsof -nP -iTCP:27018 -sTCP:LISTEN
```

2. From the host, Mongo on the tunnel answers (optional; needs `mongosh`):

```bash
mongosh --quiet "mongodb://127.0.0.1:27018/LibreChat" --eval 'db.agents.find({id:"agent_nKWTo2vBXJZCNFl57pA6K"},{id:1,name:1,model:1}).toArray()'
```

You should see `Hotshot Secret AI`.

3. App config exposes the default model spec:

```bash
curl -fsS http://localhost:3080/api/config | python3 -c '
import sys, json
d = json.load(sys.stdin)
print("appTitle:", d.get("appTitle"))
for s in (d.get("modelSpecs") or {}).get("list") or []:
    print(s.get("name"), "default=", s.get("default"), "agent=", (s.get("preset") or {}).get("agent_id"))
'
```

Expect `hotshot-secret-ai` with `agent_nKWTo2vBXJZCNFl57pA6K`.

4. In the UI, open a new chat — default should be **Hotshot Secret AI**.

---

## Important warnings

- **This writes to production data.** Chats, users, agent edits, and settings go to the **live** MongoDB. Do not run destructive experiments against this tunnel.
- Keep the tunnel up while the local API is running. If it drops, the app will lose the database (`./run.sh tunnel` to restore).
- Do **not** commit `.env` or `docker-compose.local.yml` (both gitignored).
- Production site remains on the server (`hotshotai.thebetterai.com` → container port `6041`). Local is a separate process that shares only the DB (and whatever keys you put in your local `.env`).

---

## Troubleshooting

### “I don’t see Hotshot Secret AI”

| Check | Fix |
|-------|-----|
| Used plain `docker compose up` without the local overlay | Use `./run.sh`, or ensure `docker-compose.local.yml` exists and `COMPOSE_FILE` includes it |
| Tunnel down | `./run.sh tunnel` then `./run.sh restart` |
| Empty / wrong Mongo | Confirm `docker compose config` shows `MONGO_URI=...host.docker.internal:27018/LibreChat` for `api` |
| Old containers still on local Mongo | `./run.sh down && ./run.sh` |

```bash
# Confirm which Mongo the API would use
UID="$(id -u)" GID="$(id -g)" \
  docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.local.yml \
  config | grep -A1 MONGO_URI
```

### SSH tunnel fails

```bash
ssh -v "${SERVER_SSH:-root@187.77.205.200}" 'echo ok'
```

- Fix key auth / `~/.ssh/config` first.
- Port `27018` already in use: change `TUNNEL_LOCAL_PORT` **and** the port in `docker-compose.local.yml` to match.

### Port conflicts

- Local UI: `3080` (app), `3000` (admin).
- Tunnel: `27018` (host) → server `27017`.
- `docker-compose.override.yml` also publishes server Mongo on the **server** as `127.0.0.1:27017` — that does not bind your laptop; the tunnel is what reaches it.

### Want a fully isolated local DB again

Remove or rename the overlay and start without the tunnel:

```bash
./run.sh down
mv docker-compose.local.yml docker-compose.local.yml.bak
# Plain compose uses the empty local mongodb service again:
UID="$(id -u)" GID="$(id -g)" docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

You will **not** see Hotshot Secret AI until you restore the live-DB overlay.

---

## Related files

| File | Role |
|------|------|
| `run.sh` | Tunnel + compose orchestration |
| `docker-compose.local.yml.example` | Template for live Mongo URI |
| `docker-compose.local.yml` | Your local copy (gitignored) |
| `docker-compose.override.yml` | Image build, `librechat.yaml` mount, branding |
| `librechat.yaml` → `modelSpecs` | Default UI selection → agent id |
| Live Mongo `agents` collection | Actual agent definition / tools / instructions |
