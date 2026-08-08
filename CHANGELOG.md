# Changelog

## 2026-08-08

- Fixed the Python API and processor Ruff failures by cleaning up the generated article and translation alignment services, removing stale test lint noise, and revalidating the API test suite.

## 2026-08-07

- Moved the theme catalog wallpaper thumbnails inside their swatch containers so the images stay clipped instead of bleeding into neighboring foreground cards on mobile.
- Added an optional shared version footer that shows the current web app version and last reboot/rebuild time at the bottom of pages, plus a Settings toggle to turn it on or off.
- Removed the redundant sign-out button from the Home page header so account exit lives only in the shell More menu.
- Moved the landing-page sign-in entry out of the public hero header and into the shell More menu so the auth action lives with the rest of the overflow navigation.
- Raised the shared account menu above the Library hero content and gave the dropdown a stronger floating surface so it no longer reads as buried behind the search area on mobile.
- Fixed the Library account dropdown so it can float above the search and filter content instead of being clipped behind the hero card.
- Added direct sign-out buttons to the authenticated Home header and the signed-in auth card so account exit is easier to reach from the main surfaces.
- Stretched the landing-page app frame so the footer can sit at the bottom edge of the viewport on the public landing route.
- Swapped the landing footer order so the use notice appears above the copyright line and pushed the footer to the bottom edge of the landing shell.
- Removed the landing-page `Explore Home` CTA and centered the copyright footer so it sits cleanly at the bottom of the landing card.
- Polished the landing footer so it now reads `© 2026 TextPlex` with a concise use notice about books and materials you are authorized to study.
- Drafted a signup policy page in `docs/SIGNUP_POLICY_DRAFT.md` covering permitted uploads, fair-use caveats, processing language, and user responsibility.
- Added a third-party data-flow note in `docs/THIRD_PARTY_DATA_NOTE.md` covering Supabase, OpenAI, and Google Cloud Translate usage.
- Added a privacy policy page in `apps/web/app/privacy/page.tsx`, linked it from sign-up, and mirrored the draft in `docs/PRIVACY_POLICY_DRAFT.md`.
- Created GitHub issue #51 for the signup policy page and linked it to the TextPlex Feature Board.
- Created GitHub issue #52 for the third-party data-flow note and linked it to the TextPlex Feature Board.
- Created GitHub issue #53 for the privacy policy page and linked it to the TextPlex Feature Board.
- Added a small copyright footer at the bottom of the landing page so the page ends with a clear TextPlex mark.
- Combined the subscription and theme-shop sections into one swipeable support unit so the landing page can advertise both support paths without stretching the page vertically.
- Reframed the landing theme section as a theme shop pitch so readers can see that styling is optional and separate from the core reading experience.
- Kept the public landing hero CTAs on one row at narrow widths and ordered them `Sign in` then `Start free` for the mobile view.
- Simplified the public landing hero by removing the extra `Open Home` action and badge pills, and rewrote the reader and study preview cards to use the new TextPlex descriptions.
- Replaced the shell navbar labels with a minimal monochrome icon system that inherits theme color and now shows consistent icons in the primary nav and overflow menu.
- Added Chromium DevTools automatic workspace metadata for the `apps/web` Next app so local source edits can persist back to the repo from `localhost`.
- Documented the DevTools workspace hookup in the web README and local-development guide so the editable source files are easy to find.
- Removed the redundant landing brand row now that the shared navbar already carries the TextPlex brand.
- Tightened the landing hero to the "Read languages. Remember words." promise and paired it with a clearer language-learning support line.
- Rewrote the landing-page copy to lead with reading and recall outcomes, sharpened the feature and CTA language, and made the preview tiles describe the reader/study split more directly.
- Reworked the landing hero back into a split layout and added wallpaper-backed reader and study preview tiles so the landing page shows the product's utility at a glance.
- Aligned the shell back button hover lift with the shared shell icon behavior so it keeps its centered position instead of jumping on desktop hover.
- Flattened the session summary subpills into single-line chips so the session active rail stays one horizontal row instead of stacking label/value onto separate lines.
- Removed the old session progress footprint and tightened the reader progress module into a full-width one-card-at-a-time swipe carousel, while forcing the session active subpill rail to stay on one line.
- Reflowed the reading progress carousel into one full-width snap card at a time and compressed each slide to match the footprint of the main progress strip.
- Reworked the reading progress details into swipeable, snap-to-position visual progress bars for page progress, page sentence progress, and whole-book sentence progress.
- Moved sentence swipe handling onto the token row and made the reading progress details a horizontally swipeable rail so those gestures no longer fight each other.
- Moved the session details carousel into the always-visible session active bar so the swipeable subpills, edit pencil, and saved layout live on the main reader status strip.
- Reworked the reader session details into a horizontally swipeable subpill carousel with an edit/save pencil chip that hides and restores individual stats per book.
- Added reader settings toggles for the compact meaning-line reveal card and the token-inspector definition trace, and collapsed both cards into lighter disclosure-style summaries.
- Made the shared app shell render on every route so the global navbar now appears on landing, auth, library, reader, and all secondary pages.
- Updated the component inventory to mark the shell chrome and header as global shared chrome.
- Removed the duplicate TextPlex/back header from the Library page and kept the account menu inside the library hero instead.
- Aligned the Library hero card surface with the shared shell chrome by matching its card overlay to the navbar styling and deleting the retired topbar rules.
- Aligned the Library shelf cards, language pills, and status pills with the shared shell button tokens so the library surface reads as one system with the navbar.
- Reworked the reader definition card so the gloss save remains the default star action, a chevron opens a custom-list picker, and the part-of-speech pill now appears before the meaning line.
- Repacked the reader definition-card actions so the audio button, star, and custom-list chevron now stay together in one horizontal cluster on the top-right row.

