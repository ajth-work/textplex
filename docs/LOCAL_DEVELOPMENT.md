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

From the library page, the `Upload PDF` button lets you send a local PDF directly into TextPlex through the browser.

Smoke-check the live reader and the API rewrite after the server is running:

```powershell
npm run check:web
```

By default the smoke test checks both `http://127.0.0.1:8200` and the current ZeroTier address `http://192.168.192.231:8200`. If your ZeroTier IP changes, override it with:

```powershell
$env:TEXTPLEX_WEB_BASE_URLS="http://127.0.0.1:8200,http://YOUR-ZEROTIER-IP:8200"
npm run check:web
```

### Canonical local stack

Run the browser-facing site shell and processor API together:

```powershell
docker compose up --build site api
```

Then inspect:

- `http://127.0.0.1:8200/`
- `http://127.0.0.1:8201/health`
- `http://192.168.192.231:8200/` from another device on the LAN

The legacy Docker Next.js app is not part of the default preview stack.

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

The lexicon import endpoint defaults to that bundled source, so a normal import call only needs the language and overwrite flag if you want to refresh the local lookup database.

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
