# Repository Guidelines

Use this file for repo-level guidance that should apply to any Codex session in this workspace. Keep reusable, task-specific workflow detail in `SKILLS.md` or a more specific nested agent file.

## Project Structure & Module Organization

TextPlex is a local-first language-learning system built from a web reader, an API, and a processing package.

- `apps/web/` contains the Next.js reader, library, and dashboard UI.
- `apps/api/` contains the FastAPI service layer and future book/profile endpoints.
- `packages/processor/` contains the book-processing pipeline and shared processing contracts.
- `packages/shared/` is reserved for shared fixtures, schemas, and cross-runtime utilities.
- `docs/` contains the architecture, data model, processing contract, and MVP backlog.
- `data/books/` stores generated book databases and page assets; keep only placeholders in Git.
- `data/user/` stores learner-profile data; keep only placeholders in Git.
- `tests/` is reserved for API and processor coverage.

Default implementation work targets the Next.js app in `apps/web/` on port `3000`. Treat the standalone site on `8200` as a legacy reference shell only; do not change its source unless the task explicitly asks for GitHub Pages or legacy-compatibility work.

## App-wide UI inventory workflow

[`docs/COMPONENTS_INVENTORY.md`](docs/COMPONENTS_INVENTORY.md) is the canonical framework reference for the app's pages, regions, cards, panels, lists, and repeated item types. Agents making UI changes must:

1. Read the relevant inventory section before editing a page or component.
2. Use the existing stable inventory IDs in the implementation note, issue, QA report, or handoff.
3. Add or revise an inventory entry in the same change when a route or user-visible UI region/card is added, removed, renamed, or moved.
4. Keep live Next surfaces and their demo/preview counterparts mapped to the same IDs unless their layouts genuinely differ.
5. Link the affected inventory IDs to the owning tracker item in the inventory cross-reference and tracker note.
6. Mention the affected inventory IDs in the final change summary.

For a new card, assign a route-scoped ID such as `library.import-progress-card`, record its source path and purpose, and do not reuse a retired ID for a different purpose.

## Build, Test, and Development Commands

Install the web workspace dependencies from the repo root:

```powershell
npm install
```

Run the web app:

```powershell
cd apps/web
npm run dev
```

