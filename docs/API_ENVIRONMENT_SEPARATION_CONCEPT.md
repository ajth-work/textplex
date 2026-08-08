# API Environment Separation Concept

## Purpose

TextPlex should maintain two separately deployed API environments:

- **Production API:** the stable user-facing service. It should remain available as much as possible and only be restarted or replaced during planned maintenance.
- **Preview API:** an isolated environment for testing new API code, processing behavior, migrations, configuration, and reboot procedures at any time.

The environments should run the same application codebase but use separate deployments, configuration, credentials, and writable data. This is an environment boundary, not a second API implementation.

## Why this is useful

The API performs more than request/response work. It imports books, starts background extraction, writes book registries and page artifacts, maintains SQLite learner profiles, records translation usage, and handles authenticated mutations. A preview service that shares production storage could therefore alter or corrupt live state.

Separating the environments makes it possible to:

1. Test a release without interrupting the live API.
2. Reboot the preview API whenever needed.
3. Validate readiness, migrations, imports, and background extraction before release.
4. Keep production on a known-good image during development.
5. Promote the exact tested build during a scheduled maintenance interval.
6. Roll back to the previous production build if post-release checks fail.

## Proposed topology

```text
                         stable public API address
                                  |
                           production routing
                                  |
                         production API container
                                  |
                    production books and user volumes

preview API address  --->  preview API container
                           preview books and user volumes
                           preview credentials and limits
```

The first implementation can use separate host ports. For example:

| Environment | API container | Host/API address | Intended use |
|---|---:|---|---|
| Production | `8000` | `8201` or a stable public hostname | Live users and data |
| Preview | `8000` | `8202` or a preview hostname | Release testing and development |

A reverse proxy should eventually provide one stable public production address and route traffic to the selected API container. That makes promotion a routing change instead of a longer outage caused by rebuilding the public endpoint in place.

## Storage and data boundaries

Preview and production must not share writable storage.

### Production

- Production book databases, page images, extraction artifacts, registries, uploads, and learner profile databases.
- Production authentication and service credentials.
- Production backup and restore schedule.

### Preview

- Separate preview book and user data directories.
- Disposable test books and test learner accounts.
- Preview authentication project or clearly marked test users where practical.
- Separate API keys, quotas, and spending limits where practical.

Preview data may be initialized from a sanitized or explicitly approved production snapshot, but it must never write back into production. Personal learner data, source books, OCR output, and private credentials should not be copied into preview unless the copy is intentional and protected.

The current local Compose setup mounts `./data` into the API container. That setup is suitable for local/preview work, but a production deployment must use a separately managed production data root or named volumes rather than the same working-tree directory.

## Release and promotion flow

### 1. Build

Build an immutable API image from a specific Git commit. Tag it with the commit or release identifier.

### 2. Deploy to preview

Start the preview API with preview configuration and isolated volumes. Rebooting or rebuilding this service should have no effect on production.

### 3. Verify

Run, at minimum:

- API and processor tests.
- Ruff and contract checks.
- `/health` for process health.
- `/ready` for storage and production-configuration readiness.
- Representative book, page, reader, learning, and authenticated routes.
- A disposable import and extraction workflow.
- Migration checks against a copy of the expected data shape.

### 4. Approve the release

Record the image tag, Git commit, migration status, test results, and known limitations. Only the tested image should be eligible for production.

### 5. Promote during maintenance

During the scheduled maintenance interval:

1. Create or verify a current production backup.
2. Put production into a controlled maintenance state if required.
3. Apply backward-compatible migrations.
4. Deploy the already-tested image.
5. Run production readiness and smoke checks.
6. Route traffic to the new production container, or restart the production service if no proxy is present.
7. Monitor logs and error rates.

The promotion should move the tested application build, not preview's mutable data.

## Rollback

Keep the previous production image available until the new release has passed its observation period. A rollback should consist of:

1. Stop or detach the failed production release.
2. Restore the previous image or routing target.
3. Restore data only when a migration or write operation requires it; do not automatically restore data for an application-only failure.
4. Record the failure and preserve logs for diagnosis.

Schema changes should be designed so the previous application version can continue to operate during a rollback whenever possible. Destructive or irreversible migrations require an explicit backup and rollback plan before promotion.

## Configuration requirements

The two environments should have explicit values for:

- `APP_ENV`.
- `BOOK_DATA_DIR` and `USER_DATA_DIR`.
- CORS origins.
- Authentication and Supabase settings.
- AI and translation provider credentials.
- Upload, page-count, rate-limit, and resource limits.
- Public API URL consumed by the web application.

Production readiness must fail closed when production configuration is incomplete. Preview may use relaxed development settings, but it should still exercise the production-like settings before a release is promoted.

## Relationship to the web application

The web application should also distinguish its production and preview API URLs:

- Production web build -> production API.
- Preview web build or local development -> preview API.

Because the browser API URL is currently a build-time setting, a release process must rebuild or configure the web application with the correct target. The web preview should not accidentally point at production for write operations.

## Recommended implementation sequence

1. Keep the existing Docker Compose stack as the local/preview stack.
2. Add a production Compose or deployment definition with explicit production volumes and `APP_ENV=production`.
3. Add a preview API host port or hostname separate from production.
4. Add image tagging by Git commit.
5. Add a documented preview-to-production promotion checklist.
6. Add backup, restore, and rollback drills.
7. Add a reverse proxy or equivalent stable routing layer when production needs low-downtime promotion.

## Non-goals

This concept does not propose:

- Maintaining two divergent API codebases.
- Sharing writable book or learner data between environments.
- Promoting preview-created learner activity into production.
- Treating a successful local preview run as proof that external production services, backups, monitoring, HTTPS, or authentication callbacks are ready.

## Decision

Adopt a production/preview API split as the target deployment model. Use the current Docker-backed API as the foundation for preview, and build production around immutable images, isolated persistent data, explicit configuration, scheduled promotion, and a tested rollback path.
