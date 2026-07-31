# Video Platform Subtitle Reader Extension Concept

## Summary

TextPlex could extend its learner-profile model to support reading help on major video platforms with subtitles. The idea is a Chrome extension that reads the subtitle track for the current video, applies the same kind of language support the reader uses in the app, and shows that support inline or in a side panel while the video plays.

The extension would not replace the video platform. It would sit beside it as a lightweight reading aid for subtitle-driven listening practice.

## Why This Fits TextPlex

TextPlex already tracks learner truth separately from book truth. That same separation can work for subtitle content:

- subtitle text is transient source content
- learner profile data stays in the profile store
- exposures, saves, and lookups still update the learner model

That means the same support logic can be reused for books, imported text, and subtitle tracks without turning the video itself into the source of record.

## Core Idea

When the user opens a supported video platform with subtitles available, the extension could:

1. detect the active subtitle language
2. fetch or read the subtitle track for the current video
3. pre-process the subtitle text before playback or as soon as the track loads
4. generate reading support based on the learner profile
5. render that support in a compact reader-style panel

The support should feel familiar to the existing TextPlex reader:

- token or word highlighting
- quick gloss / dictionary lookup
- pronunciation or transliteration where relevant
- sentence-level navigation or replay hooks
- progress and exposure tracking tied to the learner profile

## Suggested User Flow

1. The user opens a supported video platform and turns on subtitles.
2. The extension recognizes the video, platform, and subtitle language.
3. The extension asks TextPlex for a support bundle scoped to that subtitle track.
4. TextPlex returns reading aid data based on the learner profile and the subtitle text.
5. The extension overlays the current subtitle with support cues or opens a side panel with the same kind of assistance the reader app provides.

## What The Extension Should Do

- Read the subtitle file or active caption track for the current video.
- Segment subtitles into sentence-like chunks where possible.
- Reuse the learner profile to choose support intensity.
- Show light support for familiar content and stronger support for new or difficult lines.
- Record new exposures or saved items back into the learner profile.
- Preserve provenance so the user can tell whether support came from the subtitle text, a dictionary fallback, or a learned-item match.

## What It Should Not Do

- It should not store YouTube content as permanent book truth.
- It should not require a fully separate learner profile for video use.
- It should not depend on browser-side secrets or private credentials.
- It should not become a general video downloader or transcript scraper beyond the learning use case.

## Data Flow Sketch

1. Extension reads current video and caption metadata.
2. Extension sends a subtitle snapshot plus language context to the TextPlex API or local support service.
3. The service combines subtitle text with learner profile state.
4. The service returns a support payload:
   - tokenization or segmentation
   - vocabulary hints
   - hover/definition metadata
   - pronunciation or reading aids
   - progress or exposure updates
5. Extension renders the payload in a video-aware reader panel.

## Likely MVP

The first version should be small:

- one subtitle language at a time
- support in a side panel rather than deep page rewriting
- sentence-level glossing and vocabulary lookup
- learner-profile-aware highlighting
- basic exposure logging

That would prove the workflow without forcing a full YouTube UI redesign.

## Open Questions

- Should the extension read captions from the live DOM, the platform transcript panel, or an exported subtitle source?
- Should support happen locally in the extension first, or should the extension call the existing TextPlex API?
- Should subtitle sessions create a temporary study session, or map directly to the learner profile?
- How much of the existing reader chrome should be reused versus simplified for video playback?
- Do we want live replay-aware support, or just static subtitle preprocessing at load time?

## Risks

- Platform UIs can change, so DOM-driven approaches may be fragile.
- Subtitle availability varies by video and language.
- Over-processing every line could create lag during playback.
- The product can drift into a generic video tool if the scope is not kept anchored to reading support and learner progress.

## Related Repo Areas

- `docs/DATA_MODEL.md`
- `docs/PROCESSING_CONTRACT.md`
- `docs/COMPONENTS_INVENTORY.md`
- `apps/web/`
- `apps/api/`
- `packages/processor/`
