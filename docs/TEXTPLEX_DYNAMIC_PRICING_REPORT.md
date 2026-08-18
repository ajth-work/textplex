---
title: TextPlex Dynamic Pricing and Expansion Revenue Report
status: Proposed
date: 2026-08-15
related_issues: "#73, #97"
---

# TextPlex Dynamic Pricing and Expansion Revenue Report

## Executive recommendation

TextPlex should move toward a hybrid pricing model: keep the essential reading
loop free, charge recurring plans for higher-volume cloud assistance and
advanced practice, and retain one-time purchases for themes and selected
content. The usage dimension should be tied to costly, high-value assistance
such as translation, AI explanations, generated practice, and priority
processing—not to pages read, books owned, or vocabulary exposure.

This approach applies the hyper-growth pricing principles in the supplied
framework without undermining TextPlex's product promise. Reading more is the
outcome TextPlex wants to create. It should not become the meter that makes the
product feel punitive.

The current `$0`, `$4.99`, and `$9.99` monthly concepts for Open Book, Deep Read,
and Immersion Studio are a useful packaging hypothesis, not yet validated
prices. The next step is to measure which capabilities create repeated value and
which cloud costs scale with that value before making the tiers permanent.

## TextPlex's current monetization starting point

TextPlex already has the beginnings of a multi-layer commercial model:

- **Open Book:** the landing page describes a free reading and library loop with
  import, exposure tracking, definitions, and limited translation.
- **Deep Read:** the current concept adds higher translation and AI allowances,
  saved progress, and review tools at `$4.99` per month.
- **Immersion Studio:** the current concept adds custom 30-sentence narratives,
  the highest fair-use allowance, and priority processing at `$9.99` per month.
- **Theme shop:** individual themes and bundles are modeled as server-catalogued
  one-time products, including `$1.99` individual themes and `$8.99` bundles.
- **Commerce foundation:** server-owned catalog pricing, account-scoped
  entitlements, idempotent checkout sessions, signed sandbox webhooks, and
  refund revocation exist. Live Stripe activation and subscriptions remain
  future scope in `docs/STRIPE_INTEGRATION_PLAN.md`.
- **Paid-value instrumentation:** `docs/ADMIN_ANALYTICS_AND_PAID_VALUE.md`
  already defines activation, repeated value, paywall intent, retention, and
  eventual conversion signals.

The strategic gap is not the absence of possible products. It is the absence of
a clear relationship between a learner's growing use of TextPlex, the marginal
cost of serving that use, and the next paid upgrade.

## Recommended pricing architecture

### 1. Keep the free tier generous around the core learning asset

Open Book should include the durable, differentiating habit loop:

- account and library access;
- reading imported or available content;
- local book processing where practical;
- definitions and basic token inspection;
- exposure and progress history;
- a small, clearly stated allowance of hosted translation or AI help.

Do not meter reading time, pages completed, saved vocabulary, or basic progress
history. Those are the product's proof of value and its retention engine. A free
learner who reads deeply is creating the strongest possible upgrade signal.

The free tier can still have fair-use protections for expensive operations. The
boundary should be explained as hosted assistance capacity, not as a restriction
on learning.

### 2. Make Deep Read the recurring expansion plan

Deep Read should be the default upgrade for a learner who has formed a habit and
wants more help inside real books. Its value proposition should be specific:

- a larger monthly allowance of translation and AI-assisted explanations;
- more generous processing or refresh capacity for imported material;
- richer review and learner-history tools;
- saved cross-device state and durable assistance history once hosted sync is
  fully operational;
- an in-product explanation of remaining allowance and the value already
  received.

The plan should expand with the learner's use through an included allowance and
optional, user-controlled top-ups or a higher plan—not through surprise
overage charges. This creates usage-aligned revenue while preserving trust.

### 3. Position Immersion Studio around creation, not merely more consumption

Immersion Studio should serve learners who repeatedly use TextPlex to create
new target-language material. The premium boundary can include:

- custom 30-sentence narratives;
- higher generation and processing capacity;
- more control over learner-window, level, genre, tone, and vocabulary balance;
- priority processing when the queue is busy;
- reusable generated-package history and completion analytics when those
  capabilities are production-ready.

This is a stronger premium proposition than simply selling “more pages.” The
learner pays to turn a known vocabulary gap or interest into appropriately
scaffolded reading material.

### 4. Keep one-time products as a second revenue lane

Themes are a good low-friction one-time purchase because they personalize a
long-term reading environment without withholding learning functionality.
Bundles can reward collection behavior, while free previews preserve discovery.

