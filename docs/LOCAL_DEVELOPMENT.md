# Local Development

This repo currently has a lightweight but real local-development baseline for the first TextPlex vertical slice.

Use Node.js 24 LTS for the web workspace and site checks. The repository `.nvmrc`, Docker images, CI, and Pages workflow all target this runtime.

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

### Supabase authentication

The live web app reads `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `apps/web/.env.local`. The API reads
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the API environment. These
values identify the Supabase project; never put a Supabase secret/service key in
browser-exposed variables.

The first account migration is tracked under `supabase/migrations/`. After
linking the CLI to the hosted project, validate pending schema changes with:

```powershell
npx supabase db push --dry-run
```

The account route is available at `/auth`. It supports email/password sign-up,
sign-in, email confirmation redirects, and password reset requests. The API
identity check is available at `/auth/me` and validates the bearer token with
Supabase Auth.

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

From the library page, the `Upload PDF` button lets you send a local PDF directly into TextPlex through the browser.

Smoke-check the canonical Next reader and API after the stack is running:

```powershell
npm run check:web
```

By default the smoke test checks `http://127.0.0.1:3000` and `http://127.0.0.1:8201/health`. To check the legacy shell instead, override the web URL:

```powershell
$env:TEXTPLEX_WEB_BASE_URLS="http://127.0.0.1:8200"
npm run check:web
```

### Canonical local stack

Run the canonical Next browser app and processor API together:

```powershell
docker compose up --build
```

Then inspect:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:8201/health`

The standalone shell remains available through the explicit `legacy` profile:

```powershell
docker compose --profile legacy up --build site api
```

Open `http://127.0.0.1:8200/` only when testing the GitHub Pages/legacy compatibility surface.

## API

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev] -e ../../packages/processor
uvicorn app.main:app --reload
```

From the repo root, you can also start the API with:

```powershell
scripts\start_api_dev.cmd
```

To register the bundled Alice fixture, POST this payload to `/books/import` while the API is running. It points at the checked-in text fixture under `tests/fixtures/books/alice-mini/` and generates three prepared pages locally:

```json
{
  "source_path": "tests/fixtures/books/alice-mini",
  "language_code": "en",
  "page_start": 1,
  "page_count": 3
}
```

After import, `GET /books/{book_id}` shows page-splitting status and `GET /books/{book_id}/pages` returns the deterministic page manifest.

To extract structured text for the same fixture, POST this payload to `/books/{book_id}/extract`:

```json
{
  "page_start": 1,
  "page_count": 3
}
```

The processor writes `book-extraction.json` plus one normalized page artifact per page under `data/books/<book_id>/extractions/`.

`GET /books/{book_id}/extractions` returns the structured summary back to the caller.

`GET /books/{book_id}/pages/{page_number}` returns the reader payload for one prepared page, including the image URL and the page-level extraction artifact when available.

`GET /books/{book_id}/pages/{page_number}/image` streams the prepared page image for the reader UI.

## Bundled lexicon source

TextPlex now vendors the Chinese reference sets locally under:

```text
resources/lexicon/chinese-character-recognition/
```

The lexicon import endpoint defaults to the language-specific source root for the requested language. For Chinese, that still points at the bundled reference set above. For future language packs, the importer also recognizes a canonical `lexicon.sqlite3` or `lexicon.csv` in `resources/lexicon/<language>/`.

Example:

```json
{
  "language_code": "zh",
  "replace_existing": true
}
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
- It is intentionally tiny and text-only, but the importer now renders page images locally so the reader can use it end to end.
- It exists to support parser contracts, page ordering tests, and local experiments without needing the external `Z:` drive sample.

## Migration strategy

The first migration set lives under `apps/api/app/db/migrations/`.

- `book/0001_initial.sql` defines the initial portable book database schema.
- `user/0001_initial.sql` defines the initial learner profile schema.

Rules for now:

1. Add a new numbered SQL file for every schema change.
2. Never silently mutate existing databases in application code.
3. Keep book schema and learner schema migrations separate.
