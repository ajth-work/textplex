# Image Reading and Scene Import Concept

## Summary

TextPlex could turn photographs into language-learning material while preserving the visual context that made the text meaningful. The concept has two connected modes:

1. **Image reading:** an interactive viewer that identifies text regions in a photograph and connects each region to pronunciation, definition, translation, and vocabulary support.
2. **Camera-to-reading import:** a camera workflow that captures one or more pages, processes them in order, and creates a durable TextPlex reading item.

The first mode is especially useful for street signs, storefronts, menus, posters, and pamphlets. The second is useful when a learner wants to photograph several pages and continue reading them inside TextPlex.

The primary entry point should be the existing **Import panel**. Image capture and image upload belong alongside paste, PDF, and EPUB import rather than being hidden inside the Reader. After processing, the learner can open the resulting page or scene in the Reader and switch to the annotated image view.

## Why this fits TextPlex

TextPlex is built around reading real language in context. A photograph of a Seoul street, a Japanese shop sign, or a Korean menu is not just an OCR source: it is evidence of where the learner encountered the language. Keeping the image beside the extracted text makes the resulting reading material more memorable and gives the learner a way to verify uncertain OCR.

This extends the existing import and reader pipeline without changing the separation between:

- **Book truth:** the original image, detected regions, OCR text, page order, and processing metadata.
- **Learner truth:** saved vocabulary, exposure events, pronunciation preferences, and reading progress.

## Primary use cases

### Street-sign and storefront photos

A learner photographs a street scene containing several business signs. TextPlex detects each independent sign, draws a boundary or callout marker, and lets the learner inspect each one separately.

The viewer should support:

- multiple text regions in one image
- vertical and horizontal writing
- right-to-left and left-to-right scripts where applicable
- mixed scripts in the same scene
- perspective distortion, glare, decorative fonts, and partial occlusion
- grouping characters or words into the sign or phrase they belong to

For example, a single Seoul photo might contain ten Korean storefront signs. Each sign can receive a numbered marker and a side-panel explanation without flattening the whole photo into one ambiguous paragraph.

### Pamphlets, menus, and posters

A learner uploads an image with text arranged in columns, blocks, labels, or unusual positions. TextPlex detects whether the image behaves more like a document or a scene and chooses an appropriate reading layout.

The learner should be able to switch between:

- the original image with annotations
- reconstructed reading order
- extracted text with normal TextPlex reader behavior

### Multi-page camera import

A learner photographs a menu, handout, or several pages of a document. Each photo is added to the same import session in sequence. TextPlex processes each image independently, then combines the results into an ordered multi-page reading item.

Each page should retain:

- the original image
- extracted text and layout regions
- OCR confidence or review flags
- page number and import order
- processing status and any recoverable errors

## Suggested user flow

1. The learner opens the **Import panel** and chooses **Camera or image import**.
2. The learner captures an image, uploads one, or starts a batch for several pages.
3. For camera import, the learner captures the first image and may add more before finishing.
4. TextPlex shows a thumbnail strip so the learner can reorder, remove, or retake pages before processing.
5. The service detects the image type: document page, sign/scene, or mixed layout.
6. OCR and layout extraction run per image. A failed page can be retried without losing the rest of the batch.
7. TextPlex presents a processing review with page previews, extracted text, and low-confidence regions.
8. The learner confirms the import and chooses a title, target language, and optional collection.
9. The resulting item opens in the Reader, with the image available as a page view and the extracted text available for normal reading support.

## Image viewer experience

The viewer should make the relationship between visible text and language help explicit:

- draw a subtle bounding box around each detected region
- connect the region to a numbered callout or side-panel card
- highlight the image region when the learner selects a word or phrase in the card
- highlight the corresponding card when the learner taps text on the image
- show original text, pronunciation, definition, translation, and audio where available
- distinguish uncertain OCR with a review indicator rather than silently presenting it as certain
- allow the learner to correct a region or its text before saving vocabulary

The interaction should remain useful on mobile. On narrow screens, callouts can become a bottom sheet or an ordered list while preserving the image-to-region relationship.

## Processing pipeline

```text
Image or camera batch
        |
        v
Image validation and normalization
        |
        v
Document/scene classification
        |
        v
Text-region detection and reading-direction detection
        |
        v
OCR and layout extraction per region
        |
        v
Region grouping and reading-order reconstruction
        |
        v
Language identification and tokenization
        |
        v
Pronunciation, definition, and translation enrichment
        |
        v
Reviewable page or scene artifact
        |
        v
Reader import and learner-state events
```

The processing contract should preserve region coordinates, orientation, detected language, source image dimensions, extracted text, confidence, and the relationship between regions and reconstructed text. A plain text result is not sufficient for the image viewer.

## Data model sketch

Book/page truth would likely need entities or payloads equivalent to:

- image asset and dimensions
- ordered page within an import batch
- detected layout type: `document`, `scene`, or `mixed`
- text region coordinates and orientation
- region grouping and reading-order links
- OCR text, normalized text, detected language, and confidence
- processing warnings and manual corrections
- optional region-to-token mapping for reader lookup

Learner interactions should remain separate and include:

- saved vocabulary from an image region or token
- image-region exposure events
- page or batch reading progress
- learner corrections or “OCR is wrong” reports
- pronunciation and explanation preferences

## MVP recommendation

Start with a camera-to-reading option inside the Import panel for a small batch of images:

1. Add a clear image-import choice beside the existing paste, PDF, and EPUB options.
2. Upload or capture up to a bounded number of images.
3. Preserve image order and original page assets.
4. Extract text per page with layout-aware OCR.
5. Create a multi-page reading item.
6. Show the original page beside the extracted reader text.
7. Mark low-confidence text for correction.

Then add the richer scene viewer:

1. Detect independent text regions.
2. Support numbered markers and linked explanation cards.
3. Add vertical-writing and mixed-script handling.
4. Add region-level vocabulary saving and audio.
5. Add document/scene classification controls when automatic classification is uncertain.

This sequence creates a useful import loop before introducing the more complex visual annotation interaction.

## Guardrails and constraints

- Apply image byte, pixel, page-count, and batch-size limits.
- Keep temporary uploads isolated and remove them after failed processing.
- Do not accept arbitrary filesystem paths from clients.
- Keep provider credentials server-side and make outbound image processing explicit to the learner.
- Preserve the original image so the learner can audit OCR and translation results.
- Treat OCR as fallible, especially for decorative signs, low-light photos, and vertical text.
- Make retry and partial-batch recovery explicit; one failed page should not discard successful pages.
- Keep source images and extracted text protected as user-owned content.

## Open questions

- Should scene imports become library items, saved analyses, or both?
- What is the first supported batch size and maximum image resolution?
- Should the learner choose a language before processing, or should detection suggest one?
- How should reading order be edited when a sign contains multiple vertical columns?
- Which OCR confidence threshold should trigger manual review?
- Should image regions be available as normal Reader sentence/token contexts, or begin as a separate image vocabulary surface?
- How should duplicate photos or repeated signs be detected across imports?

## Related repo areas

- `docs/PROCESSING_CONTRACT.md`
- `docs/DATA_MODEL.md`
- `docs/COMPONENTS_INVENTORY.md`
- `apps/api/`
- `packages/processor/`
- `apps/web/`
