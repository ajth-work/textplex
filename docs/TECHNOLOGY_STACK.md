# TextPlex Technology Stack

This is the repository's technology-stack source of truth. It records the tools used by TextPlex and the version or version constraint currently declared by the project.

**Last verified:** 2026-07-22  
**Canonical version sources:** `package.json`, `apps/web/package.json`, `package-lock.json`, Python `pyproject.toml` files, Dockerfiles, `.nvmrc`, `docker-compose.yml`, CI workflows, and `supabase/config.toml`.

## System shape

| Area | Technology | Current version / constraint | Role | Source |
| --- | --- | --- | --- | --- |
| Canonical web app | Next.js App Router | `16.2.11` | Reader, library, dashboard, auth, and hosted product UI | `apps/web/package.json` |
| Web UI | React | `18.2.0` | Component rendering | `apps/web/package.json` |
| Static compatibility site | HTML, CSS, and browser JavaScript | No package version; repository source | GitHub Pages and explicit legacy/preview surface | `site/` |
| API | FastAPI | Unpinned; Python package install resolves the current environment | HTTP API and service boundary | `apps/api/pyproject.toml` |
| Book processor | Python package | `>=3.11` | PDF/page processing, extraction, tokenization, and enrichment | `packages/processor/pyproject.toml` |
| Book storage | SQLite | Runtime-provided; no application version pin | Separate per-book databases and page assets | `apps/api/app/`, `packages/processor/`, `docs/DATA_MODEL.md` |
| Learner storage | SQLite | Runtime-provided; no application version pin | Separate user profile database and learning events | `apps/api/app/services/learning_profile.py` |
| Hosted identity/data | Supabase Auth, Postgres, Storage, and Realtime | Supabase CLI `^2.109.1`; local Postgres major version `17` | Account identity and user-owned hosted profile/settings | `package.json`, `supabase/config.toml` |
| OCR integration | OpenAI Responses API | Model default `gpt-5.4-mini`; API is called through Python standard-library HTTP | Optional page OCR provider | `apps/api/app/services/ocr.py` |

## Supported runtimes and delivery

| Tool | Current version / constraint | Notes |
| --- | --- | --- |
| Node.js | `24` / Node 24 LTS | Required for local development, Docker, CI, Pages checks, and dependency maintenance. Defined by `.nvmrc`, Dockerfiles, and workflows. |
| Python | `>=3.11` | Required by the API and processor packages and used by CI. |
| Docker web image | `node:24-bookworm-slim` | Builds and runs the canonical Next.js app on port `3000`. |
| Docker API image | `python:3.11-slim` | Runs Uvicorn on container port `8000`, published as `8201`. |
| Docker site image | `node:24-slim` | Runs the static compatibility site on port `8200`. |
| Docker Compose | Compose file format supported by installed Docker Compose | Orchestrates `web`, `api`, and the opt-in `legacy` `site` service. |
| GitHub Actions | `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4` | CI and weekly audit. |
| GitHub Pages actions | `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` | Publishes the static `site/` shell. |

## Web dependencies

### Runtime dependencies

| Package | Version / constraint | Purpose |
| --- | --- | --- |
| `next` | `16.2.11` | React framework and App Router runtime |
| `react` | `18.2.0` | UI runtime |
| `react-dom` | `18.2.0` | Browser DOM renderer |
| `@supabase/supabase-js` | `2.109.0` | Browser Supabase Auth/session client |

### Development and build dependencies

| Package | Version / constraint | Purpose |
| --- | --- | --- |
| `typescript` | `5.4.5` | Static typing and compilation |
| `eslint` | `9.39.5` | JavaScript/TypeScript linting |
| `eslint-config-next` | `16.2.11` | Next.js lint rules |
| `postcss` | `^8.5.21` | CSS processing |
| `sharp` | `^0.35.3` | Next image processing |
| `@types/node` | `18.19.36` | Node.js TypeScript types |
| `@types/react` | `18.2.66` | React TypeScript types |
| `@types/react-dom` | `18.2.22` | React DOM TypeScript types |
| `supabase` | `^2.109.1` | Supabase CLI package |
| npm | Lockfile version `3` | Dependency installation and workspace scripts |

