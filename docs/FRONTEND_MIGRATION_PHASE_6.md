# Frontend Migration Phase 6

Status: Complete
Parent: Frontend consolidation issue
Depends on: [Phase 5](FRONTEND_MIGRATION_PHASE_5.md)

## Scope

Phase 6 completes the two product boundaries intentionally deferred from Phase 5: hosted learner-state synchronization and a provider-neutral sandbox theme-store lifecycle. The local-first reader remains usable offline, while hosted accounts become the durable source for cross-device learner history and paid theme ownership. Real payment-provider activation remains a Phase 7 operations gate.

## Workstreams

### Hosted learner state

- Define hosted event contracts for sessions, reads, exposures, vocabulary progress, settings, and profile metrics.
- Add authenticated persistence and reads without moving book truth into learner tables.
- Queue offline events locally, replay them idempotently, and reconcile conflicts deterministically.
- Add account-scoped book/page access rules for private imported content.
- Keep local caches disposable and unable to grant access or fabricate progress permanently.

### Theme-store fulfillment

- Define a provider-neutral sandbox checkout boundary with catalog-owned prices and idempotency keys.
- Verify signed sandbox payment webhooks, fulfill purchases exactly once, and replay duplicate events safely.
- Handle sandbox refunds and entitlement revocation; leave provider-specific disputes, tax, PCI, and operations to Phase 7.
- Synchronize server-owned sandbox entitlements to the local app for safe offline previews and use.

## Exit Criteria

1. An authenticated learner can read on one device and see the same learner state on another after synchronization.
2. Offline learner events replay safely and duplicate or conflicting events have documented outcomes.
3. Private books and learner data are isolated by account in API, storage, and tests.
4. Checkout, webhook fulfillment, refunds, and revocation are server-authoritative and repeatable in a disposable test environment.
5. Paid themes cannot be unlocked by browser state, local storage, or a forged redirect.
6. API, database/RLS, processor, web, sync, and sandbox-commerce tests pass in a clean environment.

## Current Slice

- [x] Add a local learning-event outbox and receipt ledger to account-scoped profile databases.
- [x] Replicate reading sessions, page reads, and sentence/token exposures to an RLS-protected Supabase event table with idempotent keys.
- [x] Hydrate remote events into another local account cache without duplicating already-applied local events.
- [x] Add an authenticated `/learning/sync` API endpoint and a best-effort reader sync trigger.
- [x] Add API coverage for upload idempotency, remote hydration, and receipt isolation.
- [x] Add offline retry scheduling and conflict/reconciliation reporting in the client.
- [x] Add private book/page ownership enforcement and sandbox commerce fulfillment.
- [x] Add signed webhook replay protection, refund revocation, local entitlement reads, and hosted commerce schema/RLS scaffolding.

## Non-goals

- Replacing the local-first reader with a permanently online-only experience.
- Storing source books, OCR output, or book-derived truth in the learner profile database.
- Launching real payments before Phase 7 production security and operations gates pass.
