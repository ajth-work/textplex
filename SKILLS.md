# TextPlex Codex Skill

This file mirrors the local `textplex` skill. Use it for repeatable TextPlex workflow guidance; use `AGENTS.md` for repo-level policy and commands.

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

## Purpose

Use this skill for repeatable TextPlex workflows and implementation habits. For repo-wide conventions, commands, and PR expectations, follow `AGENTS.md`.

## Canonical Surfaces

- Repo path: `C:\Users\Andrew-John\Documents\TextPlex`
- Product vision blueprint: `Z:\My Comics\_Fixing Corruption\TextPlex_Product_Vision_and_System_Blueprint.pdf`
- Core docs:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - `docs/PROCESSING_CONTRACT.md`
  - `docs/MVP_BACKLOG.md`
  - `docs/COMPONENTS_INVENTORY.md`

Use the local TextPlex repo as the primary operating space. Treat the blueprint PDF as product-direction context, and treat the repo docs as the implementation source of truth unless the user says otherwise.

## Workflow

1. Read the relevant app, API, processor, and contract files before editing.
2. Keep changes tightly scoped to the requested TextPlex behavior.
3. Keep book truth and learner truth separate.
4. When a request changes code, docs, tests, local data, or GitHub-tracked work, add a brief `CHANGELOG.md` entry that summarizes the general change and date.
5. Run the smallest meaningful verification for the area changed.
6. Build the web app before shipping reader/dashboard UI changes when feasible.
7. Do not treat placeholder scaffolding as product-complete behavior; wire contracts deliberately.
8. For UI changes, use and update the stable IDs in `docs/COMPONENTS_INVENTORY.md`.
9. For dependency work, use `docs/UPDATE_REPAIR_CYCLE.md`: report drift first, update deliberately, and verify the repaired environment before handoff.

## When This Skill Fits

- Reader and library UI changes
- FastAPI endpoint and schema updates
- Processor contracts, tokenization, extraction, or OCR work
- Learner profile and exposure logic
- Documentation updates tied to TextPlex behavior

## Local-Sensitive Content

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
