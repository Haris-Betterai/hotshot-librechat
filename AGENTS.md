See CLAUDE.md.

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.

## Hotshot local development

**First-time setup:** **[LOCAL_DEV.md](./LOCAL_DEV.md)** — copy `.env`, keep port **6041**, **build the image once**, then `./run.sh`. Not a plain `docker compose up`.

To push changes and update production: **[WORKFLOW.md](./WORKFLOW.md)** (`./deploy.sh` on the server).

Customer / staff / admin panel without restarting: **[VIEWS.md](./VIEWS.md)**.

Summary of Hotshot UI/workflow changes: **[CHANGES.md](./CHANGES.md)**.

Adversarial scenarios for testing the live agent, and the last results: **[STRESS_TESTS.md](./STRESS_TESTS.md)**. Read its first section before running any — test chats must be Temporary, or they poison the automatic prompt-improvement evidence.
