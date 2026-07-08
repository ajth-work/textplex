# TextPlex Codex Skill

This document mirrors the local Codex skill you can keep for TextPlex-specific work.

Suggested install target:

`C:\Users\Andrew-John\.codex\skills\textplex\SKILL.md`

Use this file to recreate or update that local skill when working from a new machine or Codex environment.

## Skill Body

~~~markdown
---
name: textplex
description: Use when working on the TextPlex repo, reading pipeline, OCR/extraction contracts, book and learner SQLite schemas, Next.js reader UI, FastAPI endpoints, vocabulary exposure logic, or product documentation. This skill keeps Codex oriented to the local-first architecture, MVP boundaries, and the separation between book truth and learner truth.
---

# TextPlex

## Canonical Surfaces

- Repo path: `C:\Users\Andrew-John\Documents\TextPlex`
- Product vision blueprint: `Z:\My Comics\_Fixing Corruption\TextPlex_Product_Vision_and_System_Blueprint.pdf`
- Core docs:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - `docs/PROCESSING_CONTRACT.md`
  - `docs/MVP_BACKLOG.md`

Use the local TextPlex repo as the primary operating space. Treat the blueprint PDF as product-direction context, and treat the repo docs as the implementation source of truth unless the user says otherwise.

## Default Workflow

1. Work from the canonical repo path.
2. Read the relevant app, API, processor, and contract files before editing.
3. Keep changes tightly scoped to the requested TextPlex behavior.
4. Update docs when a change affects architecture, contracts, schema boundaries, or MVP scope.
5. Run the smallest meaningful verification for the area changed.
6. Build the web app before shipping reader/dashboard UI changes when feasible.
7. Do not treat placeholder scaffolding as product-complete behavior; wire contracts deliberately.

## Local Review

Preferred commands:

```powershell
npm install
cd apps/web; npm run dev
cd apps/web; npm run build
cd apps/api; python -m venv .venv
cd apps/api; .venv\Scripts\Activate.ps1
cd apps/api; pip install -e . -e ../../packages/processor
cd apps/api; uvicorn app.main:app --reload
cd apps/api; pytest
cd packages/processor; pytest
```

If a command cannot be run because dependencies are not installed yet, state that clearly and keep the verification summary honest.

## Core Product Rule

Book truth and learner truth are separate.

- A book database stores what exists in the book.
- A learner profile database stores what the reader has encountered, asked about, reviewed, or likely knows.

Do not store learner-specific progress state inside a portable book database.

## Processing And Data Rules

The first vertical slice is:

1. import a scanned PDF
2. split it into page images
3. extract and normalize text
4. store structured page/token data in a book database
5. serve reader-ready page payloads
6. record page-read events
7. update learner exposure and vocabulary progress

Keep processing results structured and validated before database writes. Preserve stable contracts between processor output, API payloads, and reader consumption.

## Security And Local Content

Treat source books, scans, OCR text, learner profile data, and generated SQLite databases as local-sensitive artifacts. Never commit private source material, personal learning history, or secrets. Keep provider credentials in environment variables or server-only configuration.

Never commit:

- `.env` or `.env.*` except `.env.example`
- `.venv/`
- `node_modules/`
- `.next/`
- generated content under `data/books/` or `data/user/`
- private PDFs, scans, extracted page images, or OCR output from real books

## Product Direction

TextPlex is for reading real books and building a measurable map of the language the learner knows. Prioritize reading flow, explainable assistance, vocabulary exposure tracking, and durable progress models. Avoid drifting into unfocused chat features, literary-analysis toys, or broad multi-language/platform expansion before the MVP reading loop is solid.
~~~
