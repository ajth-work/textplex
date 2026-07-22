# Frontend Migration Phase 4

Status: In progress  
Started: 2026-07-21  
Parent: Frontend consolidation issue  
Depends on: [Phase 3](FRONTEND_MIGRATION_PHASE_3.md)

## Scope

Phase 4 makes the Next.js application the canonical browser-facing TextPlex product and gives the standalone HTML application an explicit compatibility boundary. This is a deployment and routing phase, not a new reader feature phase.

The target local topology is:

| Surface | Port | Role |
| --- | --- | --- |
| Next.js web app | `3000` | Canonical product entry point for local Docker/browser use |
| FastAPI processor/API | `8201` | API and processing service used by the canonical web app |
| Standalone site | `8200` | Explicit legacy/preview compatibility surface and GitHub Pages source |

The standalone site remains available while the cutover is verified. It must not remain an undocumented second canonical product.

## Objectives

- Add the Next.js web service to the default Docker/browser workflow.
- Make `3000` the one documented browser-facing product port for the local application stack.
- Keep `8201` as the documented API port and update API CORS configuration for the Next origin.
- Keep the static site available through GitHub Pages and an explicit legacy/preview workflow without making it the default local product.
- Preserve an intentional route from the current product/profile surface to the legacy shell where users still need the original UI.
- Verify import-to-reader-to-progress in Next without requiring a browser switch to `8200`.
- Add route reachability and parity checks for the canonical Next entry point.
- Update README, local-development, component-inventory, and agent workflow documentation to describe the final topology and reboot requirements.
- Define a rollback path that can restore the standalone browser surface without deleting compatibility code.

## Work Items

- [x] Add a `web` service to `docker-compose.yml` using the Node 24 Next image.
- [x] Make the default Compose workflow expose Next on `3000` and API health on `8201`.
- [x] Move the standalone service behind an explicit `legacy` or `preview` Compose profile while retaining the GitHub Pages artifact workflow.
- [x] Align development environment examples, API CORS defaults, route checks, and browser-facing URLs.
- [x] Add canonical Next route reachability and deployment contract coverage for the app shell and migrated route set.
- [ ] Verify the import-to-reader-to-progress flow against the Next service with a running API.
- [ ] Add and document the legacy entry link without duplicating canonical navigation state.
- [x] Update deployment and local-development documentation; update the component inventory cross-reference after the route boundary is finalized.
- [ ] Run the update/repair cycle and record the final runtime, build, lint, API, route, and Docker evidence.

## Affected Inventory IDs

- `home`
- `library`
- `book-detail`
- `reader`
- `analysis`
- `import`
- `search`
- `progress`
- `profile`
- `study`
- `activity`
- `roadmap`
- `preview.home.continue-rail`
- `preview.home.recent-analyses`
- `preview.vocabulary`

## Exit Criteria

Phase 4 is complete when:

1. `docker compose up --build` starts the canonical Next app and API without requiring the standalone site for normal product use.
2. `http://127.0.0.1:3000` is the single documented browser-facing product entry point, and `http://127.0.0.1:8201/health` is the documented API check.
3. A user can complete import, extraction progress, reading, vocabulary save, and progress inspection without switching ports.
4. Next route checks cover the canonical routes and do not resolve missing records through seeded fallback content.
5. API CORS, environment examples, Docker configuration, README, local-development guidance, and the components inventory agree on the same topology.
6. The standalone site remains deployable to GitHub Pages and is reachable only as an explicitly labeled legacy/preview compatibility surface.
7. The legacy boundary has a documented rollback procedure and does not share mutable learner state implicitly with the Next app.
8. Node 24 web build/lint, API and processor tests, static compatibility tests, canonical route tests, live reachability checks, and `git diff --check` pass.

## Current Slice Evidence

The deployment-boundary slice is verified: the Next Docker build passed, the canonical `3000` route set and API health passed live checks, the legacy `8200` route set remained reachable, and an API CORS preflight accepted `http://127.0.0.1:3000`. Import-to-reader progression and the explicit legacy navigation link remain open work items.

## Non-goals

- Removing the standalone site or GitHub Pages compatibility before the cutover evidence is green.
- Rewriting the FastAPI processor or changing book/profile data ownership.
- Adding new commerce functionality beyond preserving the existing theme-store prototype.
- Treating a successful static-site test as evidence that the Next deployment is canonical.