## 2026-08-06

- Suppressed the reader's temporary mojibake flash during translation loading by keeping the meaning line in its loading state until the translation request completes.
- Added an alignment-backed translation reveal flow so the reader now persists source-to-target token mapping from the translation endpoint and can fill the blank line from tapped source words instead of only counting translation words.
- Reworked the reader definition card so the term and pronunciation share the first row, the definition reads as the second row, and the definition trace collapses into a compact disclosure pill.
- Reflowed the reader token inspector so the term stays on row 1 with icon-only audio beside it and the save control pinned to the top right, the pronunciation moves to row 2, the definition moves to row 3, the remembered/missed buttons sit below the meaning, and the definition trace summary spans the full width with a centered chevron and collapsed default state.
- Tightened the reader speech voice picker so it prefers the correct browser language first and only uses the male/female preference as a tie-breaker, which keeps Chinese and other non-English audio from drifting into the wrong language.
- Cleaned the reader summary and trace text after a mojibake regression so the session pill and nearby metadata no longer render as garbled characters.
- Replaced the reader meaning-line mask filler so hidden words render as simple blanks instead of mojibake.
- Added a shared male/female speech-voice preference to the reader audio controls and the Settings surface, with browser-voice selection applied best-effort to sentence, token, and pronunciation playback.
- Reconstructed reader token display punctuation from the sentence text so source punctuation stays visible in the token row when the extracted token list omits it.
- Made the reader's slim progress strip tappable so it now expands into page, page-sentence, and whole-book sentence progress details.
- Cached per-book sentence totals in `BookRecord` after extraction and added a persisted `book_progress` snapshot so `/progress` can read last-page/completion state without reopening extraction files on every request.
- Backfilled the current local registry and progress cache so the running stack picks up the faster home/progress path immediately.
- Short-circuited book opening so the reader and book detail surfaces render as soon as the book shell and first page arrive, while extraction, analysis, progress, and prompt details finish in the background.

## 2026-08-05

- Rendered the `/home` route on the server with preloaded books and progress data, and synced a small auth session cookie so authenticated users do not wait on hydration before the home shell appears.
- Kept the protected app frame visible while Supabase auth resolves so the shell no longer blanks out during session checks, and only redirects once the user is confirmed missing.
- Deferred the theme settings sync work until browser idle time so the initial render can finish before the app reads the hosted `/settings` surface.
- Switched the theme catalog to thumbnail-first wallpaper cards and added a live selected-theme preview that loads the full wallpaper only after selection, with a loading shimmer while the image swaps in.
- Moved the active app wallpaper to thumbnail-sized theme assets on the root layout and theme bootstrap so the page no longer starts by fetching the full-size wallpaper file.
- Added a prototype progressive translation reveal card in the reader so tapping different tokens gradually fills a blank meaning line from the existing sentence translation, and tracked it as `reader.translation-reveal-card`.
- Added a thin reader header progress line that shows current book or article completion percent, and tightened the theme behavior card spacing so its controls no longer crowd each other.
- Implemented the adaptive learner-window article generator with the `/articles/generate` API, learner-window selection logic, and template fallback when OpenAI is unavailable.
- Added the Library page practice article button and status copy so users can generate a 30-sentence target-language article from their current learner window.
- Expanded the Library generator into a settings panel with language, sentence-length, curriculum-ceiling, level, genre, tone, vocabulary-balance, and topic controls.
- Persisted generated-article prompt metadata and exposed it on the book detail and analysis routes so users can inspect the exact request payload, model, curriculum settings, and selected term window.
- Added remembered/missed thumbs feedback to the reader token inspector and rolled the new lookup signals into the learner profile and activity feed.
- Moved GitHub issue #47 to Done on the TextPlex Feature Board and mirrored the tracker update in `docs/ISSUE_TRACKER.md`.
- Increased the internal padding on landing-page feature, pricing, and theme cards so longer copy stays clear of the rounded card edges at wider viewports.

