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

After code changes that affect the running API or site shell, reboot both services before QA so the live preview reflects the current code.

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

## Commit & Pull Request Guidelines

Use short imperative commit messages, such as `Add reader shell scaffold` or `Define page-processing contract`. Keep commits scoped to one coherent change. When relevant, mention whether you verified the web app, API, processor tests, or data-contract assumptions.

When a request changes code, docs, tests, local data, or GitHub-tracked work, add a brief `CHANGELOG.md` note that captures the general change and date. Keep it high-level; the goal is to preserve a readable history of what changed, not to log every file touch.

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
