See CLAUDE.md.

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.

## Hotshot local development

**First-time (and daily) run:** follow **[LOCAL_DEV.md](./LOCAL_DEV.md)** only. Copy `.env` from the server, keep `PORT=6041`, set `DOMAIN_*` to `http://localhost:6041`, then `./run.sh`. Do not remap local to 3080. Do not use a plain `docker compose up` (empty local Mongo — no Hotshot Secret AI).

To push changes and update production: **[WORKFLOW.md](./WORKFLOW.md)** (`./deploy.sh` on the server).

Customer / staff / admin panel without restarting: **[VIEWS.md](./VIEWS.md)**.

Summary of Hotshot UI/workflow changes: **[CHANGES.md](./CHANGES.md)**.