## 2026-08-04

- Added a clean Russian reader sample markdown doc for onboarding and beta smoke tests, and linked it from the marketing reference.
- Created GitHub issue #50 for the typing fluency practice concept and placed it on the TextPlex Feature Board in Todo.
- Added a typing fluency practice concept to the issue tracker and documented the unlock-and-personal-best drill for fast, accurate vocabulary production.

## 2026-08-03

- Stabilized full-screen wallpaper layers against mobile browser address-bar collapse by sizing them to the large viewport, preventing the wallpaper from sliding and exposing the theme color while scrolling.
- Moved browser theme initialization into the document head and synchronized the color-scheme metadata with the selected global theme so Chrome can match light and dark toolbar states.
- Set the initial browser scheme to light so daylight themes do not inherit a dark Chrome toolbar before the selected theme bootstrap runs.
- Persisted the selected theme in a preference cookie and generate the initial browser toolbar color server-side so Chrome receives the active theme on navigation instead of waiting for hydration.
- Migrated existing localStorage-only theme selections into the browser theme cookie during the head bootstrap so current users receive the correct toolbar color on their next navigation.
- Added light- and dark-scheme `theme-color` metadata so Android Chrome can apply the active theme even when the browser itself is in dark mode.
- Fixed browser theme startup so an explicitly selected app theme is used for Chrome's initial toolbar color unless device-theme following is explicitly enabled; declared support for both light and dark browser chrome schemes.
- Added a reader completion summary for the final article/page arrow, with a congrats card, article stats, and a mark-read return-to-library action.
- Clarified the reader completion stats so reading time accumulates across sessions and coverage means the non-glossed share of the article read.
- Exposed book read states as `not_read`, `in_progress`, and `finished` in the progress summary so unread titles no longer disappear from the system view.
- Consolidated the app theme and owned-theme controls into the dedicated `/profile/themes` theme settings page, linked it from the shell brush icon and Settings page, and removed the duplicate theme surface from the general profile/settings views.
- Reworked the shell shortcuts so the brush button opens the consolidated theme settings page and the day/night toggle stays separate on the right.
- Simplified the theme settings shell icon to a brush so it reads more clearly beside the day/night toggle.
- Aligned the app-shell back button with the existing day/night toggle sizing and icon treatment, and kept Home neutral in the nav row.
- Neutralized the Home nav pill in the app shell, added a top-left shell back button, and added a palette-style theme shop shortcut to the right of the day/night toggle.
- Raised the More dropdown above the shell cards and page content so the expanded menu stays visibly on top.
- Normalized the primary nav pills so More stretches to the same width as the other route buttons and the labels size down cleanly to fit.
- Moved the day/night toggle into the shell's top row and tightened the primary nav pill sizing so the Home, Library, Read, Study, and More buttons feel lighter on mobile.
- Merged the app shell brand bar and primary nav into one two-row chrome and tightened the mobile nav so the route labels shrink to fit, with the Home label hidden on small screens.
- Added a reader study-stage coloring toggle so tokens can tint from unfamiliar to mastered based on the weakest SRS stage across their assessment axes.
- Added paired Hong Kong Daylight and Night themes to the Next theme shop using the latest versioned wallpapers, accessible city palettes, opposite-mode switching, API catalog entries, and Supabase migration metadata.
- Added issue #49 for a future native TextPlex Android keyboard/IME, covering theme handoff, language-aware input, local-first privacy, and the boundary between a standalone IME and third-party keyboards such as Gboard or Samsung Keyboard; placed it in the project board Todo backlog.
- Promoted the supplied Hong Kong daylight artwork to version `v3` and updated the catalog resolver, active background, checklist, and regression coverage to use it.
- Regenerated the Beijing night wallpaper to match the attached partner style more closely and appended a new Beijing night tracker row without touching the earlier Beijing entries.
- Generated the Hong Kong daylight wallpaper asset and appended a new Hong Kong tracker row without touching the planned Hong Kong entries.
- Regenerated the Hong Kong daylight wallpaper with a stricter architecture-first prompt and background lock, then appended a new Hong Kong daylight tracker row without touching the earlier Hong Kong entries.
- Generated the Hong Kong night wallpaper from the provided day reference and appended a new Hong Kong night tracker row without touching the planned Hong Kong entries.
- Generated the Shanghai daylight wallpaper asset and appended a new Shanghai tracker row without touching the planned Shanghai entries.
- Regenerated the Shanghai daylight wallpaper with an off-center composition and softer East Asian editorial feel, then appended a new Shanghai daylight tracker row without touching the earlier Shanghai entry.
- Regenerated the Shanghai daylight wallpaper with one Bund group balanced against the modern skyline, then appended a new Shanghai daylight tracker row without touching the earlier Shanghai entries.
- Generated the Shanghai night wallpaper asset and appended a new Shanghai night tracker row without touching the planned Shanghai entries.

