# TextPlex Operations Runbook

This is the Phase 7 operational baseline for the canonical Next/API topology. It is not evidence of a completed production deployment.

## Services

- Next application: `3000`
- API: `8201`
- Legacy compatibility shell: `8200`, only with the `legacy` Compose profile
- API liveness: `GET /health`
- API readiness: `GET /ready`

Operational changes should target the Next application on `3000`. Use `8200` only for explicit legacy comparison, rollback rehearsal, or GitHub Pages compatibility checks.

## Configuration

Production must provide `APP_ENV=production`, explicit `TEXTPLEX_CORS_ORIGINS`, `BOOK_DATA_DIR`, `USER_DATA_DIR`, Supabase credentials, and the sandbox or production commerce provider configuration. Do not commit `.env` or provider secrets.

The API must not be considered ready unless `/ready` returns `200` with both storage checks true. A `503` readiness response should stop traffic and trigger investigation without deleting data.

The API emits one JSON log event per request with a request ID, method, path, status, and duration. Mutation endpoints also have a bounded in-process limiter controlled by `TEXTPLEX_RATE_LIMIT_PER_MINUTE`; production deployments must enforce a distributed limit at the ingress or gateway as well.

## Deploy and rollback

1. Build the declared images: `docker compose --profile legacy build api web site`.
2. Recreate the canonical services: `docker compose up -d --force-recreate api web`.
3. Run smoke checks against `3000`, `8201/health`, `8201/ready`, and the protected mutation boundaries.
4. Keep the previous image tags available until post-deploy smoke checks pass.
5. Roll back by restoring the previous image tags and running `docker compose up -d api web`; do not delete `data/books`, `data/user`, or hosted records.

For a disposable local archive, run `npm run backup:data`. The command writes a tarball and a SHA-256 manifest under `artifacts/`; use `scripts/data-backup.mjs --mode restore --archive <archive> --target <empty-target> --confirm yes` only for a new or empty restore target.

The legacy shell is a compatibility rollback surface, not the canonical deployment. It may be started separately with `docker compose --profile legacy up -d site`.

## Backup and restore evidence

Back up `BOOK_DATA_DIR`, `USER_DATA_DIR`, the Supabase database, and the hosted entitlement/event tables before a production migration. Record the backup identifier, timestamp, retention, owner, and restore result.

Restore drills must use a disposable environment and verify:

- book registry, page assets, and extraction artifacts;
- account-scoped local learner databases;
- hosted learner events, theme entitlements, and commerce state;
- reader, profile, settings, and theme access after restoration.

No Phase 7 production cutover is complete until a named owner records a successful restore drill and rollback rehearsal.

## Incident handling

- `200 /health` and `503 /ready`: investigate storage mounts, permissions, and migration state before restarting.
- `401` on protected routes: verify Supabase configuration and token expiry; do not disable auth to recover service.
- Sync pending or commerce webhook failures: preserve local outbox/event data, inspect provider logs, and replay signed events through the controlled workflow.
- Never repair production by deleting SQLite files, book directories, hosted events, or entitlement rows.
