# Changelog

All notable changes to TextPlex are recorded here.

## Unreleased

### 2026-07-16

#### Added

- `9de3d6d` - Added processing pipeline contracts across the API, processor, and shared schema layers.
  - Expanded book extraction and OCR plumbing.
  - Added/updated tests for extraction and OCR configuration behavior.
  - Kept the book-record and learner-profile boundaries aligned in the shared contracts.

- `7cabb4c` - Added reader profile and live surface work.
  - Introduced the reader profile surface and related UI state.
  - Expanded live web app reader and dashboard surfaces.
  - Added reader analytics notes to frame the new profile metrics.

- `f5676e7` - Updated static site previews and tests.
  - Expanded the `site/` preview shell and route behavior.
  - Added the profile preview and wider preview styling.
  - Added and updated preview tests for the static reader, home, wide layout, and profile surfaces.

#### Validation

- `node --test tests/site/preview-router.test.js`
- `npm run build:web`
