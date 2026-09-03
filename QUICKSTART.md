# Quickstart — Run Hotshot Locally

One file. Follow top to bottom.

---

## Prerequisites

Install these first:

1. **Docker** — `docker info` should work without errors
2. **Git** — `git --version`

If Docker says "permission denied":
```bash
sudo usermod -aG docker "$USER"
# then log out and log back in
```

**Already have the repo cloned and .env file?** Skip Steps 1–2. Just run:

```bash
./setup.sh
```

`setup.sh` verifies your `.env`, creates the data directories, builds the image (first time only), and starts the app — everything below, in one command. Then open **http://localhost:6041**.

---

## Step 1 — Clone the repo

```bash
git clone <repo-url> hotshot-librechat
cd hotshot-librechat
```

---

## Step 2 — Get the .env file

You need the `.env` file from the server. Get it however works for you:
- Ask someone to send it
- Copy from a shared drive
- If you have SSH access: `scp user@server:/path/to/hotshot-librechat/.env ./.env`

Then open `.env` and make sure these lines are set:

```env
PORT=6041
DOMAIN_CLIENT=http://localhost:6041
DOMAIN_SERVER=http://localhost:6041
PUBLIC_GUEST_MODE=true
```

---

## Step 3 — Create data directories

**Tip:** Steps 3–5 are exactly what `./setup.sh` does for you in one command. Only follow them if you prefer doing it manually.

```bash
mkdir -p logs uploads images skill
sudo chown -R "$(id -u):$(id -g)" logs uploads images skill
```

---

## Step 4 — Build (first time only, takes ~1 hour)

```bash
./run.sh build
```

Wait until you see `Image librechat Built`. It looks stuck after `npm run frontend` — that's normal, just wait.

---

## Step 5 — Start

```bash
./run.sh
```

Open **http://localhost:6041** in your browser.

---

## Daily commands

| What you want | Command |
|---|---|
| One-command first-time setup | `./setup.sh` |
| Start the app | `./run.sh` |
| Rebuild after code changes | `./run.sh build` |
| Restart without rebuilding | `./run.sh restart` |
| Stop containers | `./run.sh down` |
| Check status | `./run.sh status` |

---

## Deploy changes to the server (requires SSH access)

After you push your code:

```bash
ssh user@server
cd /root/better-ai-projects/hotshot-librechat
./deploy.sh
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No Staff login on the page | Image is old — run `./run.sh build` then `./run.sh` |
| Blank page or 404 errors | Hard refresh: **Ctrl+Shift+R** |
| Chat works but no Hotshot agent | Tunnel is down — run `./run.sh tunnel` |
| `EACCES` permission errors on logs | `sudo chown -R "$(id -u):$(id -g)" logs uploads images skill` |
| Docker permission denied | `sudo usermod -aG docker "$USER"` then log out/in |
| `bash: UID: readonly variable` | Don't prefix commands with `UID=...`, just use `./run.sh build` |

---

**Do not** run plain `docker compose up` (you'll get an empty local DB with no Hotshot data).  
**Do not** commit `.env` or `docker-compose.local.yml`.
