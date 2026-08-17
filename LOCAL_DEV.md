# Hotshot LibreChat — simple local setup

**This is the guide to follow the first time** (and every day after) to run Hotshot on a laptop the same way production does: local app + **live** MongoDB.

After local works, see **[WORKFLOW.md](./WORKFLOW.md)** for: edit → push → update the server.

Customer vs staff vs admin panel (no env restart): **[VIEWS.md](./VIEWS.md)**.

---

## What is going on? (simple)

There are **two parts**:

1. **The app** (LibreChat) — can run on your laptop OR on the server
2. **The database** (MongoDB) — lives on the server and holds **Hotshot Secret AI**

```
Your laptop                         Server (betterai-server)
┌──────────────────┐                ┌─────────────────────┐
│ LibreChat        │  SSH tunnel    │ MongoDB             │
│ localhost:6041   │ ─────────────► │ (Hotshot agent,     │
│                  │   port 27018   │  chats, users)      │
└──────────────────┘                └─────────────────────┘
```

- If you only run Docker with a **local empty DB** → you **won’t** see Hotshot Secret AI.
- If you use `./run.sh` → local app + **live DB** → you **will** see the same agent as production.

Local uses the **same port as the server: 6041**. Do not remap it to 3080.

Production site (separate): https://hotshotai.thebetterai.com

---

## One-time setup (do this once per computer)

### 1) Install Docker (WSL)

```bash
docker info
```

If that fails with **permission denied**:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker info
```

### 2) Get the code

```bash
cd ~/better-ai-projects/hotshot-librechat
git checkout main
git pull
```

### 3) Get SSH working to the server

```bash
ssh betterai-server
# or: ssh root@187.77.205.200
```

If that works, type `exit`.

Optional `~/.ssh/config`:

```
Host betterai-server
  HostName 187.77.205.200
  User root
  IdentityFile ~/.ssh/id_ed25519
```

### 4) Copy `.env` from the server

```bash
cd ~/better-ai-projects/hotshot-librechat

scp betterai-server:/root/better-ai-projects/hotshot-librechat/.env ./.env
```

Keep **`PORT=6041`** as it is on the server. Only point the two domain lines at your laptop (so cookies and redirects work on localhost, not the live site).

In `.env`, set:

```env
DOMAIN_CLIENT=http://localhost:6041
DOMAIN_SERVER=http://localhost:6041
PUBLIC_GUEST_MODE=true
```

Leave `PORT=6041`. Do not change it to 3080.

Check:

```bash
grep -E '^(PORT|DOMAIN_|PUBLIC_GUEST_MODE)' .env
```

Should include:

```
PORT=6041
DOMAIN_CLIENT=http://localhost:6041
DOMAIN_SERVER=http://localhost:6041
PUBLIC_GUEST_MODE=true
```

### 5) Fix folder permissions

```bash
mkdir -p logs uploads images skill
sudo chown -R "$(id -u):$(id -g)" logs uploads images skill 2>/dev/null || true
```

`./run.sh` creates `docker-compose.local.yml` from the example if it is missing. That file tells Docker to use live Mongo through the SSH tunnel. Do not commit it.

---

## Every day (normal work)

```bash
cd ~/better-ai-projects/hotshot-librechat
./run.sh
```

What this does:

1. Opens SSH tunnel → laptop `:27018` → server Mongo
2. Starts Docker containers
3. Points local LibreChat at the live DB

Then open: **http://localhost:6041**

| Who | URL |
|-----|-----|
| Customer / guest | http://localhost:6041 |
| Staff login | http://localhost:6041/login?staff=1 |

### Useful commands

```bash
./run.sh status     # are containers + tunnel up?
./run.sh restart    # restart app containers
./run.sh tunnel     # only fix/reopen the SSH tunnel
./run.sh down       # stop containers (tunnel stays up)
```

Stop the tunnel when done for the day:

```bash
lsof -tiTCP:27018 | xargs -r kill
```

---

## Important files (what each one is)

| File | Commit to git? | What it is |
|------|----------------|------------|
| `.env` | **No** | Secrets + API keys. Copy from server. |
| `docker-compose.local.yml` | **No** | Local-only: “use live Mongo via tunnel”. |
| `docker-compose.local.yml.example` | Yes | Template for the file above. |
| `docker-compose.yml` | Yes | Base Docker services. |
| `docker-compose.override.yml` | Yes | Local image build + `librechat.yaml` mount. |
| `librechat.yaml` | Yes | App config. Default agent id lives here. |
| `run.sh` | Yes | One command to tunnel + start. |
| `LOCAL_DEV.md` | Yes | This guide. |

---

## Team / other developers

Each developer needs:

1. This repo
2. Docker working (`docker info`)
3. Their **own SSH key** added on the server
4. Their **own** `.env` (from server or team vault) — never commit it
5. `./run.sh` every day

Everyone shares the **same live database**.
So: be careful — your test chats and agent edits are real production data.

---

## Common problems (copy-paste fixes)

### “Docker is not running” but `systemctl` says Docker is up

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker info
./run.sh
```

### “Missing .env”

```bash
scp betterai-server:/root/better-ai-projects/hotshot-librechat/.env ./.env
```

Then set `DOMAIN_CLIENT` and `DOMAIN_SERVER` to `http://localhost:6041` (keep `PORT=6041`). See setup step 4.

### “Missing docker-compose.local.yml”

Re-run `./run.sh` (it copies the example). Or create it by hand:

```bash
cp docker-compose.local.yml.example docker-compose.local.yml
```

### App starts then dies: `EACCES ... /app/logs`

```bash
sudo chown -R "$(id -u):$(id -g)" logs uploads images skill
docker restart LibreChat
```

### Containers up but page never loads / Mongo errors

Tunnel must listen on **all interfaces** (`*:27018`), not only `127.0.0.1`:

```bash
lsof -tiTCP:27018 | xargs -r kill
ssh -o BatchMode=yes -o ExitOnForwardFailure=yes -fN \
  -L 0.0.0.0:27018:127.0.0.1:27017 \
  betterai-server
docker restart LibreChat
```

### Blank white page, tab says “Hotshot AI”

Guest HTML has old JS file names. Refresh it from your image:

```bash
docker run --rm --entrypoint cat librechat /app/client/dist/index.html \
  > admin-branding/guest/index.html
sed -i 's#<title>[^<]*</title>#<title>Hotshot AI</title>#' admin-branding/guest/index.html
docker restart LibreChat
```

Hard refresh browser: **Ctrl+Shift+R**

### Check that Hotshot agent is wired

After the app is up (guest or staff session):

```bash
curl -fsS http://localhost:6041/api/config | python3 -c '
import sys, json
d = json.load(sys.stdin)
print("title:", d.get("appTitle"))
for s in d.get("modelSpecs", {}).get("list", []):
    print(s.get("label"), s.get("preset"))
'
```

Unauthenticated `/api/config` may show no modelSpecs — that is normal. You want the chat UI to show **Hotshot Secret AI**.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `./run.sh` | Rely on plain `docker compose up` for Hotshot |
| Keep `PORT=6041` (same as server) | Remap local to 3080 |
| Keep tunnel up while developing | Commit `.env` or `docker-compose.local.yml` |
| Pull `main` often | Delete data on live DB for experiments |

---

## One-line summary

**`./run.sh` = local LibreChat + live Hotshot database.**
Open http://localhost:6041.