Later, the same commerce boundary could support:

- curated reading packs;
- creator-published stories or language programs;
- paid human-reviewed translations or annotations;
- institution or classroom products.

These products should remain additive. They should not be required to access a
learner's own books or learner-state history.

## Choosing the right usage metric

The best first metric is a bundled **assisted-reading unit**, with internal
cost weights even if the user sees a simple allowance. For example:

| Product action | Candidate treatment | Why it fits |
| --- | --- | --- |
| Local dictionary lookup | Included broadly | Core reading value; low marginal cost when lexicon data exists. |
| Hosted translation fallback | Counts against assistance allowance | Direct provider cost and clear learner value. |
| AI explanation or sentence help | Counts as a higher-weight assistance action | Higher compute cost and strong “I want more” signal. |
| Generated practice article | Counts against generation capacity | Directly maps to premium Immersion Studio value. |
| OCR or heavy import processing | Included in a fair-use envelope or priced by package | Cost scales with pages and provider work, but should not make basic reading feel metered. |
| Pages read, sessions, saved words | Never a paid usage meter | These are success and retention signals, not scarce infrastructure. |

The learner-facing language should avoid opaque credits. Prefer labels such as
“assistance remaining,” “practice generations,” or “translation help this
month.” Internally, TextPlex can normalize provider cost, feature value, and
abuse risk into a common unit.

The unit must be observable and explainable. Every consumption event should
record the feature, language pair, result state, account, timestamp, and
idempotency key, while excluding source-book text, learner responses, payment
details, and provider secrets. This follows the privacy boundary already
described in the analytics plan.

## Expansion mechanics

TextPlex should build expansion into the product experience in four ways:

1. **Habit-led upgrade prompts.** Show an upgrade after repeated value: for
   example, a learner reads on multiple days, uses translation or practice on
   multiple days, and then reaches an assistance boundary. Do not show a paywall
   on first use of the core reader.
2. **Plan fit by behavior.** Recommend Deep Read when the learner needs more
   assistance in existing books; recommend Immersion Studio when the learner
   repeatedly generates custom material. The prompt should explain the unmet
   job, not just show a larger number.
3. **User-controlled expansion.** Offer a clear upgrade, a larger plan, or a
   one-time top-up. Let users disable paid overages and see the effect before
   confirming.
4. **Annual value capture.** Add annual billing only after monthly retention and
   cost-to-serve are understood. Grandfather existing customers or communicate
   any annual price review well in advance; trust is more valuable than a
   short-term escalator.

This creates net-dollar expansion without assuming every user should become an
enterprise-style account. TextPlex's likely growth engine is more engaged
learners using more assistance, more languages, more generated practice, and
more creator products over time.

## Packaging and experimentation cadence

Pricing should become a product roadmap workstream shared by product, learning
design, engineering, and operations. A practical cadence is:

- **During beta:** keep the current plan labels and prices as visible
  hypotheses; collect willingness-to-pay interviews and behavioral signals
  before charging broadly.
- **Monthly:** review activation, repeated value, allowance exhaustion,
  paywall views, unlock clicks, conversion, cancellation, and provider cost by
  feature.
- **Quarterly:** test one packaging or message change at a time, such as the
  allowance size, custom-narrative inclusion, or top-up availability.
- **Annually:** review price, plan boundaries, fair-use policy, and annual
  discount using retention and contribution-margin evidence.

Avoid changing several dimensions at once. A price test is not interpretable if
the feature set, allowance, onboarding, and checkout flow all change together.
Keep a grandfathered cohort so changes can be compared with an existing user
experience.

## Metrics and decision gates

The north-star commercial view should connect learning value to economics:

| Stage | TextPlex signal | Decision use |
| --- | --- | --- |
| Activation | First book ready, first meaningful reading session, first learning action | Confirms the free loop delivers value before monetization. |
| Repeated value | Reading on multiple days, repeated translation, saved vocabulary, practice on separate days | Identifies the moment an upgrade could be relevant. |
| Usage pressure | Assistance allowance reached, processing queue encountered, generation demand | Tests whether the proposed meter reflects real demand. |
| Intent | Pricing viewed, unlock clicked, plan selected, checkout started | Measures packaging and message quality. |
| Conversion | Trial or paid activation, first successful charge | Measures initial monetization. |
| Expansion | Higher plan, top-up, additional language/content purchase, annual renewal | Measures organic account growth. |
| Quality guardrail | 7/30-day retention, cancellation, support complaints, failed assistance, contribution margin | Prevents monetization from damaging the learning loop. |

