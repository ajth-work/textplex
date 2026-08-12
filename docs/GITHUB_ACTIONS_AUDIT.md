# GitHub Actions Coverage Audit

## Audit date

2026-08-12

## Scope

Reviewed `.github/workflows/ci.yml`, `weekly-audit.yml`, `pages.yml`, and `github-auth-check.yml` against the current API, processor, Next.js, static-site, deployment, and maintenance test surfaces. Reviewed recent GitHub Actions runs through the GitHub CLI.

## Current coverage

- Python API and processor tests plus Ruff.
- Static-site tests and legacy preview route reachability.
- Next.js production build and non-interactive lint.
- Maintenance and backup/restore tests.
- Docker Compose build and canonical/legacy route smoke checks.
- Weekly dependency/runtime drift reporting and live API readiness checks.

## Findings

### P0 — Protect `main` and require CI

`main` had no branch protection or rulesets. Passing checks were advisory, so direct pushes or merges could bypass the tested path.

Implemented on 2026-08-12: `main` now requires pull requests, enforces the three CI jobs, blocks force-pushes and deletion, and enforces the policy for administrators. Required approving review count is zero for the current solo-maintainer workflow.

Required CI jobs:

- `Python API and processor`
- `Site tests, web build, and lint`
- `Clean container deployment smoke`

### P0 — Run Next web contract tests in CI

The repository contains 20 `tests/web/*.test.js` files covering route contracts, auth boundaries, reader navigation, feedback, onboarding, settings, and study practice. CI previously ran only `tests/site/*.test.js`; the Next web contract suite was not invoked.

Implemented: add `npm run test:web:contracts`, backed by a deterministic test-file discovery script, to CI and the weekly audit. The local suite currently passes 69 tests.

### P0 — Re-verify GitHub Pages after the repository setting change

The Pages build and artifact upload passed, but deployment initially failed with HTTP 404 because GitHub Pages was not enabled for the repository. The workflow source is structurally valid. The repository setting was corrected and the successful deployment verification is recorded below.

### P1 — Expand canonical Next.js smoke coverage

Verified after the repository Pages setting change: manual `main` deployment [run 31644287876](https://github.com/ajth-work/textplex/actions/runs/31644287876) passed both the build and deploy jobs. The run still reports the GitHub-hosted Node 20 action deprecation warning for the current major versions of the checkout/setup/upload actions.

Implemented in the P1 slice: the container smoke job now checks the canonical Next routes for home, library, analysis, reader, import, study, progress, activity, settings, and profile. The weekly audit builds and starts the canonical Next production server, then checks it alongside the legacy `8200` preview. The readiness probe now accepts the API's documented `ready` payload and validates all readiness checks.

### P1 — Make dependency/security findings actionable

Implemented in the P1 slice: CI and the weekly audit now fail on high-or-critical production npm vulnerabilities, and pull requests run GitHub's dependency-review action with a high-severity failure threshold. The audit found and remediated the vulnerable PostCSS/nanoid path by updating the root PostCSS range to `^8.5.23`; the production audit now reports zero vulnerabilities. Secret scanning remains a GitHub repository security-setting follow-up rather than a workflow-local substitute.

### P2 — Add authenticated and external integration evidence

Add protected multi-user, learner-sync, Supabase, commerce/webhook, backup/restore, and deployment-owned checks when those environments are available. Keep credentials and private learner/book data out of CI fixtures and logs.

### P2 — Add workflow maintenance controls

Add Dependabot configuration and pin third-party Actions to immutable commit SHAs after the workflow surface stabilizes.

## Recent evidence

- PR CI passed on [run 31638592727](https://github.com/ajth-work/textplex/actions/runs/31638592727).
- The weekly audit failed on [run 31316398058](https://github.com/ajth-work/textplex/actions/runs/31316398058) because `/ready` returned a valid readiness payload that the reachability script expected to report as `status: ok`.
- Pages deployment failed on [run 31633676514](https://github.com/ajth-work/textplex/actions/runs/31633676514) with `Ensure GitHub Pages has been enabled` after the build and artifact upload passed.
- The GitHub auth health workflow had no recorded runs at audit time.

## Verification target

After the P0 changes are merged, require a successful PR CI run, a successful `main` Pages deployment, and a successful weekly audit before treating the Actions baseline as healthy.
