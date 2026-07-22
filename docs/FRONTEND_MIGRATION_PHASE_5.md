# Frontend Migration Phase 5

Status: In progress
Started: 2026-07-22
Parent: Frontend consolidation issue
Depends on: [Phase 4](FRONTEND_MIGRATION_PHASE_4.md)

## Scope

Phase 5 moves TextPlex from a working canonical local product to an account-owned product. Supabase Auth is the identity boundary; the FastAPI service remains the application API; book truth remains in book storage; learner truth becomes user-scoped rather than anonymous process-local state.

This phase also turns the existing theme-shop prototype into a safe catalog and entitlement boundary. The browser may preview themes, but the API/database must own availability, price, purchase state, and granted themes.

## Kickoff Slice

- [x] Close Phase 4 and preserve the explicit legacy rollback path.
- [x] Confirm the existing Supabase Auth provider, callback route, profile migration, and user-settings RLS foundation.
- [x] Define the authenticated API request contract and add a read-only hosted profile endpoint with server-side ownership filtering.
- [x] Add a user-scoped hosted profile/settings read path that hydrates the Next profile surface when a Supabase session exists.
- [ ] Protect learner-state mutations and reject missing, expired, malformed, or mismatched identity tokens.
- [ ] Move the full Next profile and settings surfaces from local state to hosted state when configured.
- [ ] Define export/import and migration rules for the anonymous local profile without overwriting hosted learner state.
- [ ] Define the theme catalog and entitlement contract before adding checkout or payment-provider code.
- [x] Add a baseline auth/RLS contract test before enabling hosted persistence by default.
- [ ] Add focused ownership, migration, and entitlement tests before enabling hosted persistence by default.

## Workstreams

### Identity and API boundary

- Pass the Supabase access token from the Next client to the API through an explicit bearer-token contract.
- Validate issuer, audience, expiry, and subject server-side; never trust a browser-provided user ID.
- Classify every read and mutation as public, local-only, authenticated, or admin-owned before changing route behavior.

### Learner-state ownership

- Keep source books, extraction artifacts, and lexicon evidence in book storage.
- Keep sessions, reads, exposures, vocabulary state, settings, and profile metrics under the authenticated learner identity.
- Provide a deliberate local-profile migration path with preview, conflict policy, and an idempotent completion marker.

### Theme entitlements

- Store theme and pack catalog metadata server-side.
- Treat client prices and client-owned theme flags as display hints only.
- Keep preview themes available without purchase while restricting durable profile entitlements to verified server results.

## Exit Criteria

Phase 5 is complete when:

1. A signed-in user can load and update only their own hosted profile and settings.
2. Learner-state API mutations reject missing, expired, malformed, or mismatched identity tokens.
3. Local anonymous profile data can be previewed, migrated idempotently, and reconciled without overwriting newer hosted state.
4. Book truth and learner truth remain separate in storage, contracts, and tests.
5. Theme catalog, pack pricing, and entitlement decisions are server-authoritative and do not expose payment secrets.
6. Signed-out, configured-auth, unconfigured-auth, loading, error, and migration-in-progress states are explicit in Next.
7. Auth, RLS/ownership, API, migration, and web contract tests pass in clean environments.

## First Implementation Target

Start with the authenticated API request contract and a read-only hosted profile hydration path. Do not add checkout, payment-provider integration, or destructive local-data migration until token validation and ownership tests are green.

### Phase 5 kickoff implementation

The first slice exposes `GET /profile/hosted`. It validates the Supabase bearer token through `/auth/v1/user`, queries `profiles` and `user_settings` with the authenticated subject as the ownership filter, and returns no local learner metrics. The Next profile surface displays this hosted identity read path only when a Supabase session is present; the existing local `/profile` request remains the source for local reading history and metrics.

## Non-goals

- Replacing Supabase Auth with a custom password system.
- Moving source books or OCR artifacts into the learner profile database.
- Enabling production checkout before catalog and entitlement contracts are tested.
- Removing local-first reading support while hosted accounts are being introduced.
