# Hotshot LibreChat — simple local setup

This is the only guide you need to run Hotshot on your laptop.

---

## What is going on? (simple)

There are **two parts**:

1. **The app** (LibreChat) — can run on your laptop OR on the server  
2. **The database** (MongoDB) — lives on the server and holds **Hotshot Secret AI**

```
Your laptop                         Server (betterai-server)
┌──────────────────┐                ┌─────────────────────┐
│ LibreChat        │  SSH tunnel    │ MongoDB             │
│ localhost:3080   │ ─────────────► │ (Hotshot agent,     │
│                  │   port 27018   │  chats, users)      │
└──────────────────┘                └─────────────────────┘
```

- If you only run Docker with a **local empty DB** → you **won’t** see Hotshot Secret AI.  
- If you use `./run.sh` → local app + **live DB** → you **will** see the same agent as production.

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

Then fix ports for your laptop (server uses 6041; local uses 3080):

```bash
sed -i \
  -e 's/^HOST=.*/HOST=localhost/' \
  -e 's/^PORT=.*/PORT=3080/' \
  -e 's|^DOMAIN_CLIENT=.*|DOMAIN_CLIENT=http://localhost:3080|' \
  -e 's|^DOMAIN_SERVER=.*|DOMAIN_SERVER=http://localhost:3080|' \
  .env
```

Check:

```bash
grep -E '^(HOST|PORT|DOMAIN_)' .env
```

Should show:

```
HOST=localhost
PORT=3080
DOMAIN_CLIENT=http://localhost:3080
DOMAIN_SERVER=http://localhost:3080
```

### 5) Create the “use live DB” Docker file

This file is **required**. It tells the local app to use the server database.

```bash
cd ~/better-ai-projects/hotshot-librechat

cat > docker-compose.local.yml <<'EOF'
services:
  api:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - MONGO_URI=mongodb://host.docker.internal:27018/LibreChat
  mongodb:
    image: tianon/true:latest
    restart: "no"
    entrypoint: ["/true"]
    command: []
    ports: !reset []
    volumes: !reset []
    user: "0:0"
EOF
```

(Newer `./run.sh` can create this for you from `docker-compose.local.yml.example`.)

### 6) Fix folder permissions

```bash
sudo chown -R "$(id -u):$(id -g)" logs uploads images skill 2>/dev/null || true
mkdir -p logs uploads images skill
```

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

Then open: **http://localhost:3080**

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
# then run the sed PORT=3080 commands from setup step 4
```

### “Missing docker-compose.local.yml”

Run the `cat > docker-compose.local.yml <<'EOF' ...` block from setup step 5.

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

```bash
curl -fsS http://localhost:3080/api/config | python3 -c '
import sys, json
d = json.load(sys.stdin)
print("title:", d.get("appTitle"))
for s in d.get("modelSpecs", {}).get("list", []):
    print(s.get("label"), s.get("preset"))
'
```

You want: `Hotshot Secret AI` and `agent_nKWTo2vBXJZCNFl57pA6K`.

---

## Do / Don’t

| Do | Don’t |
|----|--------|
| Use `./run.sh` | Rely on plain `docker compose up` for Hotshot |
| Keep tunnel up while developing | Commit `.env` or `docker-compose.local.yml` |
| Pull `main` often | Delete data on live DB for experiments |

---

## One-line summary

**`./run.sh` = local LibreChat + live Hotshot database.**  
Open http://localhost:3080.
