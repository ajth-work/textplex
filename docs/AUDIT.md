# TextPlex Repository Audit

This is the reusable audit record and operating procedure for TextPlex. The detailed procedure lives here; `AGENTS.md` contains only the rules that must be followed during implementation and handoff.

## Audit record

| Parameter | Value |
| --- | --- |
| Last performed | 2026-07-19 |
| Audit revision | 1.0 |
| Repository | `ajth-work/textplex` |
| Branch | `codex-textplex-reader-preview-split` |
| Recorded HEAD | `cab48c8` |
| Working tree | Dirty; 46 paths changed when recorded |
| Host | Windows PowerShell |
| Python | 3.11.2 via `apps/api/.venv` |
| Node/npm | Node 18.15.0 / npm 9.5.0 locally; CI uses Node 20 |
| Scheduled audit | Sundays at 13:00 UTC via `.github/workflows/weekly-audit.yml` |
| Sensitive data policy | Do not inspect, copy, or commit private books, OCR output, learner data, secrets, or generated databases |

The audit was performed against the checkout as it existed, not a clean commit. Existing user changes were preserved. That is useful for real handoff review, but it means audit findings must identify whether a failure belongs to the baseline, the active change, or the environment.

## 2026-07-21 frontend runtime cleanup audit

- Upgraded the web runtime dependencies to Next `16.2.11` and Supabase `2.109.0`; the Next 16 Docker build passes on Node `20.20.2`.
- Removed route deoptimization warnings by placing the shell and route content behind `Suspense` boundaries.
- Removed the reader image lint warning and changed the web lint command to target source directories directly.
- Fixed clean Docker workspace dependency copying and the Next launcher’s root/workspace module resolution.
- Replaced the API test extra’s legacy `httpx` dependency with `httpx2`, removing the Starlette test-client deprecation warning.
- Reworked the site upload test’s browser shim to use a local `Blob` and `FormData` double, removing Node’s experimental `buffer.File` warning without changing production upload behavior.
- Promoted patched `postcss` `8.5.21` and `sharp` `0.35.3` versions into the root workspace dependency policy; `npm audit --omit=dev` now reports zero production vulnerabilities.
- Regenerated the npm lockfile from the current manifests, removed the obsolete workspace-local ESLint peer subtree, and made the Dockerfile rely on the hoisted root install instead of assuming a workspace-local `node_modules` directory.
- Pinned the web Supabase client to `2.109.0`, avoiding the newer Node 22-only release warning while the project’s supported runtime remains Node 20.
- Stabilized `apps/web/tsconfig.json` for Next 16 so the build no longer rewrites JSX or emits the generated-type include warning.
- Host verification under Node `18.15.0` still produces engine warnings because the project requires Node 20; use the repository `.nvmrc` or the Node 20 Docker runtime.
- The clean Node 20 build still reports two non-blocking upstream ESLint deprecation notices from `@humanwhocodes/object-schema` and `@humanwhocodes/config-array`; no application code or production vulnerability is implicated.

## 2026-07-21 Node 24 runtime upgrade audit

- Updated `.nvmrc`, the Next and standalone-site Docker images, CI, Pages, and the weekly audit workflow to Node 24 LTS.
- This is a runtime-only upgrade; Next, React, Supabase, API contracts, and application behavior were not changed in this step.
- Node 24 is the supported LTS baseline for production work; Node 20 is now EOL in the Node release schedule.
- Verification passed: 61 Python tests, 41 Node 24 site/route tests, Node 24 web lint, the Node 24 production Docker build, npm production audit with zero vulnerabilities, and live `8200`/`8201` reachability checks.
- Node 24’s npm 11 install-script review was handled narrowly by approving only the lockfile-pinned `unrs-resolver@1.12.2` native resolver script; no blanket lifecycle-script allowance was added.

## 2026-07-21 Next stable release verification

- Registry verification reports `next@latest` and `eslint-config-next@latest` as `16.2.11`; the repository was already current and did not move to the `16.3` preview or canary lines.
- Pinned both web declarations to exact `16.2.11` versions and regenerated the lockfile under Node 24.
- Verification passed: full Next runner-image build, web lint, 41 Node 24 site/route tests, and npm production audit with zero vulnerabilities.

