See CLAUDE.md.

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.

## Hotshot local development

**First-time setup:** **[LOCAL_DEV.md](./LOCAL_DEV.md)** — copy `.env`, keep port **6041**, **build the image once**, then `./run.sh`. Not a plain `docker compose up`.

To push changes and update production: **[WORKFLOW.md](./WORKFLOW.md)** (`./deploy.sh` on the server).

Customer / staff / admin panel without restarting: **[VIEWS.md](./VIEWS.md)**.

Summary of Hotshot UI/workflow changes: **[CHANGES.md](./CHANGES.md)**. Dated log of every change and deploy: **[CHANGELOG.md](./CHANGELOG.md)**.

Adversarial scenarios for testing the live agent, and the last results: **[STRESS_TESTS.md](./STRESS_TESTS.md)**. Read its first section before running any — test chats must be Temporary, or they poison the automatic prompt-improvement evidence.

## Changelog (required)

Every change and every production deploy gets an entry in **[CHANGELOG.md](./CHANGELOG.md)**, in the same commit as the change (or straight after the deploy):

- Add it under today's date (`## YYYY-MM-DD`, newest first), creating the date if it isn't there.
- Put each item under **Added**, **Changed**, **Fixed** or **Config** (changes made outside the code: agent instructions in the staff UI, server `.env`, settings). Write one plain sentence per item about what a user or staff member will notice, and end it with the commit hash.
- A commit can't name its own hash, so write the entry in the change's commit and fill in the hash in the next commit (usually the one that records the deploy). Never amend just to add the hash: amending changes it.
- After a deploy, update **Deployed** for that date with the commit now live.
- Changes to the tool server go in `hotshot-ai-mcp-server/CHANGELOG.md` instead.
