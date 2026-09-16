---
title: TextPlex Operating Cost, Pricing Floor, and Gradual Growth Plan
status: Advisory; pricing and deployment decisions pending
date: 2026-09-16
related_issues: "#140, #97, #73"
---

# TextPlex Operating Cost, Pricing Floor, and Gradual Growth Plan

## Decision summary

TextPlex can keep its core reading loop free and charge for *hosted assistance and content generation*, but it does not yet have enough invoice and usage data to claim a measured operating cost per learner. The immediate commercial task is to make those costs observable, cap expensive operations, and run a small paid pilot. The existing $4.99 Deep Read and $9.99 Immersion Studio prices are product hypotheses, not validated cost-covering prices or live subscriptions.

For a pilot, test **$7.99/month for Deep Read** and **$14.99/month for Immersion Studio**, with clear monthly hosted-assistance allowances and no automatic overage. Keep $4.99/$9.99 as comparison or grandfathered beta offers only after measured margins justify them. These are USD test prices, not an approved price list. The lower Deep Read price leaves little room for fixed cost or support at a small paying population. Do not charge for pages read, time spent reading, saved words, or learner history.

The sample model below needs **25 Deep Read subscribers to cover $120 of assumed fixed cash cost plus 200 active free learners at $0.20 each** at $7.99/month. At $4.99, it needs **44**. These are *scenario outputs*, not a forecast or current TextPlex financial results. Founder labor, acquisition, taxes, refunds, and several operational services are excluded from the cash break-even number; the business break-even point is therefore higher.

## What is deployed, proposed, and still unknown

| Cost surface | TextPlex evidence and role | Cost behavior | Readiness judgment |
| --- | --- | --- | --- |
| Next.js web, FastAPI API, local SQLite, Docker | Canonical app/API and local-first book/learner data; [architecture](ARCHITECTURE.md), [technology stack](TECHNOLOGY_STACK.md) | Local development has no distinct cloud invoice, but electricity, computer, backups, and operator time still cost money. A public API needs a separately priced host with persistent storage. | The [Vercel plan](VERCEL_GITHUB_DEPLOYMENT_PLAN.md) is a plan, not proof of a live production web/API bill. No production API host price is established here. |
| Supabase Auth, Postgres, Storage, Realtime | Current hosted identity/account services in [billable-services inventory](BILLABLE_SERVICES.md) | Project base cost and possible usage overages; free tier can pause after inactivity. | Obtain actual project plan and last three invoices. |
| OpenAI Responses API | OCR, alignment, practice generation, feedback analysis, theme tooling; current defaults use GPT-5.6 Luna in API services | Tokens, including image input and reasoning/output tokens; retries and failed attempts can add cost. | Per-feature keys exist, but provider invoices and per-success cost distributions are needed. |
| Google Cloud Translation | Basic v2 translation and Advanced v3 romanization | Charged characters; caching and target-language fan-out matter. | Local ledger is an estimate and currently combines some translation/romanization dimensions. Reconcile against each Google project invoice. |
| GitHub/Actions/Pages | Source, CI and legacy static shell | Plan, private-repo CI minutes, storage; Pages is not the canonical application host. | Check owner billing and Action-minute utilization. |
| Cloudflare/domain registrar | DNS, possible proxy/CDN, domain renewal; [third-party note](THIRD_PARTY_DATA_NOTE.md) | Domain renewal and any enabled paid security/CDN products | Confirm enabled products, registrar renewal, and whether traffic is proxied. |
| Payment processor | [Stripe plan](STRIPE_INTEGRATION_PLAN.md) describes a sandbox theme foundation; live Stripe and recurring subscriptions are future work | Transaction and possible subscription-billing fees, disputes, refunds, taxes | Include in pricing math; do not count the theme shop as recurring revenue. |
| Support, backups, observability, legal, accounting, tax | Needed for a commercial service | Fixed and step costs, plus support per account | Not adequately priced in repo or invoices; budget before public launch. |