The root `package-lock.json` is authoritative for the resolved npm dependency tree. Direct dependencies should be listed here; transitive packages do not need individual entries unless they become an architectural dependency.

## API and processor dependencies

The Python project files intentionally use several unpinned dependencies today. The constraint shown below is the project declaration, not a promise that every environment resolves to the same patch version.

| Package | Version / constraint | Used by | Purpose |
| --- | --- | --- | --- |
| `fastapi` | Unpinned | API | HTTP API framework |
| `uvicorn[standard]` | Unpinned | API | ASGI server |
| `pydantic` | `>=2` | API and processor | Request, response, and processing contracts |
| `python-multipart` | Unpinned | API | Multipart book uploads |
| `pypdf` | Unpinned | API | Embedded PDF text extraction and PDF handling |
| `pymupdf` | Unpinned | API | PDF rendering and page extraction |
| `pillow` | Unpinned | API and processor | Page/image processing |
| `jieba` | `>=0.42.1` | Processor and API image | Chinese tokenization |
| `pytest` | Dev-only, unpinned | API and processor | Python tests |
| `ruff` | Dev-only, unpinned | API and processor | Python linting |
| `mypy` | Dev-only, unpinned | API and processor | Optional static type checking |

The API and processor are installed together during local development and CI with editable installs. Docker installs the runtime dependencies in `apps/api/Dockerfile`; keep that file and the Python project declarations synchronized when changing the stack.

## Data and external services

| Technology | Current version / constraint | Notes |
| --- | --- | --- |
| SQLite | Python `sqlite3` runtime | Book truth and learner truth remain in separate SQLite databases. SQLite FTS5 is the planned/search contract described by the repository docs. |
| Supabase Auth | Supabase project service; client `2.109.0` | Email/password account and session boundary. The FastAPI API validates bearer tokens through Supabase HTTP endpoints. |
| Supabase Postgres | Local major version `17` | Hosted profile/settings schema and ownership RLS foundation. |
| Supabase Storage | Supabase project service | Configured in local Supabase; intended for hosted user-owned book/page storage. |
| Supabase Realtime | Enabled in local Supabase config | Available for future realtime product behavior. |
| OpenAI Responses API | API endpoint `/v1/responses`; default OCR model `gpt-5.4-mini` | Optional OCR path. No OpenAI Python SDK is declared; the API uses the standard library HTTP client. |

## Versioning and upgrade procedure

When upgrading a runtime, framework, library, image, action, database major version, or external model:

1. Update the actual declaration, lockfile, image tag, workflow, or environment example that controls it.
2. Update the matching row in this file in the same change.
3. Update **Last verified** and note any compatibility boundary or migration requirement.
4. Run the relevant verification gates: Python tests for API/processor changes; `npm run test:site`, `npm run build:web`, `npm run lint:web`, and `git diff --check` for web/site changes.
5. Add a brief entry to `CHANGELOG.md` for the upgrade.

Do not convert an unpinned Python dependency into an exact version in this document unless the project declaration or a reproducible lock mechanism is updated as well. If the declared version and installed environment differ, the declaration and lockfile remain canonical and the difference should be recorded as drift.

## Current environment note

The supported project baseline is Node 24, but the shell used for this inventory reported Node `18.15.0`; this is local environment drift and should be corrected before Node-based builds or upgrades. The existing API virtual environment reported Python `3.11.2` and currently installed versions of FastAPI `0.139.0`, Uvicorn `0.50.2`, Pydantic `2.13.4`, pypdf `6.14.2`, PyMuPDF `1.28.0`, Pillow `12.3.0`, and jieba `0.42.1`. Those installed values are informational only because the Python dependencies are not fully pinned.

## Source references

- [Root package manifest](../package.json)
- [Web package manifest](../apps/web/package.json)
- [Python API manifest](../apps/api/pyproject.toml)
- [Processor manifest](../packages/processor/pyproject.toml)
- [Node version marker](../.nvmrc)
- [Container definitions](../docker-compose.yml)
- [Supabase local configuration](../supabase/config.toml)
- [Architecture overview](ARCHITECTURE.md)
