# TextPlex Stripe Integration Plan

Last reviewed: 2026-08-08.

This plan describes how TextPlex can add Stripe for theme purchases while keeping
Supabase authentication and server-side theme ownership authoritative.

## Current state

TextPlex already has most of the provider-neutral commerce foundation:

- server-owned theme and bundle catalog metadata
- authenticated `POST /themes/checkout`
- account-scoped checkout sessions
- idempotency keys
- signed sandbox webhook handling
- duplicate-event protection
- theme grants and refund revocation
- authenticated entitlement reads
- sandbox commerce tests

The existing sandbox implementation is in `apps/api/app/services/commerce.py`.
Focused coverage is in `tests/api/test_phase6_boundaries.py`.

Stripe should replace the sandbox payment provider behind this boundary. It should
not become the source of truth for which themes a TextPlex account owns.

## Initial product scope

The first Stripe release should support:

- one-time purchases for individual paid themes
- one-time purchases for paid theme bundles
- free themes without checkout
- test-mode purchases before any live payment activation

Subscriptions should remain a separate future scope. The theme shop should use
Stripe Checkout in `payment` mode first.

Before implementation, finalize each catalog product's:

- stable TextPlex product ID
- price and currency
- included theme IDs
- refund behavior
- test-mode Stripe Price ID
- live-mode Stripe Price ID

The browser must never provide or control the price.

## Ownership flow

```text
Supabase login
    -> authenticated POST /themes/checkout
    -> API validates user, product, and server price
    -> Stripe Checkout Session
    -> verified Stripe webhook
    -> server grants theme_entitlements to that Supabase user
    -> authenticated catalog reads return is_owned: true
```

The successful browser redirect is only a user-experience signal. It must not
grant ownership. Ownership is granted only after the API verifies the Stripe
webhook and fulfills the server-side product.

## Required application work

### Theme-shop UI

The current shop previews themes and displays ownership states. It needs a complete
purchase experience:

- `Buy` action for an unowned paid theme
- `Buy bundle` action for an unowned bundle
- sign-in prompt when a visitor is not authenticated
- loading, unavailable, and checkout-error states
- redirect to the Stripe Checkout URL
- pending-payment state after returning from Checkout
- catalog refresh after webhook fulfillment
- `Owned` state after the entitlement is visible from the API
- `Included` state for free themes

The UI should not unlock a theme from local storage, a query-string flag, or a
successful redirect alone.

### Checkout API

Keep the existing route and replace its sandbox implementation:

```text
POST /themes/checkout
```

Request body:

```json
{
  "product_type": "theme",
  "product_id": "jade",
  "idempotency_key": "account-and-attempt-specific-key"
}
```

The API must:

1. Validate the Supabase bearer token.
2. Confirm that the product exists and is not free.
3. Read the price and included themes from the server catalog.
4. Create a Stripe Checkout Session using the server-side product data.
5. Attach the authenticated user and product metadata.
6. Persist the pending session before returning.
7. Return the Stripe Checkout URL and internal session ID.

Suggested Stripe metadata:

```text
supabase_user_id
textplex_checkout_session_id
product_type
product_id
```

### Stripe webhook

Add a provider-specific route:

```text
POST /themes/webhooks/stripe
```

The webhook handler must:

1. Read the raw request body.
2. Verify the `Stripe-Signature` header with the webhook secret.
3. Ignore already-recorded Stripe event IDs.
4. Retrieve and validate the Checkout Session when necessary.
5. Confirm the product, amount, currency, and user metadata against TextPlex records.
6. Fulfill the exact theme IDs attached to the server-side product.
7. Record the event and payment status transactionally.
8. Revoke grants when a supported refund event is received.

The first implementation should handle successful card Checkout and refunds. If
delayed payment methods are enabled later, also handle their asynchronous success
and failure events.

Stripe's fulfillment guidance uses webhooks rather than relying on the success
redirect: [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment).

### Hosted entitlement storage

The hosted `theme_entitlements` table already supports user-scoped reads. Stripe
webhook fulfillment needs a trusted server-side write path.

Use one of these approaches:

- a server-only Supabase service key used only by the API webhook handler
- a protected Supabase database function/RPC that performs fulfillment

The service key must never be exposed to the Next.js browser bundle.

Hosted commerce records should retain:

- TextPlex checkout session ID
- Stripe Checkout Session ID
- Supabase user ID
- product and granted theme IDs
- amount and currency
- Stripe customer/payment identifiers when available
- payment and refund status
- Stripe event IDs for replay protection

## Environment separation

Proposed server-only configuration:

```text
TEXTPLEX_COMMERCE_PROVIDER=stripe_test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=...
```

Test and live Stripe keys must be separate. Stripe secrets belong only in API
environment configuration or a deployment secret manager. They must not be placed
in `.env.example`, browser code, or committed fixtures.

## No-money test procedure

Stripe test mode and sandboxes simulate transactions without moving real funds.
Stripe provides fake payment methods such as `4242 4242 4242 4242` for successful
card flows: [Stripe testing](https://docs.stripe.com/testing?numbers-or-method-or-token=tokens).

### Local end-to-end test

1. Create or select a Stripe test/sandbox environment.
2. Configure the API with test-only keys.
3. Start the API on the owned development port.
4. Authenticate the Stripe CLI:

   ```powershell
   stripe login
   ```

5. Forward Stripe events to the local API:

   ```powershell
   stripe listen --forward-to http://127.0.0.1:8201/themes/webhooks/stripe
   ```

6. Sign in to TextPlex with Supabase test account A.
7. Buy a paid theme using the Stripe test card.
8. Confirm the webhook completes successfully.
9. Confirm `/themes/catalog` returns `is_owned: true` for account A.
10. Confirm `/themes/entitlements` includes the purchased theme.
11. Sign in as Supabase test account B and confirm the theme is not owned.
12. Replay the webhook and confirm no duplicate grant is created.
13. Issue a Stripe test refund and confirm the entitlement is revoked.

Stripe CLI can forward sandbox events to a local endpoint:
[Stripe CLI](https://docs.stripe.com/stripe-cli/use-cli).

The generic `stripe trigger checkout.session.completed` command is useful for
webhook plumbing, but a real test Checkout Session is required for end-to-end
ownership testing because TextPlex must verify its own user and product metadata.

## Automated test coverage

Add or preserve tests for:

- unauthenticated checkout returns `401`
- free products cannot create checkout sessions
- unknown products are rejected
- client-supplied prices are ignored
- checkout creation is idempotent per account and key
- Stripe webhook signatures are required
- invalid signatures are rejected
- successful events grant only the intended user's themes
- repeated events do not duplicate grants
- mismatched product, amount, currency, or user metadata is rejected
- refunds revoke the correct grants
- one account cannot read another account's entitlements
- local storage cannot manufacture ownership
- test and live provider configuration remain separated

## Launch gate

Do not enable live Stripe keys until all of the following are complete:

- catalog products and prices are final
- the purchase UI has loading, error, pending, and owned states
- hosted entitlement writes are server-authoritative
- webhook signature verification is covered by tests
- duplicate events and refunds are tested
- authenticated cross-account ownership tests pass
- Stripe test-mode end-to-end checkout succeeds
- payment, refund, tax, and support policies are documented
- production HTTPS, secrets, backups, logs, and alerting are verified

The initial production release should enable only the minimum payment methods
needed for theme purchases and expand payment options after the webhook and refund
lifecycle is stable.
