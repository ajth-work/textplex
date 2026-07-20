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
| Sensitive data policy | Do not inspect, copy, or commit private books, OCR output, learner data, secrets, or generated databases |

The audit was performed against the checkout as it existed, not a clean commit. Existing user changes were preserved. That is useful for real handoff review, but it means audit findings must identify whether a failure belongs to the baseline, the active change, or the environment.

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

When an audit finds a new class of failure, add three things in the same workstream: a regression test, a concise `AGENTS.md` guardrail if the rule applies to future sessions, and a parameter or limitation entry here. This keeps the audit smaller and more reliable over time instead of turning it into an unbounded checklist.