## 2026-07-21 Phase 4 deployment-boundary verification

- Added the Next web service to the default Compose topology on `3000`; the API remains on `8201` and the standalone site is scoped to the explicit `legacy` profile on `8200`.
- Verification passed: Node 24 Next Docker build, canonical route reachability on `3000`, legacy route reachability on `8200`, API health, and a CORS preflight from `http://127.0.0.1:3000`.
- Remaining evidence: import-to-reader-to-progress in Next, the explicit legacy navigation link, final component-inventory cross-reference, and the full maintenance repair cycle.

## 2026-07-22 Phase 5 migration audit

| Parameter | Value |
| --- | --- |
| Audit date | 2026-07-22 |
| Scope | Frontend migration Phases 1-5, current Next/API/legacy topology, Phase 5 ownership and entitlement boundary, maintenance routine, and migration documentation |
| Baseline | Branch `codex-textplex-reader-preview-split`, commit `71ceae4`, with 14 pre-existing dirty paths preserved |
| Environment | Windows PowerShell; host Node `18.15.0`/npm `9.5.0`; Python `3.11.2`; API virtualenv; Node `24-bookworm-slim` Docker build |
| Live services | Next `3000`, API `8201`, standalone legacy `8200`; existing services were checked without restarting them |

### Passed

- API/processor suite: `65 passed, 2 skipped`.
- Static site suite: `34 passed`.
- Maintenance, Phase 3, Phase 4, Phase 5, and reader contract suites passed.
- Web lint passed with `--max-warnings=0`; `git diff --check` passed.
- Node 24 Docker production build passed for Next `16.2.11`.
- Production `npm audit --omit=dev` passed inside the built Node 24 image with `0 vulnerabilities`.
- Live checks returned `200` for Next `/profile`, API `/health`, legacy `/legacy/index.html`, and `/themes/catalog`.
- API auth boundary returned `401` for unauthenticated `/profile/migration`; CORS allowed the documented Next origin.

### Warnings and limitations

- The host shell is Node `18.15.0`, below the repository’s Node 24 baseline; the direct host web build was correctly rejected by Next. The required build evidence came from the Node 24 container.
- `npm run maintenance:check` could not obtain npm audit and Python-outdated data from the host environment; the production npm audit was rerun successfully in the Node 24 image. A disposable clean Python environment was not created during this audit.
- npm emitted repeated `EPERM` warnings while cleaning the user-level cache log directory. Tests and lint still passed; this is an environment permissions issue, not an application failure.
- Hosted Supabase, authenticated multi-user, payment-provider, webhook, backup/restore, and deployment-owned smoke tests were not run against external production services. These are Phase 6 or Phase 7 exit requirements.
- Phase 5 intentionally leaves hosted learner-event replication and commerce fulfillment incomplete. This is recorded as planned Phase 6 scope, not a hidden Phase 5 pass.

### Findings and issue mappings

| Severity | Finding | Mapping |
| --- | --- | --- |
| Medium | Cross-device learner history is not yet durable in a hosted event store; Phase 5 partitions local SQLite by authenticated subject but does not replicate learner events. | #44 / Phase 6 |
| Medium | Theme catalog and entitlement validation exist, but checkout, signed payment webhooks, refunds, disputes, and entitlement revocation are not implemented. | #44 / Phase 6 |
| Medium | Production cutover evidence is local/container-based; clean-clone deployment, observability, backups, restore drills, and final legacy retirement remain unverified. | #45 / Phase 7 |
| Low | Local audit reproducibility is limited by host Node 18 and the existing virtualenv/cache permissions. | Maintenance/audit follow-up |

### Result

Phase 5 implementation evidence is green for its stated scope. The migration is not complete overall: Phase 6 and Phase 7 remain planned and are now represented by GitHub issues #44 and #45, the local tracker, and their phase documents. Re-run this audit after Phase 6, then perform the final Phase 7 audit from a clean environment and deployment-owned services before closing the migration parent.

## 2026-07-22 Phase 6 sync-slice verification

