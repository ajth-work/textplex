# Changelog

## 2026-07-31

- Added night variants for Citrus Grove, Sunlit Meadow, and Seaside Garden with supplied fixed wallpaper assets, dark semantic palettes, swatches, browser colors, and separate `$1.99` pricing; expanded the Summer Editions bundle to six themes at `$8.99`.
- Added a global day/night theme toggle in the top-right corner of every page and a settings option to follow the device light/dark scheme.
- Shrunk the global day/night theme toggle to a small fixed icon button so it no longer stretches across the mobile viewport.
- Added viewport audit reference docs for device coverage, checklist criteria, and a reusable audit prompt.
- Added a Mobile S viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Mobile M viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Mobile L viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Tablet P viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Tablet L viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Laptop viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Fixed the API schema export list so Ruff no longer flags `ReadingHistoryPoint` as an unused import in CI.
- Reordered Python imports across the API, processor, and test tree to satisfy Ruff in GitHub Actions.
