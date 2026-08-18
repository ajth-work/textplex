# TextPlex Billable Services and Usage Map

**Status:** Current inventory and monitoring plan  
**Last verified:** 2026-08-18  
**Owner:** TextPlex operations

## Purpose

This document maps every external service that can create provider cost when a learner, tester, or administrator uses a TextPlex surface. It is the starting point for provider projects, credentials, budgets, alerts, and in-app usage attribution.

Provider dashboards are the billing authority. TextPlex's local counters are useful for product-level attribution and estimates, but they must not be treated as the invoice of record.

## Current billable inventory

| Provider | User-facing or operational surface | Current code path | Current credential boundary | Current monitoring state |
| --- | --- | --- | --- | --- |
| OpenAI Responses API | Page OCR for PDF/photo book import and appended reader pages | [`apps/api/app/services/ocr.py`](../apps/api/app/services/ocr.py) | `OPENAI_TEXTPLEX_PROD_READER_OCR`; development falls back to `OPENAI_TEXTPLEX_DEV_EXPERIMENTAL` | Feature-specific key is supported; provider usage can be isolated to the OCR project |
| OpenAI Responses API | Reader translation alignment | [`apps/api/app/services/translation_alignment.py`](../apps/api/app/services/translation_alignment.py) | `OPENAI_TEXTPLEX_PROD_TRANSLATION_ALIGNMENT`; development fallback is available | Feature-specific key is supported |
| OpenAI Responses API | Generated practice articles | [`apps/api/app/services/generated_articles.py`](../apps/api/app/services/generated_articles.py) | `OPENAI_TEXTPLEX_PROD_PRACTICE_ARTICLES`; development fallback is available | Feature-specific key is supported |
| OpenAI Responses API | User feedback triage and screenshot analysis | [`apps/api/app/services/feedback.py`](../apps/api/app/services/feedback.py) | `OPENAI_TEXTPLEX_PROD_FEEDBACK_ANALYSIS`; development fallback is available | Feature-specific key is supported |
| OpenAI Responses API | Theme suggestions and related admin/product tooling | [`apps/api/app/services/theme_admin.py`](../apps/api/app/services/theme_admin.py) | `OPENAI_TEXTPLEX_PROD_THEME_GENERATION`; development fallback is available | Feature-specific key is supported |
| Google Cloud Translation | Lexicon fallback translation for terms and definitions | [`apps/api/app/services/lexicon.py`](../apps/api/app/services/lexicon.py), [`apps/api/app/services/google_translate.py`](../apps/api/app/services/google_translate.py) | `GOOGLE_TEXTPLEX_PROD_TRANSLATION`; `GOOGLE_APPLICATION_CREDENTIALS` remains a migration fallback | TextPlex records monthly characters, requests, account ownership, and an estimated cost in [`google_translate_usage.py`](../apps/api/app/services/google_translate_usage.py); Google Cloud billing remains authoritative |
| Google Cloud Translation | Romanization/pronunciation enrichment during extraction and lexicon work | [`apps/api/app/services/book_extraction.py`](../apps/api/app/services/book_extraction.py), [`apps/api/app/services/google_translate.py`](../apps/api/app/services/google_translate.py) | `GOOGLE_TEXTPLEX_PROD_ROMANIZATION`; `GOOGLE_APPLICATION_CREDENTIALS` remains a migration fallback | Uses its own credential/project boundary; TextPlex's local usage ledger still needs a separate provider dimension for final reporting |
| Supabase | Hosted Auth, profile/settings data, Storage, Postgres, and Realtime | [`apps/api/app/services/auth.py`](../apps/api/app/services/auth.py), [`apps/web/lib/supabase.ts`](../apps/web/lib/supabase.ts) | One Supabase project; browser publishable key plus server-only service-role key | Monitored in the Supabase project; not attributable by API key per TextPlex feature today |

## Non-provider-cost dependencies

These can create operational load or plan limits, but they are not currently metered as a direct per-user provider API charge in TextPlex:

- Wikipedia lookups used for reference content.
- GitHub issue creation used by the feedback/admin workflow.
- Docker, local SQLite, and local book/profile storage.

They should remain on the dependency inventory, but they do not need a user-facing cost meter unless the deployment plan changes.

## Recommended credential and project topology

### OpenAI

Use a separate OpenAI Project for each meaningful product cost center, and create a project-scoped service-account key for the API runtime. A different key inside the same project improves rotation and auditability, but the project is what gives the cleanest usage, limits, and budget boundary.