- Added account-scoped local `learning_event_outbox` and `learning_event_receipts` tables, plus the Supabase `learning_events` contract with authenticated RLS select/insert policies.
- Added idempotent upload and remote hydration through authenticated `POST /learning/sync`; the reader invokes it only when an active Supabase session exists and continues locally when sync is unavailable.
- Verification passed: 67 API tests with 2 skips, Ruff, 34 static site tests, maintenance and migration/reader contract suites, web lint, Node 24 Docker build, `git diff --check`, and restarted live `3000`/`8201`/`8200` route checks.
- Unauthenticated live `/learning/sync` returned `401` as required.
- Remaining Phase 6 scope is explicit: client retry/conflict UX, private book/page ownership, and hosted commerce fulfillment. No external Supabase or payment-provider environment was used for this local verification.

## 2026-07-22 Phase 6 exit verification

- Added account ownership to imported books, filtered registry listings, and guarded book, page, image, extraction, analysis, archive, restore, delete, and learning-event routes. Legacy seed records without an owner remain public by design.
- Added durable local sync retry state, exponential retry metadata, conflict counting for malformed remote events, and reader status copy that never replaces usable local progress.
- Added a provider-neutral sandbox commerce lifecycle with catalog-owned pricing, per-user idempotency keys, HMAC-signed webhooks, duplicate-event protection, refund revocation, local entitlement reads, and Supabase commerce/RLS schema scaffolding.
- Verification passed: Phase 6 focused API boundaries `4 passed`, repository-wide API/processor suite `71 passed, 2 skipped`, Ruff, 34 site tests, web lint, and `git diff --check`. The local host build remains blocked by Node `18.15.0`; the supported Node 24 container build is the required production-build evidence.
- External Supabase, payment-provider, deployment, backup/restore, and clean-clone checks remain Phase 7 evidence. Real payment activation is intentionally not claimed by this phase.

## 2026-07-22 Phase 7 opening-slice verification

- Added `/ready` with book and user storage checks, returning `503` when required storage is unavailable instead of treating liveness as readiness.
- Added Next security headers, disabled the framework fingerprint, and made Compose `APP_ENV`, CORS origins, and CORS regex environment-driven rather than fixed to development values.
- Added `docs/OPERATIONS_RUNBOOK.md` covering deployment, rollback, readiness, backup/restore evidence, and incident handling.
- Verification passed: readiness API tests, Ruff, 34 site tests, web lint, Node 24 Docker builds, `git diff --check`, and live `3000`, `8201/health`, `8201/ready`, and `8200` checks. Live Next headers included CSP and `X-Content-Type-Options: nosniff`.
- Phase 7 remains in progress. Deployment-owned smoke tests, clean-clone evidence, real backup/restore and rollback drills, monitoring/alerting, HTTPS/auth callback verification, and legacy retirement remain open.

## 2026-07-22 Phase 7 hardening slice verification

- Added JSON request telemetry with request IDs, bounded mutation rate limiting, production configuration validation in readiness, and a tar/SHA-256 disposable data backup/restore tool.
- Added CI container smoke coverage for the canonical Next/API services and the explicitly profiled legacy surface, plus maintenance and backup/restore test execution.
- Fixed the production web image to copy `next.config.js` into the runtime layer; live verification now confirms the framework fingerprint is absent while CSP and `nosniff` remain present.
- Hardened backup restore path validation and excluded generated archives from version control by default.
- Final local verification passed: 74 API tests with 2 skips, Ruff, 34 site tests, maintenance tests, web lint, `git diff --check`, Docker web build, Compose validation, and live canonical/API/legacy route checks.
- Remaining evidence is deployment-owned: clean-clone execution in CI, production ingress HTTPS/rate limits, external auth callback verification, monitoring/alerting, named backup/restore and rollback drills, and the legacy deprecation/cutover decision.

## Scope and parameters

Review these surfaces whenever the audit runs:

- API routes, storage, uploads, CORS, configuration, and mutation boundaries in `apps/api/`.
- Processor contracts, tokenization, extraction, and dependency declarations in `packages/processor/`.
- API and processor tests in `tests/api/` and `tests/processor/`.
- Static site routes, preview server behavior, and site tests in `site/`, `scripts/`, and `tests/site/`.
- Next.js build/lint behavior in `apps/web/`.
- CI/Pages workflows, environment examples, `AGENTS.md`, `docs/ISSUE_TRACKER.md`, and `CHANGELOG.md`.

