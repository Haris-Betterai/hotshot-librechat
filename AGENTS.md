See CLAUDE.md.

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.

## Hotshot local development

To run this project locally against the **live** MongoDB (required to see Hotshot Secret AI), follow **[LOCAL_DEV.md](./LOCAL_DEV.md)**. Use `./run.sh` — do not rely on a plain `docker compose up` with the empty local Mongo container.

To push changes and update production: **[WORKFLOW.md](./WORKFLOW.md)** (`./deploy.sh` on the server).

Customer / staff / admin panel without restarting: **[VIEWS.md](./VIEWS.md)**.

Summary of Hotshot UI/workflow changes: **[CHANGES.md](./CHANGES.md)**.