## 2026-08-03

- Expanded the reader session summary to show page, book, language, and lifetime glossed counts plus page coverage and ETA estimates.
- Added a total glossed count to the reader session summary so the session pill shows both session-new and total glossed vocabulary data.
- Added a reader-session pill that counts new glossed words added to the glossed vocabulary list during the current book session.
- Added average-session-aware pausing to the reader timers so session and sentence time stop counting after prolonged idle time or when the browser loses visibility/focus, and surfaced the average session length in the expanded session summary.

## 2026-08-02
- Added two authored starter levels for Hebrew, Arabic, Japanese, and Chinese, plus accessible Ready Now term-source colors and a Glossed/Program legend.
- Clamped horizontal overflow on the shared shell and home surface so mobile pages stop bleeding past the viewport edge.
- Removed the public landing-page badge from the landing header so the hero stays focused on the product pitch and primary actions.
- Centered the TextPlex brand in the shared shell and landing headers, removed the inline Live/labels badges from the main chrome, and moved the inventory-labels toggle into Settings.
- Renamed the canonical signed-in landing route from `/portal` to `/home`, kept `/portal` as a redirect shim for compatibility, and updated the shell and auth return paths accordingly.
- Added pronunciation and syllable guides to the study practice card with audio playback on the pronunciation line and syllable chips, and kept the guide limited to first-introduction cards so review surfaces do not leak romanization clues.
- Hardened study practice routing so program cards carry explicit language, program, and level codes, and the practice page now prefers the requested program code before falling back by language to avoid cross-language jumps.
- Made the study practice page read the live URL query on the client and render dynamically so Hebrew practice links cannot fall back to the Russian starter program from stale initial state.
- Added the missing meaning line to program and glossed intro cards so first-introduction study shows the term, meaning, and pronunciation together before assessment starts.
- Turned the intro meaning on the practice card into a labeled callout so it is easier to spot during Hebrew and other starter-program introductions.