Do not treat any of these as proof of correctness by themselves:

- A passing test run from an unverified or stale environment.
- A static HTML fetch that does not exercise the server’s clean-route behavior.
- A configured environment variable that application code does not read.
- A local pass when the required GitHub Actions workflow has not run.
- Closing an issue before required checks are green and the result is recorded.

## Standard audit procedure

### 1. Establish the baseline

Record the branch, commit, runtime versions, and `git status --short` before making changes. Classify existing changes as user-owned, audit-related, or unknown. Do not reset or discard unknown work.

Search the repository instructions and contracts before inferring behavior:

```powershell
Get-Content AGENTS.md
rg -n "TODO|FIXME|security|CORS|upload|data_root|BOOK_DATA_DIR|USER_DATA_DIR" apps packages tests docs .github
```

### 2. Install from declared dependencies

For a clean audit environment, use a disposable virtual environment and install the project declarations, not only the Dockerfile or whatever happens to be installed:

```powershell
python -m venv .audit-venv
.audit-venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "apps/api[dev]" -e packages/processor
```

Do not commit `.audit-venv`. If the existing project virtualenv is used for speed, record that fact and still run the declared install command.

After the runtime and declared environments are available, run `npm run maintenance:check` for the read-only dependency/runtime drift report. Use `npm run maintenance:repair` only when intentionally repairing the local environment; use `npm run maintenance:update` only for a reviewed in-range dependency update.

### 3. Run backend checks

Run a focused test for each changed area first, then the full suite:

```powershell
python -m pytest -q
python -m ruff check apps/api packages/processor tests
```

The suite must cover both positive and negative cases for:

- extraction counts, token boundaries, and reader payloads;
- mutable fixture and application-state isolation;
- configured storage roots;
- source-path rejection and upload limits/cleanup;
- book truth versus learner/profile truth.

### 4. Run web and site checks

```powershell
npm ci
npm run test:site
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NODE_PATH = (Join-Path (Get-Location) "apps/web/node_modules")
npm run build:web
$env:CI = "1"
npm run lint:web
git diff --check
```

Lint must be non-interactive. Warnings do not silently become passes: record each warning, decide whether it is acceptable, and create follow-up work when it represents a real product or performance risk.

### 5. Run isolated live reachability checks

Use ports owned by the audit run. Do not reuse an existing Docker, development, or preview process. Start the site server from the `site/` working directory because it resolves its document root from the current directory.

For a site-only check:

```powershell
Set-Location site
$env:PORT = "18200"
node server.mjs
```

In another shell:

```powershell
$env:TEXTPLEX_WEB_BASE_URLS = "http://127.0.0.1:18200"
$env:TEXTPLEX_SKIP_API_HEALTH = "1"
npm run test:web
```

For a full-stack check, start the API on a separate audit-owned port, set `TEXTPLEX_API_HEALTH_URLS` to that port, and omit `TEXTPLEX_SKIP_API_HEALTH`. Confirm process ownership and shut down only the processes started by the audit.

### 6. Review security and configuration explicitly

For every network-reachable endpoint, record:

| Question | Required evidence |
| --- | --- |
| Is it local-only, authenticated, or intentionally public? | Route decision and test |
| Can a client select a filesystem path? | Approved-root validation and rejection test |
| Can a client cause unbounded work or storage? | Byte/page/time/resource limit and test |
| Does a mutation need protection? | Auth/local-boundary decision and negative test |
| Does documented configuration work? | Application read plus configuration test |
| Does failure clean up temporary state? | Failure test and filesystem assertion |

Review CORS defaults, upload handling, delete/archive/settings/profile mutations, secrets, generated data, and dependency declarations separately. Passing functional tests does not remove the need for this review.

### 7. Synchronize the result

Every audit result should include:

```text
Audit date:
Scope:
Baseline commit and worktree state:
Environment:
Commands/checks:
Passed:
Failed or blocked:
Warnings:
Findings and severity:
Issue mappings:
Known limitations:
Next audit trigger:
```

Update `docs/ISSUE_TRACKER.md` and `CHANGELOG.md` when repository or tracker state changes. Do not close an implementation issue until the required checks are green, the limitation is recorded, and the matching tracker state is synchronized.

