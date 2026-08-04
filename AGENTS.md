See CLAUDE.md.

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.

## Cursor Cloud specific instructions

Standard commands live in CLAUDE.md (`## Development Commands` / `## Testing`) and root `package.json`. The notes below are only the non-obvious cloud-environment caveats.

### Toolchain
- Node `24.16.0` is installed via `nvm` and set as the `nvm` default, so login/tmux shells (which source `~/.bashrc`) automatically use it. The base VM also has an older Node on `PATH` at `/exec-daemon/node` (currently v22) that shadows nvm in non-login/non-interactive shells; if `node --version` is not `v24.16.0`, run commands from a login shell (`bash -lc '…'`) or prepend `"$HOME/.nvm/versions/node/v24.16.0/bin"` to `PATH`. Match the running app's Node version when reinstalling deps so native modules use the right ABI.

### Services (all started manually — there is no systemd/Docker here)
- MongoDB (required): the `mongodb-org` 8.0 server is installed. Start it with `mongod --dbpath /home/ubuntu/data/db --bind_ip 127.0.0.1 --port 27017 --logpath /home/ubuntu/data/log/mongod.log --fork`. The default `MONGO_URI` in `.env` (`mongodb://127.0.0.1:27017/LibreChat`) matches this.
- Backend API: `npm run backend:dev` (nodemon, port 3080).
- Frontend: `npm run frontend:dev` (Vite HMR, port 3090; proxies `/api` and `/oauth` to 3080). Open the app at `http://localhost:3090`. The backend at `http://localhost:3080` also serves the built client.
- `.env` is required and gitignored; create it once with `cp .env.example .env`. The example ships with working dev defaults (JWT/CREDS secrets, Mongo URI), so no edits are needed to boot.

### Non-obvious gotchas
- The backend refuses to boot until `client/dist/index.html` exists (it reads it at startup, even in dev). Build the client at least once with `npm run build:client` (and the shared packages with `npm run build:packages`) before `npm run backend:dev`. `npm run smart-reinstall` does deps + all builds in one cached step.
- Shared workspace packages resolve through `packages/*/dist`, so `npm ci` (which wipes `node_modules`) is safe and keeps prior builds — but after pulling source changes under `packages/*` or `client/`, rebuild (`npm run build:packages` / `npm run build:client`) or the app runs stale code.
- `npm run lint` fails with "No files matching the pattern" because npm runs scripts under `/bin/sh`, which cannot expand the script's `!(node_modules|venv)` extglob. Run lint via bash with extglob instead, e.g. `bash -O extglob -O globstar -O nullglob -c './node_modules/.bin/eslint {,!(node_modules|venv)/**/}*.{js,jsx,ts,tsx}'` (or lint a specific path). The repo currently has pre-existing lint errors/warnings unrelated to setup.
- Optional services (MeiliSearch, RAG API + pgvector, Redis) are not running. The startup `[indexSync] error fetch failed` and the `RAG API ... not reachable` warning are harmless without them; conversation search and file/RAG features are degraded.
- No LLM provider keys are set (all `*_API_KEY=user_provided`), so sending a chat returns a "Missing API Key" error from the model — expected. Auth, persistence, and the request/response cycle still work end to end.
