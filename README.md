# TextPlex

> Read real books. Build a measurable map of the language you know.

TextPlex turns scanned foreign-language books into structured learning databases, then uses a reader application to connect reading behavior with vocabulary exposure, proficiency levels, and long-term language progress.

## Product identity

- **Product:** TextPlex
- **Repository:** `textplex`
- **Web app:** `textplex-web`
- **API:** `textplex-api`
- **Processor:** `textplex-processor`
- **Core loop:** scanned book → structured book database → assisted reading → exposure ledger → learner profile

A local-first language-learning reader that converts scanned books into structured learning databases, then uses those databases to power reading assistance, exposure tracking, and progress analytics.

## Product loop

`PDF/images -> page processing -> book database -> reader -> reading events -> user language profile`

## MVP boundary

The first release supports one language at a time and proves five things:

1. Import a scanned PDF.
2. Split it into ordered page images and extract text.
3. Build a structured SQLite database for the book.
4. Read the processed book in a simple text-first reader with tap-to-define behavior.
5. Track page reads and vocabulary exposure in a separate user profile database.

AI book chat, literary analysis, spaced repetition, multi-language support, and image-overlay bounding boxes are post-MVP.

## Repository layout

```text
apps/
  web/                 # Next.js reader + library + dashboard
  api/                 # FastAPI HTTP API
packages/
  processor/           # PDF/page processing, extraction, enrichment
  shared/              # Shared contracts and fixtures
data/
  books/               # Generated book databases and page assets; gitignored
  user/                # User profile database; gitignored
docs/
  ARCHITECTURE.md
  DATA_MODEL.md
  MVP_BACKLOG.md
  PROCESSING_CONTRACT.md
scripts/
  init_local.sh
```

## Recommended stack

- Web: Next.js App Router + TypeScript
- API: FastAPI + Pydantic
- Processing: Python
- Storage: SQLite per processed book, plus one separate user profile SQLite database
- Search: SQLite FTS5 for sentence/page retrieval
- AI integration: isolated behind a provider interface; structured extraction results are validated before database writes

## Local bootstrap

### PowerShell

```powershell
.\scripts\init_local.ps1
npm install
```

### Bash

```bash
./scripts/init_local.sh
npm install
```

See `docs/LOCAL_DEVELOPMENT.md` for the current local workflow, fixture set, and migration strategy.

## Local development target

### API

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e .[dev] -e ../../packages/processor
uvicorn app.main:app --reload
```

### Web

```powershell
npm run dev:web
```

### Docker Desktop preview

If you want the full reader in a browser with the API and web app running together, use Docker Desktop:

```powershell
docker compose up --build
```

Then open:

- [Library](http://127.0.0.1:3000/library)
- [Sample reader](http://127.0.0.1:3000/reader/book-bbd944eb715e/8)

### Tests

```powershell
python -m pytest
```

## First vertical slice

Build this exact path before expanding scope:

1. `POST /books/import` registers a book and source PDF.
2. Processor creates page images and page records.
3. Processor writes cleaned text and token occurrences.
4. `GET /books/{book_id}/pages/{page_number}` returns reader data.
5. `POST /reading/page-read` records a completed read.
6. Exposure updater increments vocabulary progress.
7. Dashboard displays book progress and vocabulary-state counts.

## Core design rule

Book truth and learner truth are separate.

- A **book database** stores what exists in the book.
- The **user profile database** stores what the learner has encountered, requested help with, and likely knows.

Do not store personal learning state inside a portable book database.