## 2026-07-19 audit results

The initial audit found six backend failures: one shared-fixture order failure, one missing pasted-text extraction count, one Latin punctuation mismatch, and three Chinese parsing failures caused by a stale virtualenv missing declared `jieba` support.

Remediation verification then passed:

- 53 Python tests.
- Ruff for API, processor, and tests.
- 30 static site tests.
- Live preview route checks for homepage, library, analysis, search, study, progress, activity, import, and settings.
- Web build and non-interactive lint.
- `git diff --check`.

Issues #33–#40 were mapped to fixes and closed after verification.

## 2026-07-20 targeted components and analysis audit

This was a focused audit of the components inventory and the analysis/difficulty path, not a replacement for the full repository audit.

| Parameter | Value |
| --- | --- |
| Audit date | 2026-07-20 |
| Scope | `docs/COMPONENTS_INVENTORY.md`, Home Recent Analyses, Analysis preview, live `/analysis/{book_id}`, API analysis schemas/services, extraction/lexicon contracts, and related site/API tests |
| Baseline | Branch `codex-textplex-reader-preview-split`, commit `48dd3b2`, dirty worktree; existing changes preserved |
| Environment | Windows PowerShell; Python 3.11.2; Node 18.15.0; npm 9.5.0; existing `apps/api/.venv` |
| Checks | `apps/api/.venv/Scripts/python.exe -m pytest -q tests/api/test_product_surfaces.py`; `npm run test:site`; source/contract inspection; `git diff --check` |

### Passed

- Focused product-surface API tests: 2 passed, 1 existing Starlette/httpx deprecation warning.
- Static site tests: 31 passed.
- Inventory route coverage: all 13 Next page routes plus the preview-only Vocabulary page are represented.
- Formatting check: `git diff --check` passed.

### Warnings

- API test emitted the existing Starlette/httpx deprecation warning.
- Site tests emitted Node's existing experimental `buffer.File` warning.
- npm emitted an `EPERM` warning while cleaning the user-level npm cache; the site test suite still passed.

### Findings

| Severity | Finding | Evidence |
| --- | --- | --- |
| High | The analysis `/100` score has no canonical backend meaning. The live `BookAnalysisSurfaceResponse` has no difficulty, HSK distribution, or estimated-level field. | `apps/api/app/schemas/surfaces.py:18-29`, `apps/api/app/services/surfaces.py:80-128` |
| High | Live preview records use extraction progress, then `75` or `45`, as the analysis score. This makes the dial a processing/readiness signal while labeling it Overall Difficulty. | `site/preview-data.js:2563-2607` |
| High | Seed preview records hardcode scores and level labels independently; Chinese records have equal score `78` with HSK 4 and HSK 5 labels. The score is not derived from token or character HSK evidence. | `site/preview-data.js:52-61`, `site/preview-data.js:172-181` |
| High | The ring is a direct percentage visualization of the ambiguous score, with no clamping, provenance, or metric label beyond `/100`. | `site/preview-router.js:436-440`, `site/preview-router.js:296-312` |
| Medium | The analysis preview contains vocabulary distribution, average level, unknown words, and comprehension UI regions, but the current hydration path only fills title/meta, ring, level, recommendation, and sample. | `site/analysis-preview.html:655-706`, `site/preview-router.js:406-462` |
| Medium | The book schema/migration has a `sentences.difficulty_score` field, but the current processor contracts and extraction path do not define or populate a corresponding metric. | `apps/api/app/db/migrations/book/0001_initial.sql:28-36`, `packages/processor/src/processor/contracts.py:43-76` |
| Medium | The inventory previously omitted the Home Recent Analyses row and the preview Analysis detail cards; those IDs are now recorded. | `docs/COMPONENTS_INVENTORY.md` analysis and standalone preview sections |

### Issue mapping