Recommended production projects:

1. `textplex-prod-reader-ocr`
2. `textplex-prod-reader-alignment`
3. `textplex-prod-practice-generation`
4. `textplex-prod-feedback`
5. `textplex-prod-theme-generation`

Use separate `staging` and `development` projects as well. Set model restrictions, rate limits, monthly spend alerts, and hard limits where available. Keep each key server-side and rotate it independently.

The application should eventually replace the shared `OPENAI_API_KEY` with feature-scoped variables such as:

```text
OPENAI_OCR_API_KEY=
OPENAI_TRANSLATION_ALIGNMENT_API_KEY=
OPENAI_GENERATION_API_KEY=
OPENAI_FEEDBACK_API_KEY=
OPENAI_THEME_API_KEY=
```

During migration, the API still accepts the legacy `OPENAI_API_KEY` as a final fallback and logs a warning. Production should remove that variable after the feature-specific keys are installed so a missing feature key fails clearly.

### Google Cloud Translation

Use separate Google Cloud projects by cost center and environment, for example:

- `textplex-prod-translation` for term/definition translation.
- `textplex-prod-romanization` for pronunciation/romanization.

The current v2 translation call can use a project-associated API key, but the v3 romanization path uses Cloud credentials and does not use an API key. Therefore the safer boundary for both paths is separate Google Cloud projects with separate least-privilege service accounts and credential files. Configure billing budgets, quotas, and alerts on each project.

TextPlex loads those files through `GOOGLE_TEXTPLEX_PROD_TRANSLATION` and `GOOGLE_TEXTPLEX_PROD_ROMANIZATION`. Keep both values server-side; `GOOGLE_APPLICATION_CREDENTIALS` is retained only as a temporary migration fallback for older deployments.

If Google request labels are supported by the selected API method, add a stable feature label such as `textplex_feature=lexicon_translation` or `textplex_feature=romanization`. Continue recording TextPlex's own account and feature usage because provider billing and user-level attribution answer different questions.

### Supabase

Use separate Supabase projects for `development`, `staging`, and `production`. Do not create browser API keys per feature: the publishable key identifies the Supabase project, while the server-only service-role key is a privileged backend credential. Monitor plan usage and quotas at the project level, and keep Storage/database policies responsible for tenant isolation.

## Monitoring requirements

Every billable request should be attributable to:

- provider (`openai`, `google_translate`, or `supabase`);
- product feature (`reader_ocr`, `translation_alignment`, `practice_generation`, `feedback`, `theme_generation`, `lexicon_translation`, or `romanization`);
- environment (`development`, `staging`, or `production`);
- authenticated account when one exists;
- provider project and, where available, provider key/service-account identity;
- request count and provider-measured units (tokens, characters, storage, or database operations where available);
- success/failure and a correlation/request ID.

Do not log secrets, full prompts, book text, page images, or credential JSON. Store only bounded metadata needed for cost attribution and incident investigation.

## Implementation sequence

1. Create the OpenAI projects and Google Cloud projects/service accounts listed above; configure budgets, alerts, model/API restrictions, and quotas.
2. Add the feature-specific secrets to the deployment secret store. Do not paste secret values into GitHub issues, Markdown, or chat.
3. The API provider clients select the feature-specific credential and record provider/project/feature metadata where the provider supports it.
4. Keep the existing Google monthly ledger, but make translation and romanization separate ledger dimensions rather than one combined total.
5. Add an admin cost/usage view that combines provider exports with TextPlex feature/account counters; label estimates separately from provider invoice data.
6. Rebuild/restart the Docker API and web services, then verify one controlled request per billable feature and confirm the corresponding provider project receives usage.

## Provider references

- [OpenAI project management and project spend controls](https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform)
- [OpenAI recommendation for project-based API keys](https://help.openai.com/en/articles/5008148)
- [OpenAI usage fields, including project and API-key identifiers](https://platform.openai.com/docs/api-reference/usage)
- [Google Cloud Translation authentication](https://docs.cloud.google.com/translate/docs/authentication)
- [Google Cloud Translation API overview and labels](https://docs.cloud.google.com/translate/docs/api-overview)
- [Google Cloud Translation pricing and charged projects](https://cloud.google.com/translate/pricing)
- [Google Cloud project setup, billing, quotas, and separate environments](https://docs.cloud.google.com/translate/docs/setup)
