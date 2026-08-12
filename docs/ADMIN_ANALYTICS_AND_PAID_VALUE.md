---
title: Admin Analytics and Paid-Value Signals
status: Proposed
issue: 97
board_status: In Progress
date: 2026-08-10
---

# Admin Analytics and Paid-Value Signals

## Verbatim product direction

You’re right: the current admin console shows activity, but not whether activity is creating enough value for someone to pay.

The key is to measure the path from “first useful result” to “I want more of this.”

For TextPlex, I’d track these stages:

1. Activation
   Did the user import a book, read a meaningful amount, and use a learning feature?

2. Value moment
   Did they translate a difficult sentence, review vocabulary, generate practice, or return to a saved reading session?

3. Repeated value
   Did they use that feature again on another day? Repeated usage is more meaningful than one-time clicks.

4. Paywall intent
   Did they encounter a paid feature, click “unlock,” view pricing, start a trial, or ask for access?

5. Conversion
   Once payments exist: trial started → paid → retained after 30 days.

Useful early indicators could be:

- First session completed
- First book imported
- Sentences translated per active day
- AI feature usage per user
- Percentage of users returning within 7 days
- Number of users who hit an AI limit
- Paywall views and unlock clicks
- Users who use the same AI feature on multiple days

There probably won’t be one magic threshold like “50 translations means they will pay.” The signal is more likely a combination such as:

> A user reads on multiple days, repeatedly uses one AI feature, reaches a limit, and actively tries to continue.

That is the behavior to investigate.

The admin console should eventually add:

- Activation funnel
- Feature usage by user and cohort
- AI/paywall demand
- 7-day and 30-day retention
- “Users approaching conversion” list
- Tester versus non-tester separation
- Qualitative feedback alongside behavior

With only you and a few testers, treat the data as directional rather than statistically conclusive. Pair the analytics with direct questions like: “Which feature would you be disappointed to lose?” and “What would make TextPlex worth paying for monthly?”

The next practical step is to instrument the product around a small set of events, such as `book_imported`, `reading_session_completed`, `translation_used`, `practice_generated`, `paywall_seen`, and `unlock_clicked`. Then the admin console can show the actual path toward paid value instead of only total usage.

## Technical considerations

### 1. Define one event contract

Add a server-owned analytics event contract rather than deriving everything from UI clicks after the fact. Each event should contain:

- `event_id`
- `event_name`
- `occurred_at`
- authenticated `account_id` when available
- local `profile_id` or tester identifier when needed for the local-first path
- `session_id`
- route and feature key
- experiment and variant keys when an experiment is active
- small, typed metadata such as language, book type, limit name, or result state
- app version/schema version

Do not put source-book text, learner responses, translations, passwords, payment details, or provider secrets in the event payload.

### 2. Instrument meaningful product boundaries

The first event set should be small and emitted from API/domain actions so the numbers represent completed behavior:

| Area | Events |
| --- | --- |
| Activation | `account_created`, `book_imported`, `first_book_ready`, `reading_session_started`, `reading_session_completed` |
| Learning value | `sentence_read`, `translation_used`, `definition_opened`, `vocabulary_saved`, `practice_generated` |
| AI demand | `ai_feature_used`, `ai_limit_reached`, `paywall_seen`, `unlock_clicked`, `pricing_viewed` |
| Commerce | `trial_started`, `checkout_started`, `subscription_activated`, `subscription_canceled` |
| Feedback | `feedback_submitted`, `feature_requested`, `paywall_feedback_submitted` |

Events should be idempotent where possible. A retry must not double-count a completed import, checkout, or subscription transition.

### 3. Choose storage that fits the current and future architecture

The current `/admin/usage` endpoint scans local profile/book data and already returns daily activity plus Google Translate usage. That is useful for the current tester phase, but it will not scale into cross-account conversion analytics.

For the immediate local/tester phase:

- add an `analytics_events.sqlite3` database under the configured user-data root;
- keep the event table append-only with indexes on account, event name, and timestamp;
- aggregate into daily and cohort summaries in the API;
- keep tester identities pseudonymous in the admin view.

For the hosted account phase associated with issue #43:

- move the shared event stream to account-scoped Supabase/Postgres storage;
- enforce server-side ownership and admin-only aggregate access;
- retain only the minimum event metadata needed for product decisions;
- document retention, deletion, and consent behavior before collecting sensitive AI interactions.

The local SQLite implementation should use the same shared contract and service interface as the future hosted implementation so the admin console does not need a second analytics model.

### 4. Add protected analytics API surfaces

The existing `usage.global.read` permission should protect the first version. Likely API surfaces are:

- `GET /admin/analytics/overview` — activation, active users, repeated-value indicators, and current AI demand;
- `GET /admin/analytics/funnel` — user counts and rates between activation, value, paywall intent, and conversion stages;
- `GET /admin/analytics/features` — feature usage by day, cohort, language, and tester status;
- `GET /admin/analytics/retention` — 1-day, 7-day, and 30-day return cohorts;
- `GET /admin/analytics/users` — a privacy-safe list of pseudonymous users approaching a conversion signal;
- `GET /admin/analytics/feedback` — joins behavior signals to submitted feedback without exposing unnecessary content.

Every response should include its date range, cohort definition, sample size, and an explanatory note when the sample is too small to interpret confidently.

### 5. Turn the console into a decision surface

The first useful admin-console expansion would be:

1. **Activation funnel** — account created → book ready → first session → first learning action.
2. **Value signals** — repeat users, repeat AI users, and users returning on multiple days.
3. **AI/paywall demand** — limit hits, paywall views, unlock clicks, and requested features.
4. **Retention** — cohorts returning after 1, 7, and 30 days.
5. **Conversion watchlist** — pseudonymous users who show repeated value plus paywall intent.
6. **Feedback correlation** — the feature request or frustration attached to those behaviors.

The existing `admin.activity-card` remains the daily trend card. The first local implementation now includes `admin.analytics-funnel-card`, `admin.analytics-value-card`, `admin.analytics-paywall-card`, `admin.analytics-feature-card`, `admin.analytics-retention-card`, and `admin.analytics-user-watchlist`; hosted billing and larger-scale experimentation remain future work.

### 6. Use rules that are honest about a tiny sample

The console should show counts and rates, but it should not imply statistical certainty with only a few testers. Add these safeguards:

- display `n` beside every conversion or retention rate;
- suppress or label rates for cohorts below a small minimum, such as five accounts;
- distinguish testers, admins, and normal learners;
- separate event volume from unique-user counts;
- show the date range and timezone used for every chart;
- avoid ranking users by a hidden “likelihood to pay” score until there is enough paid outcome data to validate it;
- pair behavioral signals with direct feedback and interview notes.

### Recommended implementation order

1. Define the shared event names and metadata allowlist.
2. Add local append-only event storage and server-side emitters.
3. Instrument activation, reading, translation, practice, paywall, and feedback boundaries.
4. Add overview, funnel, feature, and retention API contracts with focused tests.
5. Add the protected admin cards and cohort table.
6. Add a paywall or trial experiment and connect its outcomes to the same event stream.
7. Migrate the storage adapter to hosted Postgres when cross-device accounts and real billing are ready.