- GitHub issue [#42](https://github.com/ajth-work/textplex/issues/42): Define text difficulty and expected HSK level analytics. The issue is recorded in `docs/ISSUE_TRACKER.md` and is scoped across calculation, contract, live/preview consumers, and tests.
- Existing #27 and #31 remain related roadmap work, but neither defines the canonical difficulty/HSK metric contract identified here.

### Limitations and next trigger

- No private books, OCR output, learner data, secrets, or generated databases were inspected.
- The audit did not choose the final aggregation formula. Issue #42 must decide character-to-word aggregation, occurrence weighting, unknown-level handling, language-specific fallbacks, and the distinction between text difficulty and learner comprehension.
- Re-run the focused audit after the metric contract and calculation are implemented; require API, processor/calculation, preview, and contract regression coverage before closing #42.

### Follow-up metric direction

The proposed implementation direction is now clearer:

- Character level: resolve a numeric HSK level for each eligible Chinese character, sum the known levels, and divide by the character count represented by the chosen coverage policy.
- Sentence level: calculate one average HSK value per sentence, preserving a sentence-by-sentence series such as `4.6`, `3.9`, and `4.2`.
- Page level: aggregate the sentence values for each page, retaining counts and coverage.
- Text level: expose both the direct character-weighted average and the arithmetic average of sentence-level values; the analysis ring should use the sentence-level average unless the metric review selects otherwise.
- Presentation: show a value such as `HSK 4.6` or a documented HSK-normalized gauge, not an unlabeled `/100` difficulty score. Keep extraction progress and learner comprehension as separate metrics.

Unknown-character handling, multi-character lexicon precedence, occurrence weighting, HSK 1-6 versus newer HSK bands, and non-Chinese fallbacks remain acceptance decisions for #42.

### Limitations identified

- The audit began in a dirty worktree, so it was not a clean-room reproducibility test.
- The initial Python run exposed dependency drift only because the existing virtualenv lacked `jieba`; the next audit must create a disposable environment or record an equivalent clean install.
- The first live check encountered existing services on the default ports. Future checks must use audit-owned ports and process IDs.
- The workflow file was reviewed locally; a successful GitHub Actions run remains stronger evidence than local YAML inspection.
- Build/lint output still contains known Next.js warnings, including the reader `<img>` warning and client-rendering deopt warnings. They are recorded warnings, not hidden failures.
- No dedicated secret scan, dependency vulnerability scan, authenticated multi-user test, or clean-clone deployment test was part of this run.

## Audit cadence and evolution

Run the focused checks for every implementation change. Run the full procedure:

- before closing an audit or security issue;
- before a Pages or Docker deployment;
- after changes to dependencies, CI, storage, authentication, uploads, or network exposure;
- at least monthly while the project is actively changing.

GitHub Actions runs the automated full audit every Sunday at 13:00 UTC and supports manual dispatch. The scheduled workflow provides repeatable test, build, lint, live-route, and API-health evidence; it does not replace human review of threat boundaries, new configuration, warnings, or sensitive-data handling.

When an audit finds a new class of failure, add three things in the same workstream: a regression test, a concise `AGENTS.md` guardrail if the rule applies to future sessions, and a parameter or limitation entry here. This keeps the audit smaller and more reliable over time instead of turning it into an unbounded checklist.

## Codex scheduled-task companion

Use a Codex scheduled task for the human-readable review that follows the automated GitHub run. Schedule it for Sundays at 15:00 UTC so the GitHub audit has time to finish. Create it from ChatGPT web or the ChatGPT desktop app under **Scheduled**; Codex CLI and the IDE extension do not provide the scheduling management interface.

Prefer a standalone task in a dedicated worktree so the review cannot modify unfinished local work. The computer must remain powered on with the desktop app running when the task needs local project files. The task should be report-only unless a later prompt explicitly authorizes edits, issue changes, commits, or pushes.

Suggested task prompt:

```text
Every Sunday, perform the TextPlex repository audit using docs/AUDIT.md and AGENTS.md.

Review the current repository state and the latest GitHub Actions Weekly Audit run. Run the focused checks required by the audit, classify each result as pass, failure, warning, or limitation, and compare findings with the previous audit record. Pay special attention to API security boundaries, configuration coverage, dependency drift, test isolation, live route reachability, and sensitive-data handling.

Do not inspect private books, OCR output, learner data, secrets, or generated databases. Do not edit files, create/close issues, commit, or push. Report actionable findings with file paths, evidence, severity, and a recommended next step. If there are no new findings, say so clearly.
```
