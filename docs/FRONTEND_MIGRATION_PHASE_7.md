# Frontend Migration Phase 7

Status: In progress
Parent: Frontend consolidation issue
Depends on: [Phase 6](FRONTEND_MIGRATION_PHASE_6.md)

## Scope

Phase 7 is the final production-readiness and cutover phase. It turns the verified Next/API topology into the supported deployment, proves recovery and security boundaries, and retires the standalone shell as a product dependency while preserving a controlled rollback path.

## Current Slice

- [x] Add API readiness checks for book and user storage.
- [x] Add Next security headers and disable framework fingerprinting.
- [x] Make Compose environment and CORS configuration overridable instead of hardcoded to development values.
- [x] Document deploy, rollback, backup/restore, readiness, and incident procedures.
- [x] Add structured API request logs, bounded mutation rate limiting, production configuration readiness checks, and disposable backup/restore verification.
- [x] Add CI container smoke coverage for canonical and compatibility routes.
- [ ] Run clean-clone and deployment-owned verification.
- [ ] Complete production backup/restore and rollback drills.
- [ ] Set the legacy deprecation window and complete final cutover audit.

## Workstreams

### Production hardening

- Run clean-clone builds and tests with declared Node, Python, and database dependencies.
- Verify production CORS/CSP, HTTPS, auth callbacks, rate limits, upload/resource limits, secret handling, and protected mutations.
- Add structured logs, health/readiness checks, error reporting, backups, restore drills, and operational runbooks.
- Verify migrations, cache invalidation, entitlement reconciliation, and rollback behavior under failure.
- Establish deployment checks, environment configuration checks, and post-deploy smoke tests.

### Canonical cutover

- Make the Next app the supported browser entry point for local and hosted use.
- Keep `/legacy` and GitHub Pages available only as explicitly labeled compatibility surfaces during the deprecation window.
- Confirm import, reader, progress, profile, settings, themes, and analysis flows against live account and book data.
- Announce the legacy deprecation date only after rollback, backup, and monitoring evidence is recorded.
- Run the final migration audit and close the parent migration issue only when all required evidence is green.

## Exit Criteria

1. Clean-environment build, lint, API/processor, site, contract, migration, sync, and commerce checks pass.
2. Authenticated multi-user isolation, private-book access, payment lifecycle, and rollback tests pass.
3. Production deployment has documented secrets, configuration, monitoring, backups, restore evidence, and incident procedures.
4. The canonical Next/API topology is reachable in a deployment-owned environment, not only from an existing local process.
5. Legacy use is explicitly labeled, non-canonical, and removable without data migration or learner-state loss.
6. The final audit records baseline, evidence, warnings, residual limitations, issue mappings, and the next review trigger.

## Rollback

Rollback must restore the previous supported browser surface without deleting book data, hosted learner state, local caches, or entitlement records. The rollback command and owner must be documented before the legacy deprecation window closes.
