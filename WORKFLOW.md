# Hotshot workflow — local → push → server update

Simple rules for the whole team.

---

## Customer vs staff (edit agents)

**Do not toggle `PUBLIC_GUEST_MODE` and restart.** Keep it `true`.

See **[VIEWS.md](./VIEWS.md)**:

| View | URL |
|------|-----|
| Customer guest chat | `/` |
| Staff login — **see/edit agents** | `/login?staff=1` |

The separate Admin Panel (`:3000`) is **not** used for Hotshot agent editing.

---

## Two kinds of changes (important)

### A) Agent changes (prompt, tools, model in the UI)
These live in the **database on the server**.

Because your laptop already uses that same DB (`./run.sh`):

- Edit agent locally → **already live on the server**
- No `git push` / server pull needed for the agent itself

### B) Code / UI / config file changes
These live in **git** (React UI, API code, `librechat.yaml`, branding, etc.).

Flow:

```
Laptop: edit → commit → push → main
Server: ./deploy.sh
```

---

## Daily local work (laptop)

```bash
cd ~/better-ai-projects/hotshot-librechat
git checkout main
git pull
./run.sh
# open http://localhost:3080
```

Full local setup: **[LOCAL_DEV.md](./LOCAL_DEV.md)**

---

## Push your code/UI changes

```bash
cd ~/better-ai-projects/hotshot-librechat
git checkout main
git pull
# ... make file/UI changes ...
git add -A
git status
git commit -m "Describe your change"
git push origin main
```

(Or use a feature branch + PR into `main` — preferred for the team.)

---

## Update the server (after push)

SSH in and deploy:

```bash
ssh betterai-server
# or: ssh root@187.77.205.200

cd /root/better-ai-projects/hotshot-librechat
./deploy.sh
```

What `./deploy.sh` does:

1. `git checkout main` + `git pull`
2. Rebuild the `librechat` Docker image
3. Refresh guest `index.html` so UI assets match the new build
4. Restart containers
5. Wait until http://127.0.0.1:6041 answers

Other commands:

```bash
./deploy.sh status    # git commit + containers
./deploy.sh pull      # only git pull (no rebuild)
./deploy.sh restart   # restart containers only
```

Live site: https://hotshotai.thebetterai.com

---

## Branch rule

| Place | Branch |
|-------|--------|
| Laptop | `main` |
| Server | `main` |
| Old `live` branch | stop using for deploys |

One branch → less confusion.

---

## Quick cheat sheet

| I changed… | What I do |
|------------|-----------|
| Agent in the chat UI | Nothing else — already on live DB |
| `librechat.yaml` | `git push` then server `./deploy.sh` (or `./deploy.sh pull` + restart if only yaml) |
| UI / React / API code | `git push` then server `./deploy.sh` |
| `.env` secrets | Edit on server (and laptop) by hand — **never commit** |

---

## Do not

- Do not put `docker-compose.local.yml` on the server (that file is for laptop → live Mongo tunnel only)
- Do not commit `.env`
- Do not expect `git pull` alone to update UI code — you need `./deploy.sh` (rebuild)