Do not optimize for total AI requests or revenue alone. A successful model should
increase retained reading and learning while making variable provider costs
predictable. With a small tester population, report counts and directional
patterns rather than claiming statistically reliable conversion rates.

## Recommended implementation sequence

### Phase 1: Validate value before charging

1. Keep Open Book and the current beta packaging visible.
2. Instrument the existing events from #97, adding allowance views,
   allowance exhaustion, feature-specific unlock intent, and cost metadata.
3. Interview active learners about the feature they would most miss and the
   job they would pay to complete.
4. Establish per-feature provider cost and gross-margin estimates.

### Phase 2: Introduce a soft usage boundary

1. Give every account a transparent hosted-assistance allowance.
2. Warn before exhaustion and offer upgrade paths without blocking the core
   reader.
3. Launch Deep Read first, because it is closest to repeated value in existing
   reading behavior.
4. Compare conversion, retention, support burden, and cost-to-serve against a
   beta or grandfathered control group.

### Phase 3: Add premium creation and expansion

1. Launch Immersion Studio when generation quality, history, and costs are
   reliable.
2. Add user-controlled top-ups or higher allowances only after demand is
   demonstrated.
3. Activate subscriptions through the provider-neutral commerce boundary and
   preserve server-authoritative entitlements.
4. Expand into creator content, language programs, or institution plans only
   when the core subscription loop is retained and supportable.

## Risks and guardrails

- **Punishing success:** Do not charge for reading volume, saved words, or
  learner progress.
- **Unpredictable bills:** Use soft caps, explicit confirmation, and disabled
  overages by default.
- **Provider-cost shock:** Track translation, OCR, and AI costs separately;
  cache repeat work and retain provenance.
- **Low-quality AI value:** Offer refunds/credits for failed paid operations and
  measure successful outcomes, not only request volume.
- **Privacy erosion:** Keep source books and learner data out of analytics and
  billing metadata; preserve local-first behavior where promised.
- **Premature complexity:** Start with one recurring plan and one clear usage
  allowance before adding many tiers, currencies, or enterprise contracts.
- **Commerce trust failures:** Subscription fulfillment, refunds, cancellation,
  and entitlement revocation must remain server-authoritative and idempotent,
  consistent with `docs/STRIPE_INTEGRATION_PLAN.md`.

## Bottom line

TextPlex should price the assistance that helps a learner read more fluently,
not the act of reading itself. The strongest model is a free, habit-forming
reader; a recurring Deep Read plan that expands with hosted assistance use; an
Immersion Studio plan for custom practice generation; and additive one-time or
marketplace products such as themes and curated content.

That structure gives TextPlex an automated expansion path while preserving its
core identity: a serious reading-and-learning system in which increased usage
is evidence of product success, not a reason to erect arbitrary barriers.

## Source notes

This report applies the pricing principles supplied in the request; the linked
third-party articles were not independently fact-checked for this document.

- [1] Chargebee, “Five strategies to unlock SaaS hypergrowth” — <https://www.chargebee.com/resources/guides/five-strategies-to-unlock-saas-hypergrowth/>
- [2] OpenView, “5 simple pricing hacks to jumpstart your startup's growth” — <https://openviewpartners.com/blog/5-simple-pricing-hacks-to-jumpstart-your-startups-growth/>
- [3] OpenView, “An inside look at how SurveyMonkey overhauled pricing after 10 years” — <https://openviewpartners.com/blog/an-inside-look-at-how-surveymonkey-overhauled-pricing-after-10-years/>
- [4] OpenView, “Usage-based pricing 2.0” — <https://openviewpartners.com/blog/usage-based-pricing-2-0/>
- [5] Reforge, “How SaaS companies price their product for growth” — <https://www.reforge.com/blog/brief-how-saas-companies-price-their-product-growth>
- [6] Sage, “SaaS pricing models” — <https://www.sage.com/en-us/blog/saas-pricing-models/>
- [7] OpenView, “SaaS benchmarks: hyper-growth” — <https://openviewpartners.com/blog/saas-benchmarks-hyper-growth/>
- [8] OpenView, “SaaS pricing guide: raise prices without losing customers” — <https://openviewpartners.com/blog/saas-pricing-guide-raise-prices-without-losing-customers/>
- [9] OpenView, “The state of product-led growth” — <https://openviewpartners.com/blog/the-state-of-product-led-growth/>

