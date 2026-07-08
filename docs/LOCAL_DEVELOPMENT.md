# Local Development

This repo currently has a lightweight but real local-development baseline for the first TextPlex vertical slice.

## What issue 1 establishes

- a root web workspace command path
- a Windows-friendly local initialization script
- a root pytest discovery path for API and processor tests
- the first frozen database migration files
- one tiny public-domain test fixture set for processing experiments

## Bootstrap

### Windows PowerShell

```powershell
.\scripts\init_local.ps1
```

If PowerShell execution policy blocks local scripts, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init_local.ps1
```

### Bash

```bash
./scripts/init_local.sh
```

Both scripts create the local data directories and copy `.env.example` to `.env` if needed.

## Web app

Install and run from the repo root:

```powershell
npm install
npm run dev:web
```

Build the web app:

```powershell
npm run build:web
```

## API

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev] -e ../../packages/processor
uvicorn app.main:app --reload
```

## Tests

Run all current Python tests from the repo root after installing the API dev dependencies:

```powershell
python -m pytest
```

Run a narrower scope when iterating:

```powershell
python -m pytest tests/api
python -m pytest tests/processor
```

## Current fixture

The first legal/public-domain fixture lives under `tests/fixtures/books/alice-mini/`.

- It is a three-page excerpt set based on public-domain text from *Alice's Adventures in Wonderland*.
- It is intentionally tiny and text-only for now.
- It exists to support parser contracts, page ordering tests, and local experiments before real PDF import is implemented.

## Migration strategy

The first migration set lives under `apps/api/app/db/migrations/`.

- `book/0001_initial.sql` defines the initial portable book database schema.
- `user/0001_initial.sql` defines the initial learner profile schema.

Rules for now:

1. Add a new numbered SQL file for every schema change.
2. Never silently mutate existing databases in application code.
3. Keep book schema and learner schema migrations separate.