The [dynamic pricing report](TEXTPLEX_DYNAMIC_PRICING_REPORT.md) and issue #140 define packaging direction. The former describes $0/$4.99/$9.99 concepts and one-time theme commerce. Its product strategy is compatible with this report; this report supplies the operating-cost test and launch gates. Generated-article configuration currently reads `OPENAI_OCR_MODEL` in `apps/api/app/services/generated_articles.py`; verify the effective model by feature when reconciling AI spend.

## Published vendor rates used in this model

Rates checked **2026-09-16**. Vendor invoices and contract terms override public list prices. Taxes, currency, region, credits, and plan-specific overages may change the amount paid.

| Item | Published rate or limit | How to use it |
| --- | --- | --- |
| GPT-5.6 Luna standard API | $0.20 per 1M input tokens, $0.02 per 1M cached input, $1.20 per 1M output tokens; long prompts have higher rates | Estimate text operations from actual input/output usage. Image OCR needs observed image-token usage; never assume one fixed token count per page. [OpenAI model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna). |
| Google Cloud Translation NMT | First 500,000 characters/month covered by a shared $10 monthly credit across Basic/Advanced; then $20 per 1M characters for normal-volume text; Advanced NMT pricing includes `romanizeText` | Count charged characters by method/project. Do not multiply the $10 credit across requests or assume a separate credit for each credential. [Google pricing](https://cloud.google.com/products/translate/pricing). |
| Supabase | Pro starts at $25/month, first project included, with 100,000 MAU, 8 GB database disk and 250 GB egress before listed overages; extra projects/compute can cost more | Use $25 only as a starting budget, not a guarantee that the actual plan costs $25. [Supabase pricing](https://supabase.com/pricing). |
| Vercel, if selected for commercial web | Pro platform fee $20/month with one deploying seat and $20 usage credit; excess usage and additional seats can add cost; Hobby is for noncommercial personal use | Model $20 for one commercial web seat, then reconcile deployment usage. The FastAPI host remains separate. [Vercel Pro](https://vercel.com/docs/plans/pro-plan), [Hobby terms](https://vercel.com/docs/plans/hobby). |
| GitHub Free | 2,000 Actions minutes/month for private repositories; public standard-runner Actions and Pages have different free treatment | Check the repository owner's plan and CI billing; do not assume zero at scale. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions). |
| Stripe, US domestic-card example | Payments 2.9% + $0.30 per successful transaction; Billing pay-as-you-go 0.7% of Billing volume if used | This report models both for a monthly subscription. Confirm the actual merchant country, payment method and Billing contract. International cards, tax products and disputes can cost more. [Stripe pricing](https://stripe.com/pricing). |

Illustrative provider math: a *text-only* Luna response using 3,000 uncached input tokens and 1,000 output tokens is **$0.0018** (3,000 × $0.20/1M + 1,000 × $1.20/1M). Ten thousand Google NMT characters above the free credit are **$0.20**. Neither calculation is an actual TextPlex request measurement. OCR images, prompt length, response length, retries, and caching can materially change the result.

## Cost ledger to establish before paid launch

Record the following monthly, by environment and feature. Provider invoices are the cost authority; application events explain *why* cost arose.

| Ledger line | Measurement and treatment |
| --- | --- |
| Fixed cash outflow | Web plan, API host and persistent volume, Supabase project(s), backup/restore storage, domain, monitoring, support tooling, paid CI. Include staging separately. |
| Variable assistance | OpenAI input/cached/output tokens, image OCR pages and actual token usage, Google charged characters by Basic translation vs Advanced romanization, retries, failures, and cache-hit rate. |
| Account economics | Active free and paid learners, payer plan, successful charge, processor/Billing fees, refunds, disputes, and monthly provider cost per account and feature. Use pseudonymous account IDs; exclude source text and private book assets. |
| Labor and growth | Founder/operator hours valued at a realistic replacement rate, customer support, accessibility/content QA, taxes/accounting/legal, acquisition spend and attribution. Show both cash and fully loaded profit. |
| Capacity steps | API CPU/memory/queue time, persistent book/page storage, backups, Supabase disk/egress/MAU, web bandwidth/functions, CI minutes. Forecast the next tier before its quota is reached. |

Recommended monthly close: export invoices and usage from each provider; match API request IDs and Google character ledger to invoice periods; allocate shared infrastructure by active account or workload; investigate any variance over 10%; publish median, 90th percentile and maximum cost per active free and paid account. Do not use *average* cost alone to set allowances. Cap spend per feature and environment, with alerts at 50/80/100% of the monthly budget. Treat provider budget alerts as notifications unless the provider documents a true hard cap; enforce TextPlex's own request/page/character/token limits.

## Illustrative cash model: replace every assumption with measured data

**Assumptions, not invoices:** 200 monthly active free learners; $0.20 variable service cost per active free learner; Deep Read $0.80 and Immersion Studio $1.80 variable service cost per subscriber per month. These amounts combine assumed AI/translation, incremental compute/storage/egress and support tooling, but not human support. Fixed monthly cash cost **$120** is a planning placeholder: Vercel Pro $20 + Supabase Pro $25 + API host/persistent storage $50 + backup/monitoring/domain allocation $25. The last two lines are illustrative budgets, not vendor quotes. If current hosting differs, replace all four lines. Model one domestic-card subscription charge per month and Stripe Payments plus Billing pay-as-you-go; no tax, refund or failed-payment reserve is included.

Formula for one plan at price `P`, `N` subscribers and `F` active free learners:

```text
net receipt per paid account = 0.964 × P − $0.30
monthly cash result = N × (net receipt − paid variable cost)
                      − $120 − F × $0.20
break-even price = ($120 + F × $0.20 + N × paid variable cost
                    + N × $0.30) / (0.964 × N)
```

| One-plan case with 200 active free learners | Net receipt per subscriber | Variable cost per subscriber | Contribution per subscriber | Paying accounts to cover $120 fixed + $40 free cost |
| --- | ---: | ---: | ---: | ---: |
| Deep Read at prior $4.99 hypothesis | $4.51 | $0.80 | $3.71 | 44 |
| Deep Read at proposed $7.99 test | $7.40 | $0.80 | $6.60 | 25 |
| Immersion Studio at prior $9.99 hypothesis | $9.33 | $1.80 | $7.53 | 22 |
| Immersion Studio at proposed $14.99 test | $14.15 | $1.80 | $12.35 | 13 |

Round account counts *up*. The two Studio cases are stand-alone comparisons, not a prediction that every payer will buy Studio. At 50 Deep Read payers and 200 active free learners, $4.99 leaves about **$25.52/month** after these modeled cash costs; $7.99 leaves about **$170.12/month**. That difference must absorb variance and unmodeled expenses.

**Sensitivity:** with only 10 Deep Read payers and 200 active free learners, the minimum modeled price is **$17.74/month**. With 50 payers it is **$4.46/month**. Early pricing cannot be defended with a variable-cost margin alone; the paying population and free-tier mix matter. At 50 payers, a further $100/month of fixed cost adds about **$2.07** to the required monthly price. Every extra 100 active free learners adds about **$0.41** at that payer count. A paid user's actual cost that is $1 higher adds about **$1.04** to the needed price.

A more realistic *operating* floor adds labor, support, refunds, tax administration and customer acquisition. If those total $1,000/month beyond the example cash model, 50 Deep Read payers require approximately **$25.21/month** under these same assumptions. The exact number is illustrative; it demonstrates why “covers cloud bills” is a narrower claim than “sustainable business.”

## Pricing and allowance direction

1. **Open Book, $0:** unlimited core reading, library, local dictionary and learner history; a small, visible monthly allowance for hosted translation, OCR or generation, with per-upload/page limits and no silent paid usage. Allow cached help without rebilling where feasible. Free-tier economics require an abuse limit and a monthly free-cohort budget.
2. **Deep Read, test $7.99/month:** offer more hosted translation/alignment and reliable import assistance. Set initial quantities only after a 30-day cost sample; start with conservative internal cost ceilings and user-facing action counts. A request that exceeds a ceiling should show a clear retry/upgrade route while preserving basic reading.
3. **Immersion Studio, test $14.99/month:** reserve for repeated custom practice generation and higher assistance demand once generation quality and cost are stable. A merely larger “unlimited” allowance is unsafe before tail-cost data exists.
4. **One-time themes:** keep separate from subscription economics. A $1.99 theme sold with the modeled US domestic-card Payments fee nets about $1.63 before taxes, refunds, artwork, support and fulfillment; it is not a dependable way to subsidize free usage. Bundle and international fees need separate calculations.
5. **Annual plans and top-ups:** defer until monthly retention, cancellation, refund and cost distributions are known. If later offered, keep overages opt-in and show the exact amount before payment.

Do not publish the test prices as active entitlements before subscriptions, cancellation/refund handling, server-authoritative allowance accounting and payment reconciliation exist. The existing theme sandbox does not fulfill that requirement.

## Gradual growth and readiness gates

| Stage | Product and commercial action | Gate to advance |
| --- | --- | --- |
| 0. Measurement, 0–50 testers | Reconcile 30 days of actual OpenAI, Google, Supabase, hosting and domain spend. Sample OCR/text-import types and success/failure paths; log token/character/page usage by feature without private content. Fix effective model attribution. Confirm API host, persistent storage and backup/restore design. | At least 95% of billable requests attributable to a feature and environment; invoice reconciliation within 10%; working restore test; budget alerts and enforced app-side limits. These are proposed operating gates. |
| 1. Controlled paid pilot, approximately 25–100 payers | Offer one Deep Read plan to opted-in users; publish exact allowances, cancellation and refund terms; use real payment webhooks and authoritative entitlements. Continue a meaningful free reader. | Three monthly cohorts with positive contribution after payment fees and variable provider costs; paid 90th-percentile cost below the allowance budget; acceptable reader retention and support load. Judge small cohorts by counts and qualitative evidence, not statistical claims. |
| 2. Repeatable growth, approximately 100–1,000 payers | Add Studio only if generation demand recurs; tune quotas from measured cost distributions; invest in onboarding and referral/content discovery. Scale API workers and storage only when utilization warrants it. | Contribution remains positive after allocated shared infrastructure; restore/recovery and incident drills pass; payback on acquisition is known and shorter than observed retention value. |
| 3. Broader scale, beyond 1,000 payers | Evaluate annual billing, institution/creator offers and negotiated provider rates. Separate workloads and cost centers; automate monthly close and forecast capacity. | Retention, gross margin, service quality and cash runway support each expansion; protect local-first privacy and book/learner data separation. |

## Decisions and data requested from the owner

Before choosing a launch price, collect: (1) last three actual invoices or billing exports for OpenAI, Google, Supabase, hosting, domain and GitHub; (2) current deployment topology and monthly API/storage/backup cost; (3) active free and intended paid cohort size; (4) median and 90th-percentile provider cost per OCR page, translation, alignment and generated article; (5) the target monthly founder/support budget; (6) merchant country, currency, tax and payment-fee terms. Use those values to replace the scenario table and set a cash floor, fully loaded floor, and target margin. Then interview active readers about willingness to pay for the specific Deep Read and Studio jobs.

## Source and scope notes

Repository sources: [billable inventory](BILLABLE_SERVICES.md), [dynamic pricing proposal](TEXTPLEX_DYNAMIC_PRICING_REPORT.md), [Stripe implementation plan](STRIPE_INTEGRATION_PLAN.md), [deployment plan](VERCEL_GITHUB_DEPLOYMENT_PLAN.md), [architecture](ARCHITECTURE.md), [technology stack](TECHNOLOGY_STACK.md), and [third-party data note](THIRD_PARTY_DATA_NOTE.md). Public list-price links are embedded beside each rate above. No private invoice, production usage export, merchant agreement, or customer willingness-to-pay data was available for this review. All modeled account counts, usage, API hosting, backup and support costs are explicit assumptions; no revenue or launch readiness is claimed.