- Replaced the overt “portal” wording in the signed-in home surfaces with “Home” copy, audited remaining portal references, and switched the primary nav item to a house icon so the entry point feels calmer and more direct.
- Simplified the shared navigation model so the shell owns one focused primary navigation row, secondary destinations live under More, book context appears only on book routes, and the portal no longer repeats the TextPlex brand or renders a competing bottom navigation bar.
- Fixed the More navigation panel so it floats above the shell card without stretching the other navigation pills to its height.
- Fixed mobile edge bleed by restoring intrinsic nav-pill widths after the global mobile button rule and capping portal content to the viewport.
- Constrained nested route surfaces to the shared mobile frame and prevented long hero copy or action rows from exceeding the viewport.
- Matched the narrow-screen More summary to its equal-width navigation slot so it no longer shrinks below the other primary controls.
- Updated library info and open-book actions to use each theme's shared surface and accent colors instead of fixed gray and yellow fills.
- Restyled the library info and open-book icon controls as circular pill buttons to match the shared button system.
- Increased the contrast of the dotted spider-chart rings in light and dark themes.
- Fixed native theme selector options appearing white-on-white when opened from a dark app theme.
- Renamed the study glossed-vocabulary inventory IDs so the section, row, and axis-chart identifiers now match the new glossed vocabulary terminology.
- Renamed the study saved-vocabulary surface to glossed vocabulary and clarified that it captures terms tapped during reading sessions when the reader needs help.
- Added expandable axis charts to study program items and due-term pills so tapping a term now shows its per-axis SRS stages and supporting metadata.
- Switched the non-negative retry outcome to use answer similarity against the expected response, so near-miss submissions at or above the 75% threshold now retry instead of counting as wrong.
- Added a non-negative retry outcome for mostly learned terms so answers on items that are at least 75% complete can be retried without penalizing the axis.
- Regenerated the cucumber wallpaper as a richer painted botanical wallpaper, saved it as `vegetable-cucumber-v2.png`, and wired the app to use the new version while leaving the original asset in place.
- Regenerated cucumber again with a larger containment buffer, saved it as `vegetable-cucumber-v3.png`, and wired the app to the new version.
- Regenerated cucumber again with the reference-photo margin, saved it as `vegetable-cucumber-v4.png`, and wired the app to the new version.
- Relaxed the wallpaper prompt margin guidance to a general 2% to 4% inset for repeat-friendly content, while still preventing any motif from crossing the border line.
- Generated the Beijing daylight wallpaper asset and appended a new Beijing tracker row without touching the planned Beijing entries.
- Generated the Beijing night wallpaper asset and appended a new Beijing night tracker row without touching the planned Beijing entries.

## 2026-08-01

- Versioned all current wallpaper assets as `v1`, preserved Strawberry revisions through `v6`, and added an explicit latest-wallpaper manifest so theme selection never falls back to unversioned or stale artwork.
- Added a private wallpaper replacement checklist covering all current illustrated theme assets and the planned Spring, Winter, and Chinese-city generation queues under Wallpaper Generation Prompt v3.
- Updated the wallpaper-generation prompt with a reusable master template, strict 100% containment language, narrow perimeter buffers, and clearer full-bleed repeat guidance.
- Added the paired `fruit-strawberry` and `fruit-strawberry-night` themes with daylight/night switching, dark palette roles, PNG wallpaper mapping, shop swatches, and server catalog registration.
- Added a density calibration note to the wallpaper prompt and private tracker so repeat-style catalog themes target roughly 15 to 18 visible motifs while keeping the center readable.
- Relaxed the wallpaper prompt so repeat-style themes can use center coverage when the reading UI overlays the wallpaper, and marked the strawberry replacement row as reviewed with a replacement date.
- Refined the strawberry wallpaper again to reduce excess top and bottom whitespace, then saved the new versioned asset and updated the replacement tracker.
- Tightened the strawberry wallpaper once more for tile-test visibility by pulling edge motifs closer to the top and bottom, then saved v6 and updated the tracker.
- Added a dark fruit-strawberry night variant and tracked it as a new wallpaper row with the blackberry-plum palette.
- Generated a fresh blueberry wallpaper asset and appended a new blueberry entry to the repo tracker mirror without touching the existing blueberry row.
- Generated a blueberry night wallpaper asset and added a separate blueberry night entry to the tracker mirror, leaving the daytime blueberry row intact.
- Generated a fresh citrus wallpaper asset and appended a new citrus entry to the repo tracker mirror without touching the existing citrus row.
- Generated a citrus night wallpaper asset and appended a separate citrus night entry to the repo tracker mirror without touching the existing citrus rows.
- Regenerated citrus night with the subdued night palette rule, saved it as a new versioned asset, and appended a fresh tracker row without touching the earlier citrus night asset.
- Regenerated mango night with the subdued night palette rule, saved it as a new versioned asset, and appended a fresh tracker row without touching the earlier mango night asset.
- Generated a fresh mango day wallpaper asset and appended a new mango entry to the repo tracker mirror without touching the existing mango row.
- Generated a mango night wallpaper asset and appended a separate mango night entry to the repo tracker mirror without touching the existing mango rows.
- Tightened the wallpaper prompt for night variants so future assets stay subdued, low-glare, and muted instead of reading as bright or candy-colored.
- Added city-specific architectural anchors for the Russian and Chinese international theme queues, plus an architecture-first rule that rejects generic arches, anonymous towers, and unrelated water scenes.
- Added exact theme-specific wallpaper background colors to the private tracker and made the dynamic generator prompt require each row's assigned background instead of defaulting to cream.
- Updated wallpaper asset resolution to choose the highest recorded version for each theme, so newer files such as `fruit-strawberry-v7` supersede earlier candidates automatically once registered.
- Added the private `PRIVATE_THEME_STORE_WIRING_TRACKER.tsv` to separate final shop integration status from wallpaper generation status across current and planned themes.
- Replaced the local-only Test Wallpaper asset with the supplied apple, pear, blossom, and maple artwork for wallpaper tiling tests.
- Added a local-only Test Wallpaper option and a persisted Settings toggle for tiling wallpaper artwork, allowing fixed-cover and repeat treatments to be compared without changing reader/card surfaces.
- Tightened the landing page hero and carousel card sizing so the cards stop stretching into excess vertical whitespace and the hero title uses more of its available width.
- Simplified the study practice prompt so the instruction only appears inside the answer field, centered the active term in the card, and switched the mobile keyboard hint by requested response type.
- Simplified the study practice header to show only the current level label and made correct review feedback render in green, including the revealed answer text.
- Increased contrast between the green success box and the revealed answer text in study practice so the two states are visually distinct.
- Tuned the study success banner to use a lighter green fill and darker label text so the confirmation message is readable inside the card.
- Removed the redundant revealed answer line on correct study submissions and centered both the success label and the answer input text.
- Added a distinct wrong-axis study outcome for valid answers given on the alternate axis, and left the axis stage unchanged for that response type.
- Added a glossed-vocabulary detail view with an axis-stage radar chart and made wrong-axis practice attempts reset for an immediate retry.