Run the API locally:

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e . -e ../../packages/processor
uvicorn app.main:app --reload
```

Run Python tests where they exist:

```powershell
cd apps/api
pytest
```

```powershell
cd packages/processor
pytest
```

Build the web app before shipping UI-affecting changes:

```powershell
cd apps/web
npm run build
```

After code changes that affect the running API or the Next app, reboot both services before QA so the live preview reflects the current code.

For dependency and environment maintenance, use `docs/UPDATE_REPAIR_CYCLE.md` and the root `maintenance:check`, `maintenance:repair`, and `maintenance:update` scripts. Run the read-only report before dependency work; use update mode only deliberately, review its lockfile diff, and do not treat a failed verification cycle as complete.

### Next build lock and warning hygiene

- If `npm run build:web` hangs or reports an `apps/web/.next/trace` access error, inspect `netstat -ano | Select-String ':3000'` and stop only the repo's Next process on port `3000`. Do not stop Docker's legacy `8200` shell or `8201` API processes.
- If npm reports `EPERM` while scanning `%LOCALAPPDATA%\npm-cache\_logs`, use a writable session cache before running checks: `$env:npm_config_cache = "$env:TEMP\textplex-npm-cache"`.
- Keep `npm run lint:web` warning-free. Use `next/image` for reader images and do not suppress the rule globally.
- Use Node 24 LTS for local, Docker, CI, and Pages work; older Node 18/20 runtimes are unsupported. Supabase Realtime may still emit a third-party dynamic-dependency warning, and root client components using `useSearchParams` must remain behind route-level `Suspense` boundaries.

## Coding Style & Naming Conventions

Use TypeScript and React patterns in `apps/web/`, and Python typing-first code in `apps/api/` and `packages/processor/`. Match surrounding formatting rather than reformatting unrelated code. Prefer descriptive camelCase for TypeScript symbols, snake_case for Python modules and functions, and clear noun-based names for schemas, services, and contracts.

Keep product language focused on reading fluency, vocabulary exposure, learner agency, and measurable progress. TextPlex should feel like a serious reading-and-learning system, not a gamified distraction layer.

## Testing Guidelines

Add or update tests when changing API contracts, processing payloads, token/exposure logic, SQLite schema behavior, or reader data shaping. Favor narrow test runs tied to the files you changed. For web changes, verify the page still loads in `apps/web` and that core reading flows remain intact.

If a change affects the book-processing pipeline or learner-state rules, verify both sides of the separation:

- book truth stays in the book database
- learner truth stays in the user profile database

## Security & Local Data

Do not commit `.env`, `.env.*` except `.env.example`, `.venv/`, `node_modules/`, `.next/`, generated SQLite databases, extracted page images, OCR output from private books, or personal learner data.

Treat source books, scans, OCR text, and learner history as sensitive local content. Keep secrets server-side only, and do not place API keys or provider credentials in browser code or committed fixtures.

## Audit Guardrails

The reusable audit procedure and current audit record are in [`docs/AUDIT.md`](docs/AUDIT.md). Use it as the source of truth for audit parameters, evidence, limitations, cadence, and result reporting.

### Verification before handoff

- Do not report backend work as complete while the API or processor suite has failures.
- Run `apps/api/.venv/Scripts/python.exe -m pytest -q` on Windows after API or processor changes, plus focused tests while iterating.
- Run `npm run test:site`, `npm run build:web`, and `git diff --check` for site or web changes.
- `npm run lint:web` must be non-interactive. If it prompts for ESLint setup, fix the configuration before handoff.
- Run the relevant site tests and web checks before considering GitHub Pages deployment work complete.
- Record the branch, commit, runtime versions, and dirty-worktree state before auditing; preserve and classify existing changes.
- Use declared dependency installation in a disposable environment for clean audits. Treat stale virtualenv passes or skipped required fixtures as insufficient evidence.
- Run live checks on audit-owned ports and processes. Do not infer route reachability from a static file fetch or reuse an unknown service already bound to the port.
- Record warnings and known limitations separately from passes. A local workflow review is not a substitute for a successful CI run.
- The Sunday workflow in `.github/workflows/weekly-audit.yml` is automated evidence, not a replacement for human review of new security boundaries, configuration, warnings, or sensitive-data handling.

### Python test isolation and dependencies

- Prefer function-scoped fixtures for mutable API state.
- Do not share `app.state.data_root`, registries, SQLite files, or other persistent state across tests unless the fixture restores it.
- After dependency changes, verify the project from a fresh virtual environment.
- Keep runtime dependencies in `pyproject.toml`; do not rely on Dockerfiles alone to install them.

### API security boundaries

- Decide whether every new endpoint is local-only, authenticated, or intentionally public before implementation.
- Never accept arbitrary server filesystem paths from network clients without approved-root validation.
- Keep production CORS allowlists explicit. Do not use `null` or broad private-network regexes by default.
- Add upload size, page-count, and resource limits, and clean temporary upload data after failed imports.
- Treat delete, archive, settings, profile, and learning-event endpoints as protected mutations when network-reachable.

### Configuration and storage

- Every documented environment variable must be read by application code and covered by a configuration test.
- Storage paths must honor `BOOK_DATA_DIR` and `USER_DATA_DIR` rather than silently falling back to repository paths.
- Do not add configuration only to Docker Compose or `.env.example`.
- When an audit identifies a new recurring failure mode, add a regression test and update `docs/AUDIT.md`; add a guardrail here only when it applies broadly to future agent sessions.

### Issue and tracker discipline

- Do not close or mark an implementation issue complete while required tests are red.
- Check for an existing issue before creating a duplicate regression or audit issue.
- Keep `docs/ISSUE_TRACKER.md`, GitHub issues, and `CHANGELOG.md` synchronized when work changes repository or tracker state.

## Commit & Pull Request Guidelines

Use short imperative commit messages, such as `Add reader shell scaffold` or `Define page-processing contract`. Keep commits scoped to one coherent change. When relevant, mention whether you verified the web app, API, processor tests, or data-contract assumptions.

When a request changes code, docs, tests, local data, or GitHub-tracked work, add a brief `CHANGELOG.md` note that captures the general change and date, and add a short matching comment in the related issue, kanban item, or PR when one exists.

If a task or issue is added to the GitHub project kanban, update the matching entry in `docs/ISSUE_TRACKER.md` in the same change. If `docs/ISSUE_TRACKER.md` is updated, make the corresponding kanban change as well. Treat the two as mirrored views and keep titles, statuses, and scope aligned.

## Codex Agent Configuration: Token Optimization Protocol

### 1. System Communication Rules

- Be terse and practical.
- Prefer diffs and targeted snippets over rewriting whole files.
- Do not explain code unless the user asks or the change has a non-obvious risk.

### 2. Command & Tool Execution Rules

- Limit command output to the useful lines.
- Prefer focused test runs over broad suites when a smaller scope is enough.
- Prefer targeted file or symbol search over broad recursive reads.
- In PowerShell, use native truncation and filtering rather than Unix-specific examples.

### 3. Context & Codebase Scanning Rules

- Read only the files directly related to the active task.
- Use docs and contracts as the source of truth before inferring behavior.
- Stop and regroup if a command produces an unexpectedly massive wall of output.

## Codex Skill

The local TextPlex workflow skill is documented in `SKILLS.md`. Use it as the source of truth for recreating or updating a personal Codex skill for this repo.