## 2026-08-02

- Added Google Translate-backed fallback meanings for glossed vocabulary so saved reader terms can enter study even when the source row was missing an English gloss, and surfaced those meanings back into the saved-vocabulary list.
- Reworked the Ready Now language cards to offer separate study buttons for program words, glossed words, or both, with empty-state toasts and a practice route that now supports glossed and combined study sessions.
- Reworked the study practice program flow so each five-word chunk introduces its words in level order first, then shuffles the 20 axis questions for that chunk before advancing.
- Made the reader settings icon visually distinct from the day/night toggle and turned the session-active bar into a full-width expandable summary with book-level session stats, reads, resume point, and progress.
- Expanded the home portal into a wider desktop and tablet-landscape two-column layout while keeping the compact mobile stack intact.
- Added an ultrawide home portal breakpoint that promotes the recently-read and goals sections into a fuller right rail on wide desktop displays.
- Tightened the home bottom navigation into a centered floating dock on desktop widths so the portal no longer stretches it into a wide footer strip.

## 2026-07-31

- Preserved study practice attempt state per card so navigating back to a previous term restores its checked status instead of forcing a redo.
- Fixed the Docker Compose smoke job so it no longer fails when `GOOGLE_APPLICATION_CREDENTIALS` is unset in the disposable CI `.env` file.
- Fixed the API and processor Ruff regressions that were breaking GitHub Actions, including export sorting, exception narrowing, and legacy lexicon row handling; verified with `ruff check` and `pytest`.
- Added a Latin-script roadmap lane for French, Spanish, Italian, German, Yoruba, and related languages so they stay planned together before any individual starter packs are built.
- Added Yoruba to the import dropdown, library language filter, and study language labels so the Latin-script lane shows a real language name instead of a generic code, and added a matching Yoruba starter-pack note to the issue tracker.
- Added night variants for Citrus Grove, Sunlit Meadow, and Seaside Garden with supplied fixed wallpaper assets, dark semantic palettes, swatches, browser colors, and separate `$1.99` pricing; expanded the Summer Editions bundle to six themes at `$8.99`.
- Added a global day/night theme toggle in the top-right corner of every page and a settings option to follow the device light/dark scheme.
- Shrunk the global day/night theme toggle to a small fixed icon button so it no longer stretches across the mobile viewport.
- Reworked the reader theme picker to show the eight most recently used themes first and added a compact More button for the full theme list.
- Removed the duplicate reader-canvas wallpaper overlay so the app uses one fixed wallpaper base layer at the root only.
- Added viewport audit reference docs for device coverage, checklist criteria, and a reusable audit prompt.
- Added a Mobile S viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Mobile M viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Mobile L viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Tablet P viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Tablet L viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Added a Laptop viewport audit record under `docs/viewport-audits/` with a clean pass across the core routes.
- Fixed the API schema export list so Ruff no longer flags `ReadingHistoryPoint` as an unused import in CI.
- Reordered Python imports across the API, processor, and test tree to satisfy Ruff in GitHub Actions.
