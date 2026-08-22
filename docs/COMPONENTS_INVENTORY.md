# TextPlex Components Inventory

This is the canonical map of the user-visible surfaces in `apps/web`. It gives pages and regions stable names that can be used in product notes, issues, design reviews, QA, and agent prompts.

Inventory status: reviewed against the Next app and standalone preview aliases on 2026-07-22. Phase 1 migration decisions are recorded in `docs/FRONTEND_MIGRATION_PHASE_1.md`.

Unless a task explicitly calls for legacy or GitHub Pages compatibility work, implement UI changes in the Next app on `3000` and treat the standalone `8200` shell as a reference surface only.

## Naming rules

- Use the stable ID in the first column when referring to a surface or region.
- IDs are lowercase, dot-separated, and scoped by route or shared area: `reader.token-inspector`, `profile.preferences-card`.
- A **page** is a routable screen. A **region** is a meaningful page or shell area. A **card** is a bounded user-facing panel, including cards currently written as inline markup.
- `apps/web/components/mock-route-views.tsx` is the demo data implementation of the corresponding live surface. It uses the same IDs; do not create duplicate `mock.*` IDs unless the layout itself differs.
- Source paths identify the implementation location. The inventory name is the stable product reference and may remain stable if the implementation is later split into smaller files.

## Shared application shell

| ID | Type | Visible name | Source | Purpose |
| --- | --- | --- | --- | --- |
| `shell.root-layout` | region | Root layout | `apps/web/app/layout.tsx` | Global document, theme bootstrap, top-right theme toggle, and page content frame. |
| `shell.theme-provider` | region | Theme provider | `apps/web/components/theme-provider.tsx` | Loads, applies, persists, and system-syncs the app theme. |
| `shell.back-button` | button | Shell back button | `apps/web/components/app-shell.tsx` | Top-left shell back control that returns to the prior route or falls back to Home. |
| `shell.brand` | region | TextPlex brand | `apps/web/components/app-shell.tsx` | Shared TextPlex logo link that opens the public start page for signed-out users and Home for signed-in users. |
| `shell.theme-toggle` | button | Theme toggle | `apps/web/components/theme-toggle-button.tsx`, `apps/web/components/app-shell.tsx` | Header-row moon/sun control that switches the app between opposing day/night themes. |
| `shell.inventory-label-toggle` | button | Inventory labels toggle | `apps/web/components/inventory-inspector.tsx`, `apps/web/components/landing-page.tsx`, `apps/web/components/app-shell.tsx` | Developer-only, content-sized toggle placed in the landing/app header row that overlays inventory IDs on tracked regions, cards, and controls for QA and code review. |
| `shell.chrome` | region | App chrome | `apps/web/components/app-shell.tsx` (`AppShell`) | Global shell card mounted from the shared root layout on every page, combining the brand row and compact hamburger navigation as one mobile-aware unit. |
| `shell.header` | region | App header | `apps/web/components/app-shell.tsx` (`AppShell`) | Shared top row with back control, brand, and secondary actions. |
| `shell.context` | region | Reading context | `apps/web/components/app-shell.tsx` | Linked active book and page context shown only on book-oriented routes. |
| `shell.actions` | region | Shell actions | `apps/web/components/app-shell.tsx` | Theme settings and theme toggle controls for secondary routes. |
| `shell.menu-toggle` | button | Shell menu toggle | `apps/web/components/app-shell.tsx` | Compact hamburger control that opens the app navigation panel beside the shell theme controls. |
| `shell.menu-notifications` | region | Menu notifications | `apps/web/components/app-shell.tsx`, `apps/web/components/feedback-notification-bell.tsx` | Compact notification entry inside the hamburger menu: each report title opens its selected Admin Feedback record, with a minimal GitHub action that generates and opens the linked issue. |
| `shell.markets-nav` | region | Markets navigation | `apps/web/components/app-shell.tsx` | Expandable hamburger-menu group above More containing the live Theme Shop and future TextPlex marketplace destinations. |
| `shell.theme-shop-link` | link | Theme Shop link | `apps/web/components/app-shell.tsx` | Live theme catalog entry inside the Markets navigation group. |
| `shell.market-placeholder` | region | Market destination placeholder | `apps/web/components/app-shell.tsx` | Disabled coming-soon entry for the Book Shop, Course Shop, or Translation Shop. |
| `shell.primary-nav-menu` | region | Primary navigation menu | `apps/web/components/app-shell.tsx` | Anchored navigation panel containing Home, Library, Read, Study, and expandable secondary destinations. |
| `shell.build-footer` | region | Build footer | `apps/web/components/build-footer.tsx` | Shared bottom-of-page build card showing the current version, build timestamp, live time-since-build, and embedded feedback action. |
| `shell.tester-build-update-gate` | region | Tester build update gate | `apps/web/components/tester-build-update-gate.tsx`, `apps/web/components/app-frame.tsx` | Tester-only blocking update page shown when the signed-in tester has not acknowledged the current build. |
| `shell.tester-build-update-sections` | region | Tester build update sections | `apps/web/components/tester-build-update-gate.tsx` | Grouped, plain-language release sections covering the builds since the tester's last acknowledgement. |
| `shell.tester-build-update-section` | region | Tester build update section | `apps/web/components/tester-build-update-gate.tsx` | One area of change, such as Reader and language support or Import and library. |
| `shell.tester-build-update-items` | list | Tester build update items | `apps/web/components/tester-build-update-gate.tsx` | Individual tester-readable changes within one grouped area. |
| `shell.tester-build-update-acknowledge` | button | Acknowledge and continue | `apps/web/components/tester-build-update-gate.tsx` | Records the current build for the signed-in tester and unlocks the rest of the app. |
| `shell.primary-nav` | region | Primary navigation | `apps/web/components/app-shell.tsx` | Hamburger-triggered app navigation containing Home, Library, Read, and Study, with grouped secondary destinations behind chevrons. |
| `shell.secondary-nav` | region | More navigation | `apps/web/components/app-shell.tsx` | Overflow access to Activity, Roadmap, Profile, Settings, admin/tester tools when available, and the signed-in or signed-out account action. |
| `shell.reader-nav` | region | Reader navigation behavior | `apps/web/components/app-shell.tsx` | Reader-only app shell that appears on entry, then collapses as a whole so the logo, shell controls, and primary navigation do not compete with reading. |
| `shell.reader-nav-reveal` | button | Show app shell | `apps/web/components/app-shell.tsx` | Theme-aware reader tab anchored to the top viewport edge, restoring the full app shell after it collapses without covering reader content. |
| `shell.page-guide-trigger` | button | Page guide trigger | `apps/web/components/page-guide.tsx`, `apps/web/components/app-shell.tsx` | Persistent help control that reopens the current route's first-visit guide. |
| `shell.page-guide-dialog` | card | Page guide dialog | `apps/web/components/page-guide.tsx` | Route-aware first-visit carousel explaining a page's purpose, current capabilities, and likely future expansions. |
| `shell.page-guide-close` | button | Close page guide | `apps/web/components/page-guide.tsx` | Dismisses the current page guide and records that the visitor has seen it. |
| `shell.footer` | region | Shared footer | `apps/web/components/account-footer.tsx`, `apps/web/components/account-menu.tsx` | Shared account footer below the build card, with the authenticated account menu above the authorization/usage note and copyright mark. |
| `shell.feedback-footer` | region | Feedback footer | `apps/web/components/feedback-widget.tsx`, `apps/web/components/build-footer.tsx` | Feedback action region embedded inside the shared build card so it remains accessible on every route. |
| `shell.feedback-button` | button | Send feedback | `apps/web/components/feedback-widget.tsx` | Embedded build-card action that opens the feedback capture dialog from every route. |
| `shell.feedback-dialog` | card | Feedback dialog | `apps/web/components/feedback-widget.tsx` | Free-form tester feedback capture with automatic route, build, viewport, and reading-context metadata. |
| `shell.feedback-close-button` | button | Close feedback dialog | `apps/web/components/feedback-widget.tsx` | Clearly sized icon control that closes the feedback dialog without changing its responsive header alignment. |
| `shell.feedback-screenshot` | button | Add screenshots | `apps/web/components/feedback-widget.tsx` | Optional multi-screenshot attachment in the feedback dialog, restricted to three common image files with a 5 MB per-file limit. |
| `shell.feedback-notifications` | region | Feedback notification bell | `apps/web/components/app-shell.tsx`, `apps/web/components/feedback-notification-bell.tsx` | Persistent top-shell tester notification center showing feedback status, direct GitHub routing, GitHub linkage, resolution updates, and in-app verification actions for implemented fixes. |
| `shell.feedback-github-button` | button | Send feedback to GitHub | `apps/web/components/feedback-notification-bell.tsx` | Authenticated feedback author action that creates and links a GitHub issue directly from a notification when one is not already linked. |
| `shell.account-menu` | region | Account menu | `apps/web/components/account-footer.tsx`, `apps/web/components/account-menu.tsx` | Profile, settings, account switching, and sign-out control shown in the shared footer for signed-in users. |
| `shell.account-switcher` | region | Saved account switcher | `apps/web/components/account-menu.tsx` | Trusted-device list of saved TextPlex sessions with active-account state, fast switching, add-account entry, and per-device removal. |
| `surface.route-hero` | region | Route hero | `apps/web/components/route-page.tsx` (`RoutePage`) | Shared eyebrow, title, description, badge, route links, and metrics for data-backed surfaces. |
| `surface.metrics` | region | Route metrics | `apps/web/components/route-page.tsx` | Compact metric row rendered by `RoutePage`. |
| `surface.loading-state` | region | Loading state | `apps/web/components/loading-skeleton.tsx` | Shared loading skeleton used by library, book detail, reader, and data-backed surfaces. |
| `surface.reader-loading-state` | region | Reader loading state | `apps/web/components/loading-skeleton.tsx` | Reader-specific loading skeleton. |
| `surface.error-state` | region | Error state | Route surface files | Bounded error card shown when a live request fails. |
| `surface.list` | region | Surface list | Route surface files | Shared list layout used for events, books, search results, settings, and study items. |
| `surface.list-item` | region | Surface list item | Route surface files | Repeated row inside a surface list. |
| `surface.page-by-page-append-card` | card | Page-by-page append | `apps/web/components/photo-page-append-card.tsx` | Shared upload card for adding the next photographed pages to an existing page-by-page source from the reader or book detail. |

## Route catalog

| Page ID | Path | Primary source |
| --- | --- | --- |
| `landing` | `/` | `apps/web/components/landing-page.tsx` |
| `auth` | `/auth` | `apps/web/app/auth/page.tsx` |
| `auth-reset-password` | `/auth/reset-password` | `apps/web/app/auth/reset-password/page.tsx` |
| `privacy` | `/privacy` | `apps/web/app/privacy/page.tsx` |
| `home` | `/home` | `apps/web/app/home/page.tsx` |
| `library` | `/library` | `apps/web/components/library-view.tsx` |
| `archive` | `/archive` | `apps/web/components/archive-view.tsx` |
| `book-detail` | `/books/:bookId` | `apps/web/components/book-detail-view.tsx` |
| `reader` | `/reader/:bookId/:pageNumber` | `apps/web/components/reader-view.tsx` |
| `analysis` | `/analysis/:bookId` | `apps/web/components/surface-views.tsx` |
| `activity` | `/activity` | `apps/web/components/surface-views.tsx` |
| `import` | `/import` | `apps/web/components/surface-views.tsx` |
| `progress` | `/progress` | `apps/web/components/surface-views.tsx` |
| `profile` | `/profile` | `apps/web/components/surface-views.tsx` |
| `theme-settings` | `/profile/themes` | `apps/web/components/surface-views.tsx` |
| `theme-shop` | `/themes` | `apps/web/app/themes/page.tsx`, `apps/web/components/surface-views.tsx` |
| `search` | `/search` | `apps/web/components/surface-views.tsx` |
| `settings` | `/settings` | `apps/web/components/surface-views.tsx` |
| `study` | `/study` | `apps/web/components/surface-views.tsx` |
| `study-practice` | `/study/practice` | `apps/web/components/study-practice-view.tsx`, `apps/web/app/study/practice/page.tsx` |
| `roadmap` | `/roadmap` | `apps/web/app/roadmap/page.tsx` |
| `admin` | `/admin` | `apps/web/components/admin-usage-view.tsx` |
| `admin-feedback` | `/admin/feedback` | `apps/web/app/admin/feedback/page.tsx`, `apps/web/components/admin-feedback-view.tsx` |
| `admin-themes` | `/admin/themes` | `apps/web/components/admin-theme-console.tsx` |
| `tester` | `/tester` | `apps/web/app/tester/page.tsx`, `apps/web/components/tester-console-view.tsx` |

### `landing` — `/`

Source: `apps/web/components/landing-page.tsx` (`LandingPage`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `landing.page` | page | Landing | Public discovery page with the product pitch, three-plan beta access model, feature summary, and one-time theme framing. |
| `landing.hero` | region | Landing hero | Split hero with the primary call to action and the wallpaper-backed reader/study previews. |
| `landing.hero-previews` | region | Workspace previews | Wallpaper-backed placeholder panels that show the reader and study spaces beside the landing copy. |
| `landing.hero-reader-preview` | card | Reader preview | Wallpaper-backed placeholder tile framing the reader workspace. |
| `landing.hero-study-preview` | card | Study preview | Wallpaper-backed placeholder tile framing the study workspace. |
| `landing.features` | region | Product overview | Foundational explainer for import, context reading, progress tracking, and history retention. |
| `landing.feature-card` | card | Product card | One core capability card describing the app's reading workflow or tracking model. |
| `landing.support` | region | Ways to support | Combined subscription and theme-shop unit that lets readers swipe between support options without leaving the landing page. |
| `landing.support-toggle` | tablist | Support toggle | Two-option tab strip that switches between subscription and theme-shop panels. |
| `landing.support-subscription-panel` | card | Subscription panel | Subscription overview panel with the Open Book, Deep Read, and Immersion Studio tier carousel, including beta and fair-use guidance. |
| `landing.support-theme-panel` | card | Theme shop panel | Theme-shop overview panel with five interactive theme previews, thumbnails, and day/night or paired-variant controls. |
| `landing.pricing-tier` | card | Pricing tier | One subscription tier card with plan name, price, cadence, feature list, and the boundary between core reading and AI-heavy practice. |
| `landing.theme-card` | card | Theme card | One interactive theme preview card showing a thumbnail, planned price treatment, selected variant, and apply-to-page action. |
| `landing.theme-preview-art` | button | Theme preview art | Clickable thumbnail or core-theme swatch that applies the selected theme variant to the landing page. |
| `landing.theme-mode-toggle` | control | Theme variant toggle | Two-option control for switching a preview card between its day/night or paired theme variants. |
| `landing.cta` | card | Final CTA | Closing account-creation and Home entry call to action. |

### `auth` — `/auth`

Source: `apps/web/app/auth/page.tsx` (`AuthPage`) and `apps/web/app/auth/callback/page.tsx` (`AuthCallbackPage`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `auth.page` | page | Account | Public email/password sign-in, account creation, and password reset entry point. |
| `auth.account-card` | card | Account form card | Bounded account form and signed-in confirmation state. |
| `auth.policy-note` | region | Privacy note | Sign-up reminder that links to the privacy policy before the account is created. |
| `auth.form` | region | Account form | Display name, email, password, and account action controls. |
| `auth.target-language` | region | Registration target language | Required target-language choice for new accounts, with an Other option and language suggestion field. |
| `auth.learning-track` | region | Registration learning path | Required learning-path choice with plain-language descriptions for formal programs, general reading, custom paths, and undecided learners. |
| `auth.public-return` | region | Public return action | Separated auth-card action that lets a visitor explore TextPlex without signing in. |
| `auth.error-state` | card | Authentication error | Visible sign-in, sign-up, or reset failure message. |
| `auth.callback-state` | page | Authentication callback | Session restoration state after email confirmation or password reset redirect. |
| `auth.reset-password-page` | page | Reset password | Recovery-link destination where a signed-in recovery session can choose a new password. |
| `auth.reset-password-card` | card | Reset password card | Bounded password update panel for a valid recovery session or an expired-link recovery path. |
| `auth.reset-password-form` | region | Reset password form | New-password and confirmation fields plus the password update action. |
| `auth.reset-password-account` | region | Reset password account | Email address from the recovery session identifying which account will receive the new password. |
| `auth.reset-password-success` | region | Password reset success | Confirmation and continuation link after the password is updated. |
| `auth.reset-password-error` | card | Password reset error | Recovery-link, session, validation, or password-update failure message. |

### `privacy` — `/privacy`

Source: `apps/web/app/privacy/page.tsx` (`PrivacyPage`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `privacy.page` | page | Privacy policy | Public policy page describing collection, use, third-party providers, and choices. |
| `privacy.summary-card` | card | Overview | Policy summary and scope note. |
| `privacy.collection-card` | card | What we collect | Account, reading, upload, and technical data categories. |
| `privacy.usage-card` | card | How we use information | Service, sync, and processing purposes. |
| `privacy.providers-card` | card | Third-party services | Supabase, OpenAI, and Google Cloud Translate disclosures. |
| `privacy.controls-card` | card | Your choices | Sign-out, storage clearing, hosted feature opt-out, and support contact options. |
| `privacy.contact-card` | card | Questions | Closing contact and related-policy note. |

### `home` — `/home`

Source: `apps/web/app/home/page.tsx` (`HomePage`) rendering `apps/web/components/home-surface.tsx` (`HomeSurface`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `home.page` | page | Home | Compact home surface that mirrors the standalone 8200 preview shell. |
| `home.header` | region | Home header | Centered brand header without a direct account action. |
| `home.search` | region | Search | Search field for texts, authors, and topics. |
| `home.continue-reading` | region | Continue reading | Featured continuation section showing the most recently read book or article and learner reading progress. |
| `home.continue-reading-card` | card | Continue reading card | Featured reading card with art, metadata, a resume link, and progress based on furthest learner position. |
| `home.continue-reading-list` | region | Recently read | Follow-on list of the next most recently read books and articles; this is not an extraction or difficulty report. |
| `home.continue-reading-row` | region | Continue reading row | One resumable reading row with art, content type, learner progress ring, and a reader link. |
| `home.goals` | region | Goals | Reading goal and exposure summary section. |
| `home.weekly-goal` | card | Weekly reading goal | Weekly page-reading progress ring. |
| `home.exposure-goal` | card | Reading exposure | Sentence-read exposure summary card. |
| `home.empty-state` | card | Empty state | First-text call to action when no books are available. |
| `home.error-state` | card | Error state | Error message shown when the home data request fails. |
### `goals` — `/goals`

Source: `apps/web/app/goals/page.tsx` (`GoalsPage`) rendering `apps/web/components/goals-view.tsx` (`GoalsSurface`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `goals.page` | page | Goals | Editable learner goal workspace for turning reading targets into visible, motivating progress. |
| `goals.focus-card` | card | Your next win | Encouragement and completion summary that frames the next achievable action. |
| `goals.list` | region | Editable reading goals | Collection of period-based reading, exposure, vocabulary, and session goals. |
| `goals.pages-card` | card | Weekly reading | Weekly page target with inline editing and progress bar. |
| `goals.sentences-card` | card | Daily exposure | Daily sentence-exposure target with inline editing and progress bar. |
| `goals.words-card` | card | New vocabulary | Monthly vocabulary target with inline editing and progress bar. |
| `goals.sessions-card` | card | Reading sessions | Weekly session target with inline editing and progress bar. |

### `library` — `/library`

Source: `apps/web/components/library-view.tsx` (`LibraryView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `library.search-hero` | region | Search hero | Search field, filter menu, Import action, and document count header for the library shelf. |
| `library.filter-menu` | region | Library filter menu | Dropdown containing language, reading-progress, and book-processing-status filters for the library shelf. |
| `library.filter-button` | button | Filter menu toggle | Opens and closes the library filter dropdown from the hero’s upper-right corner. |
| `library.language-filter` | region | Language filter | Language select inside the library filter menu used to filter the shelf by `language_code`. |
| `library.search` | region | Library search | Search input used to filter library items. |
| `library.document-count` | region | Document count | Visible count of matching books in the shelf. |
| `library.shelf` | region | Library shelf | Book collection grid, loading card, and empty state. |
| `library.skeleton-card` | card | Loading book | Skeleton card shown while the library loads. |
| `library.book-card` | card | Book card | Language, type, and reading-state pills, title, author/page context, update date, and archive/details/open actions for one book. |
| `library.book-info-button` | button | Details action | Opens the book detail route from a library card. |
| `library.book-open-button` | button | Open action | Opens the reader route from a library card. |
| `library.book-archive-button` | button | Archive action | Moves a library item to the archive and removes it from the active shelf. |
| `library.import-button` | button | Import action | Routes from the library to the `/import` flow for adding a text, PDF, EPUB, or random article. |
| `library.empty-state` | card | Empty library | Guidance shown when no books are available or match the search. |
| `library.error-state` | card | Library error | Book loading error message. |

### `archive` — `/archive`

Source: `apps/web/components/archive-view.tsx` (`ArchiveView`)

| `archive.page` | page | Archive | Completed reading items kept out of the active library. |
| `archive.hero` | region | Archive hero | Archive purpose, explanation, and return-to-library action. |
| `archive.filter-menu` | region | Archive filter menu | Language and content-type filters for archived items. |
| `archive.filter-button` | button | Archive filter toggle | Opens the archive language and content-type filters. |
| `archive.language-filter` | region | Archive language filter | Filters archived items by language. |
| `archive.content-type-filter` | region | Archive content type filter | Filters archived items as articles or books. |
| `archive.shelf` | region | Archive shelf | Archived reading items and empty state. |
| `archive.book-card` | card | Archived book card | Archived item metadata with open, restore, and delete actions. |
| `archive.empty-state` | card | Empty archive | Guidance shown before any item is archived. |

### `book-detail` — `/books/:bookId`

Source: `apps/web/components/book-detail-view.tsx` (`BookDetailView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `book-detail.page-hero` | region | Book detail hero | Content-type pill, article topic or book title, concise reading summary, demo status, and page-count metadata. Generated article summaries use the saved topic and curriculum metadata; book summaries remain local metadata copy until a synopsis contract exists. |
| `book-detail.detail-card` | card | Book detail | Book metadata, page/extraction metrics, reader link, library link, and extraction action. |
| `surface.page-by-page-append-card` | card | Page-by-page append | Adds the next photographed pages to this existing book and sends them through the normal extraction pipeline. |
| `book-detail.extraction-snapshot-card` | card | Reading overview | Ready-page count and top words and phrases from the selected book. |
| `book-detail.generation-prompt-card` | card | Generated article prompt | Saved generation metadata, selected learner window, and the exact prompt text used for a generated article. |
| `book-detail.page-hsk-chart` | card | Book page HSK chart | Ordered page-level HSK averages for the selected book. |
| `book-detail.prepared-pages-card` | card | Pages | Page grid linking to individual reader pages. |
| `book-detail.page-tile` | region | Page tile | One page link showing the page number and an open action. |
| `book-detail.error-state` | card | Book detail error | Load or extraction error message. |

### `reader` — `/reader/:bookId/:pageNumber`

Source: `apps/web/components/reader-view.tsx` (`ReaderView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `reader.header` | region | Reader header | Book/page identity with adaptive two-line title sizing, compact controls, page navigation, and reading-session summary. |
| `reader.settings-button` | button | Reader settings | Distinct reader control in the right side of the header grid that opens the reader options dialog. |
| `reader.options-dialog` | region | Reader options | Font, interface text size, token text size and spacing, speech voice, navigation hide delay, default-on token audio, pronunciation freshness toggle, Japanese romaji/furigana display, study-stage word coloring, meaning line reveal, definition trace, reading theme, focus-mode controls, Google translation fallback usage, and the moved reader utilities. |
| `reader.token-display-settings` | region | Token display settings | Reader settings section for independently scaling token words/readings and tightening or relaxing the horizontal space between tokens. |
| `reader.token-text-size-control` | control | Token text size | Range control that scales the displayed token word and its pronunciation/reading together. |
| `reader.token-spacing-control` | control | Token spacing | Range control that adjusts horizontal gaps and token side padding so sentences can fit the available reading width. |
| `reader.mode-control` | control | Reader mode | Reader mode selector for sentence, page, or token-focused reading inside the reader settings panel. |
| `reader.navigation-hide-delay-section` | region | Navigation hide delay | Reader focus setting that controls how long the shared app shell remains visible before folding away. |
| `reader.navigation-hide-delay-slider` | control | Navigation hide delay slider | Range slider for choosing the reader app-shell hide delay from one to fifteen seconds. |
| `reader.session-summary-toggle` | region | Session active summary | Full-width reader session active bar with a swipeable one-row subpill carousel for the current session, glossed counts, coverage, ETA, book-specific metrics, reads, resume point, and progress. |
| `reader.session-summary-details` | region | Session summary details | Swipeable subpill rail inside the reader session active bar that surfaces the current session, average session length, page/book/language/lifetime glossed counts, page coverage, ETA, and book-wide stats. |
| `reader.session-summary-subpill` | button | Session summary subpill | Individual metric subpill inside the session detail carousel that can be hidden or restored while editing the layout. |
| `reader.session-summary-edit-toggle` | button | Session summary edit toggle | Pencil/save subpill at the end of the session detail carousel that toggles edit mode and persists the visible layout. |
| `reader.reading-progress-module` | region | Compact reading progress | Slim sentence-or-page progress strip beneath the session rail that preserves visual progress without adding another card to the reading controls stack. |
| `reader.session-glossed-count` | status | Glossed words this session | Compact badge showing how many new glossed vocabulary items were added during the current reader session. |
| `reader.speech-voice-toggle` | control | Speech voice | Reader-side male/female voice preference that applies to sentence, token, and syllable audio playback. |
| `reader.mixed-language-audio-toggle` | control | Mixed-language sentence audio | Reader setting that switches sentence playback between the book-level voice and the experimental chained per-language token audio prototype. |
| `reader.theme-section` | region | Reading themes | Recent-first reader theme picker with a More expansion control for the full theme catalog. |
| `reader.theme-grid` | region | Theme grid | Collapsed or expanded grid of reader theme options. |
| `reader.theme-more-button` | button | More themes | Expands or collapses the full reader theme catalog. |
| `reader.token-audio-toggle` | control | Token audio toggle | Enables token-by-token pronunciation playback when a reader token is tapped. |
| `reader.token-audio-toast` | status | Token audio notice | One-time first-use notice that token audio is enabled by default and can be turned off in Reader settings. |
| `reader.pronunciation-visibility-section` | region | Pronunciation visibility | Fresh-word pronunciation controls that keep readings visible for recent study items and quieter for mature items. |
| `reader.pronunciation-visibility-toggle` | button | Fresh words only toggle | Turns the pronunciation freshness filter on or off inside the reader options dialog. |
| `reader.japanese-reading-display-section` | region | Japanese reading display | Japanese-only setting for choosing romaji or hiragana furigana in sentence token readings and the selected-token inspector. |
| `reader.japanese-reading-romaji` | button | Romaji display | Shows Japanese readings in Latin-script romaji. |
| `reader.japanese-reading-furigana` | button | Furigana display | Shows Japanese readings in hiragana/furigana. |
| `reader.srs-color-section` | region | Study-stage coloring | Reader option that tints tokens by the weakest SRS stage so unfamiliar words and mastered words read differently at a glance. |
| `reader.srs-color-toggle` | button | Color words by stage toggle | Turns the study-stage token coloring on or off inside the reader options dialog. |
| `reader.sentence-help-section` | region | Sentence help | Reader options panel section for the meaning-line reveal card and token lookup trace controls. |
| `reader.meaning-line-section` | region | Meaning line | Reader toggle that shows or hides the compact meaning-line reveal card below the sentence tools. |
| `reader.meaning-line-toggle` | button | Meaning line toggle | Turns the meaning-line reveal card on or off in the reader settings panel. |
| `reader.meaning-line-reveal-all-section` | region | Reveal all meaning-line words | Reader option for showing the complete meaning line when translation alignment leaves words unrevealed. |
| `reader.meaning-line-reveal-all-toggle` | button | Reveal all meaning-line toggle | Persists automatic full meaning-line reveal in reader settings. |
| `reader.meaning-line-reveal-all-action` | button | Reveal all meaning-line action | Reveals every target-language word in the current meaning line when token alignment leaves a remainder. |
| `reader.definition-trace-section` | region | Definition trace | Admin-only reader toggle that shows or hides the token-inspector lookup trace for debugging fallback behavior. |
| `reader.definition-trace-toggle` | button | Definition trace toggle | Turns the token-inspector lookup trace on or off in the reader settings panel. |
| `reader.lookup-fallback-section` | region | Lookup fallback | Toggle for the reader's Google Cloud Translation fallback, monthly usage summary, and cost note when local lexicon lookup misses. |
| `reader.page-card` | card | Reader page | Page image/reflowed text reading surface and sentence content. |
| `reader.navigation-card` | region | Reader pager | Compact previous/next sentence controls, swipe navigation, page/sentence position pill, sentence-aware resume position, and shared touch-safe tooltips. |
| `reader.beginning-action` | button | Start at beginning | Visible escape hatch that takes a learner directly to the first reader page when they open a book away from its beginning. |
| `reader.sentence-tools` | region | Sentence display and translation tools | Single-line language-aware four- or five-control row beneath the session summary for token display, sentence audio, translation, source, and inline speed stepping; labels compact to icon-led controls on narrow screens with bounded shared tooltips before speech-synchronized token highlighting. |
| `reader.token-mode-button` | button | Word/character mode | Language-dependent control with a 文/字 glyph exposed for Chinese, Japanese, and Korean readers to toggle the sentence display between word and character units. |
| `reader.sentence-audio-button` | button | Sentence audio playback | Plays the selected sentence aloud and records the pronunciation playback interaction for learner history. |
| `reader.sentence-audio-speed` | region | Sentence audio speed | Inline speedometer control with minus/plus stepping across 0.25x, 0.5x, 0.75x, and 1x browser speech playback; new readers start at 0.75x. |
| `reader.sentence-feedback-button` | button | Sentence correction feedback | Compact star/Sentence action at the bottom-right of the sentence token panel that opens a targeted correction report with the active sentence captured as context. |
| `reader.page-bookmark` | button | Page bookmark | Bookmark control inside the page position segment, saving the current page to the page bookmark list. |
| `reader.sentence-bookmark` | button | Sentence bookmark | Bookmark control inside the sentence position segment, saving the active sentence to the sentence bookmark list. |
| `reader.source-sentence-card` | card | Source sentence | Collapsible raw source sentence panel without tokenization. |
| `reader.sentence-translation-card` | card | Sentence translation | Collapsible translation panel for the selected sentence or page fallback, including translation provenance. |
| `reader.translation-reveal-card` | card | Progressive translation reveal | Tap-driven sentence meaning scaffold that stays collapsed by default and reveals the sentence translation incrementally as different tokens are tapped. |
| `reader.bookmark-toast` | status | Bookmark confirmation | Temporary confirmation of page or sentence bookmark saves and removals. |
| `reader.audio-speed-toast` | status | Audio speed confirmation | Temporary confirmation of the selected audio speed and its relative pacing after a speed adjustment. |
| `reader.completion-summary-card` | card | Completion summary | Congrats card shown after the final page or article sentence, with article stats and the mark-read return-to-library action. |
| `reader.page-by-page-upload-state` | card | Page-by-page upload state | Inline upload and OCR processing state at the end of the current page; session timing pauses while the next page is being prepared and resumes when the first next page is ready. |
| `reader.page-frontier-upload-button` | button | Page frontier upload control | Plus/arrow control at the furthest processed sentence that opens the camera or file picker, shows circular upload/OCR progress, and continues to the first ready page. Long-press opens multi-file selection. |
| `reader.page-upload-input-mode` | control | Page upload input mode | Reader setting for automatic, camera, or file-picker input when adding the next page to a page-by-page source. |
| `reader.end-of-content-page` | region | End-of-content transition | Retained compatibility surface for the earlier dedicated end-of-content flow; the live reader now keeps the current sentence visible and uses the inline frontier control. |
| `surface.page-by-page-append-card` | card | Page-by-page append | At the end of an uploaded page-by-page source, queues and appends the next photographed pages before continuing in the reader. |
| `reader.sentence` | region | Reader sentence | One readable sentence with sentence-level timing and interaction state. |
| `reader.token` | region | Reader token | Clickable word/character unit with lookup and exposure behavior. |
| `reader.token-inspector` | card | Token inspector | Selected token, Japanese furigana, pronunciation, audio, syllable playback, reading display toggle, level, definitions, study-save state, custom list picker, part-of-speech badge, remembered/missed feedback actions, and an admin-only Lexicon/Google Translate load-timing pill. |
| `reader.word-audio-button` | button | Word audio playback | Plays the selected token aloud from the token inspector and records the pronunciation playback interaction for learner history. |
| `reader.definition-remembered-button` | button | Remembered | Marks the selected token as remembered after lookup and records the feedback event for the learner profile. |
| `reader.definition-missed-button` | button | Missed | Marks the selected token as missed after lookup and records the feedback event for the learner profile. |
| `reader.definition-correction-button` | button | Word correction feedback | Compact star/Word action in the token inspector that opens a targeted correction report with the selected word, reading, definition, and source sentence captured as context. |
| `reader.definition-segment` | button | Syllable playback chip | Plays an individual syllable from the token inspector while keeping the syllable breakdown visible. |
| `reader.russian-syllable-toggle` | button | Russian syllable display toggle | Switches the token-inspector syllable chips between romanized and Cyrillic labels. |
| `reader.study-save-button` | button | Study save action | Saves the selected token into the learner's study vocabulary list with source metadata. |
| `reader.custom-list-picker-button` | button | Custom list picker | Opens the token-inspector menu for assigning the selected token to a custom vocabulary list. |
| `reader.custom-vocabulary-list-menu` | region | Custom vocabulary list menu | Local-first picker for creating or choosing custom vocabulary lists in the token inspector. |
| `reader.sentence-hsk-chart` | card | Sentence HSK chart | HSK level plotted across the readable tokens in the selected sentence. |
| `reader.tools-card` | region | Reader tools | Reader utility section nested inside the options dialog for sentence chart, page image control, book frequency, dictionary wiring, reading profile, and page navigation. |
| `reader.page-jump-control` | control | Page jump | Page-number input that navigates directly to a target page while the API prepares the target and nearby buffer pages. |
| `reader.book-frequency-card` | card | Book frequency | Nested book-wide frequency panel inside the collapsed reader tools drawer. |
| `reader.dictionary-card` | card | Dictionary wiring | Nested dictionary/lexical-entry lookup status and source details inside the collapsed reader tools drawer. |
| `reader.reading-profile-card` | card | Reading profile | Nested learner exposure, progress, and remembered/missed token feedback details inside the collapsed reader tools drawer. |
| `reader.unavailable-state` | card | Reader unavailable | Missing page or unavailable extraction state, with direct recovery paths to the library, text import, and practice-article generator when the reader has no valid book. |

### `admin-feedback` — `/admin/feedback`

Source: `apps/web/app/admin/feedback/page.tsx` (`AdminOnly`), `apps/web/components/admin-feedback-view.tsx` (`AdminFeedbackView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `admin-feedback.page` | page | Feedback operations | Admin-only feedback review surface for tester identity, lifecycle, planning, and tracker alignment. |
| `admin-feedback.summary` | region | Triage pulse | Compact counts for reports needing review, in progress, with screenshots, and tracked in GitHub, with quick status filters. |
| `admin-feedback.metrics` | region | Feedback metrics | Local operational metrics for tester review backlog, review/resolution timing, total reports, routes, categories, and affected languages. |
| `admin-feedback.filters` | region | Feedback filters | Search plus tester, status, language, route, category, severity, priority, screenshot, and GitHub-state filters. |
| `admin-feedback.tester-list` | region | Tester directory | Compact selectable tester rows with expandable details and inline private nickname editing. |
| `admin-feedback.record-list` | region | Feedback report list | Selectable list of tester reports with status and context summaries. |
| `admin-feedback.detail` | card | Feedback detail | Original report, context, status controls, GitHub linkage, and lifecycle history. |
| `admin-feedback.screenshots` | region | Screenshot review | Admin-only attachment gallery with an explicit action to request AI analysis of stored screenshots. |
| `admin-feedback.plan` | region | AI implementation plan | Reproduction steps, tasks, acceptance criteria, suggested tests, risks, priority, and effort. |
| `admin-feedback.resolution` | region | Resolution and tester review | Admin decision note, implementation build, and verification instructions used to send a completed feature back to its tester. |

### `admin` — `/admin`

Source: `apps/web/components/admin-usage-view.tsx` (`AdminUsageView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `admin.nav` | region | Admin section navigation | Shared sub-navigation across Platform usage, Feedback, Themes, and Roadmap with the current section highlighted. |
| `admin.page` | page | Admin console | Admin-only aggregate platform usage surface. |
| `admin.hero` | region | Admin console header | Admin navigation and local-data scope explanation. |
| `admin.summary-grid` | region | Usage summary | High-level profile, reading, and exposure metrics. |
| `admin.profile-summary-card` | card | Profile summary | Total profiles and recent active-profile counts. |
| `admin.reading-summary-card` | card | Reading sessions | Total reading sessions and 30-day active-profile count. |
| `admin.reading-depth-card` | card | Reading depth | Page and sentence completion totals. |
| `admin.exposure-summary-card` | card | Reading time | Active time and unique exposed-word totals. |
| `admin.activity-card` | card | Reading activity | Recent aggregate reading activity by day, with toggleable bars and a smooth line view. |
| `admin.breakdown-card` | card | Platform signals | Book, feedback, and translation usage totals. |
| `admin.scope-note` | region | Analytics scope note | States what the local usage snapshot includes and excludes. |
| `admin.auth-status-card` | card | Permission check | Explains the signed-in account, server-resolved TextPlex role, and global usage permission when admin access is denied. |
| `admin.analytics-funnel-card` | card | Activation funnel | Directional user progression from activation through repeated value, paywall intent, and conversion. |
| `admin.analytics-value-card` | card | Repeated value | Leading indicators for active users, repeated value, AI usage, and feedback participation. |
| `admin.analytics-paywall-card` | card | AI / paywall demand | Privacy-safe early signal for users reaching limits, pricing surfaces, paywalls, or unlock actions. |
| `admin.analytics-feature-card` | card | Feature demand | Captured feature-event volume and unique-user usage in the analytics window. |
| `admin.analytics-feature-filter` | region | Feature-demand audience filter | Bottom-of-card role filter for comparing feature demand across members, testers, admins, or all users. |
| `admin.analytics-retention-card` | card | Retention cohorts | Cohort return rates for one, seven, and thirty days where the cohort is mature enough. |
| `admin.analytics-user-watchlist` | region | Users approaching conversion | Pseudonymous users showing repeated value or paywall-intent signals. |

### `admin-theme` — `/admin/themes`

Live source: `apps/web/components/admin-theme-console.tsx` (`AdminThemeConsole`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `admin-theme.page` | page | Theme console | Admin-only theme creation and editing surface for catalog metadata, visual tokens, wallpaper references, and review-before-save AI suggestions. |
| `admin-theme.list` | region | Theme catalog list | Selectable list of hosted themes with swatches, IDs, and price state. |
| `admin-theme.editor` | card | Theme definition editor | Edits stable theme identity, description, price, availability, sort order, color scheme, and pattern path. |
| `admin-theme.ai-assistant` | card | Assisted design | Accepts a concept prompt and optional reference image, then applies a structured AI suggestion to the unsaved draft. |
| `admin-theme.preview` | card | Draft theme preview | Shows the current draft as a small reading atmosphere preview before saving. |
| `admin-theme.color-controls` | region | Color and surface controls | Structured token controls with native color picking, brightness adjustment, and surface/gradient value editing. |
| `admin-theme.loading-state` | region | Theme console loading | Loading state while the hosted admin catalog is fetched. |
| `admin-theme.error-state` | card | Theme console error | Authentication, API, or validation error for the admin theme console. |

### `tester` — `/tester`

Source: `apps/web/app/tester/page.tsx`, `apps/web/components/tester-console-view.tsx` (`TesterConsoleView`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `tester.page` | page | Tester console | Authenticated tester workspace for reviewing submitted feedback and TextPlex responses. |
| `tester.summary` | region | Tester feedback summary | Counts submitted reports, open reports, and fixes awaiting tester review. |
| `tester.record-list` | region | Tester report history | Selectable list of the authenticated tester's feedback reports. |
| `tester.detail` | card | Tester report detail | Original feedback, status, context, and response timeline for the selected report. |
| `tester.original-feedback` | region | Original feedback | Immutable copy of the tester's submitted feedback text. |
| `tester.verification` | region | Tester verification | Build instructions and response actions when an admin sends an implemented fix for review. |
| `tester.timeline` | region | Feedback timeline | Status changes, GitHub linkage, and tester responses for the selected report. |

### `analysis` — `/analysis/:bookId`

Live source: `apps/web/components/surface-views.tsx` (`AnalysisSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockAnalysisSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `analysis.route-hero` | region | Analysis hero | Shared route hero with analysis-specific title, links, and page/token metrics. |
| `analysis.lexical-entries-card` | card | Top lexical entries | Compact lexical grid with pronunciation, meaning, HSK badge, and page exposure context. |
| `analysis.summary-card` | card | Analysis summary | Book, language, and extraction availability summary. |
| `analysis.generation-prompt-card` | card | Generated article prompt | Saved generation metadata, selected learner window, and the exact prompt text used for a generated article. |
| `analysis.sentence-hsk-chart` | card | Sentence HSK chart | Ordered sentence-level HSK averages across the extracted text. |
| `analysis.page-hsk-chart` | card | Page HSK chart | Ordered page-level HSK averages across the extracted text. |
| `analysis.loading-state` | region | Analysis loading | Loading skeleton while the book analysis is fetched. |
| `analysis.error-state` | card | Analysis error | Analysis request error. |

The standalone analysis preview currently contains additional analysis regions that are not yet present in the live Next analysis route. They remain named here so the preview is auditable and the planned promotion does not lose component identity:

| ID | Type | Visible name | Source | Purpose |
| --- | --- | --- | --- | --- |
| `analysis.sample-card` | card | Sample text | `site/analysis-preview.html` | Text excerpt and provenance note used as the analysis input preview. |
| `analysis.difficulty-card` | card | Overall difficulty | `site/analysis-preview.html` | `/100` dial currently presented as a text difficulty score. |
| `analysis.estimated-level-card` | card | Estimated level | `site/analysis-preview.html` | HSK/CEFR/TOPIK-style level label and fit note. |
| `analysis.vocabulary-distribution-card` | card | Vocabulary level distribution | `site/analysis-preview.html` | Level-band distribution bar and labels. |
| `analysis.average-vocabulary-level-card` | card | Average vocabulary level | `site/analysis-preview.html` | Average level metric. |
| `analysis.unknown-words-card` | card | Unknown words | `site/analysis-preview.html` | Unknown-word count and ratio metric. |
| `analysis.estimated-comprehension-card` | card | Estimated comprehension | `site/analysis-preview.html` | Comprehension estimate; must remain distinct from book difficulty. |
| `analysis.recommendation-card` | card | Recommended for you | `site/analysis-preview.html` | Reading recommendation derived from analysis and learner context. |

### `activity` — `/activity`

Live source: `apps/web/components/surface-views.tsx` (`ActivitySurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockActivitySurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `activity.route-hero` | region | Activity hero | Shared hero with event-count and state metrics. |
| `activity.pages-progress-chart` | card | Pages read over time | Cumulative page progress by active reading day for multi-page books; empty for article-only history. |
| `activity.sentences-progress-chart` | card | Sentences read over time | Cumulative sentence progress by active reading day across books and articles. |
| `activity.recent-events-card` | card | Recently read | Book/article groups ordered by their most recent reading activity, with individual events collapsed by default. |
| `activity.recent-books-list` | region | Recently read books | Ordered list of books/articles represented in the activity feed. |
| `activity.recent-book-group` | region | Recent book group | Expandable book/article summary showing its latest reading time and event count. |
| `activity.event-list` | region | Reading event list | Expandable list of reading, lookup, study, and session events for one book/article. |
| `activity.event-item` | region | Activity event | One event row with kind, timestamp, and detail inside an expandable book/article group. |
| `activity.loading-state` | region | Activity loading | Loading skeleton for the activity request. |
| `activity.error-state` | card | Activity error | Activity request error. |

### `import` — `/import`

Live source: `apps/web/components/surface-views.tsx` (`ImportSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockImportSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `import.route-hero` | region | Import hero | Supported-input, upload, and paste capability summary. |
| `import.form` | card | Import form | Switches between paste-text and PDF/EPUB/TXT-upload flows, uses a fixed target-language dropdown, explains the bounded reader translation buffer and progressive PDF page extraction, and submits real API imports. |
| `import.photo-pages-card` | card | Photo page batch | Adds up to 12 JPG/PNG page photos one at a time, shows ordered previews, and supports reordering/removing pages before import. |
| `import.wikipedia-random-card` | region | Random Wikipedia import | Target-language action that asks the API to select and import a random article from the selected-language Wikipedia. |
| `import.wikipedia-random-button` | button | Import random Wikipedia article | Starts a random target-language Wikipedia import and retains the returned book in the normal import-progress flow. |
| `import.progress-card` | card | Import progress | Shows the latest submitted book status and background extraction percentage, retained across route changes. |
| `import.recent-books-card` | card | Recent books | Recently imported book records and processing status. |
| `import.book-item` | region | Recent book item | One recent-book row with language, status, and timestamp. |
| `import.loading-state` | region | Import loading | Loading skeleton for import metadata. |
| `import.error-state` | card | Import error | Import metadata request error. |

### `progress` — `/progress`

Live source: `apps/web/components/surface-views.tsx` (`ProgressSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockProgressSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `progress.route-hero` | region | Progress hero | Session, sentence, and vocabulary-row metrics. |
| `progress.profile-summary-card` | card | Profile summary | Unique words, characters, and reading-speed metrics. |
| `progress.reading-insight-card` | card | Reading insight | Plain-language interpretation of the learner’s sentence, book, and vocabulary exposure progress with links to review and history. |
| `progress.learning-track-card` | card | Learning track | Selected learning track and next step. |
| `progress.books-card` | card | Books | Per-book page, sentence, and active-time progress. |
| `progress.book-item` | region | Progress book item | One book’s progress row. |
| `progress.loading-state` | region | Progress loading | Loading skeleton for progress data. |
| `progress.error-state` | card | Progress error | Progress request error. |

### `profile` — `/profile`

Live source: `apps/web/components/surface-views.tsx` (`ProfileSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockProfileSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `profile.route-hero` | region | Profile hero | Learner-history summary and profile metrics. |
| `profile.learning-summary-card` | card | Learning summary | Learner exposure and reading-speed summary. |
| `profile.selected-track-card` | card | Selected track | Current benchmark/learning-track details. |
| `profile.hosted-account-card` | card | Hosted account | Authenticated hosted profile identity, editable display name and learning path, and hosted settings count; demo uses a clearly labeled packaged account. |
| `profile.learning-track-select` | control | Learning path selector | Existing users can change the hosted learning path after signup or onboarding. |
| `profile.email-change-form` | region | Email change form | Authenticated request flow for changing the Supabase Auth sign-in email with confirmation required from the current and new addresses. |
| `profile.migration-card` | card | Local profile migration | Preview and non-destructive merge state for anonymous local learner data. |
| `profile.preferences-card` | card | Preferences | Saved app-wide settings and current theme values; reader-specific controls live in the reader settings panel. |
| `profile.book-activity-card` | card | Book activity | Per-book reading activity history. |
| `profile.loading-state` | region | Profile loading | Loading skeleton for profile data. |
| `profile.error-state` | card | Profile error | Profile request error. |

### `theme-settings` — `/profile/themes`

Live source: `apps/web/components/surface-views.tsx` (`ThemeSettingsSurfaceView`). This route owns personal appearance behavior for the learner's selected theme.

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `theme-settings.route-hero` | region | Theme settings hero | Personal appearance description, Settings and Theme Shop routes, and selected-theme behavior metrics. |
| `theme-settings.app-theme-card` | card | App theme | Featured global theme selector and save action. |
| `theme-settings.behavior-card` | card | Theme behavior | Follow-device, opacity, tiling, and background-grid controls. |
| `theme-settings.loading-state` | region | Theme settings loading | Loading state for personal appearance settings. |
| `theme-settings.error-state` | card | Theme settings error | Theme settings load/save error. |

### `theme-shop` — `/themes`

Live source: `apps/web/components/surface-views.tsx` (`ThemeShopSurfaceView`). This standalone market surface owns theme discovery, previews, collection offers, ownership status, and pricing; appearance preferences remain under `/profile/themes`.

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `theme-shop.route-hero` | region | Theme Shop hero | Storefront introduction with catalog, collection, preview metrics, and links to browsing and My Themes. |
| `theme-shop.storefront-intro` | region | Theme Shop promises | Store-specific explanation of previews, reading-focused artwork, and theme ownership. |
| `theme-shop.catalog-card` | card | Theme catalog | Complete theme collection with live previews. |
| `theme-shop.selected-preview` | card | Selected theme preview | Large live wallpaper preview that loads a thumbnail first and swaps to the full image after selection. |
| `theme-shop.store-controls` | region | Theme shop controls | Search field and browsing controls for navigating the storefront catalog. |
| `theme-shop.search` | region | Theme search | Search field for finding themes by title, description, or catalog ID. |
| `theme-shop.category-nav` | region | Theme collection navigation | Horizontal collection tabs for Included, Fruit, Vegetable, Seasonal, International, Console, and All Collections. |
| `theme-shop.mode-tabs` | region | Theme mode filters | All, Daylight, and Night filters for paired theme families. |
| `theme-shop.catalog-grid` | region | Filtered theme catalog | Horizontal rail of server-catalog theme options with ownership and preview status. |
| `theme-shop.category-grid` | region | Dedicated category grid | Full vertically scrolling category grid reached from a collection rail arrow. |
| `theme-shop.theme-option` | region | Theme option | One selectable visual theme with swatch, name, and description. |
| `theme-shop.collections-carousel` | region | All Collections carousel | One-at-a-time collection offer browser for the growing bundle catalog. |
| `theme-shop.collection-slide` | card | Collection slide | Focused bundle offer with included themes, price, savings, and preview action. |
| `theme-shop.collection-arrows` | region | Collection carousel arrows | Previous and next controls for moving through collection offers. |
| `theme-shop.collection-dots` | region | Collection page dots | Direct-access pagination controls for the collection carousel. |
| `theme-shop.collection-rail` | region | Theme collection rail | Horizontal theme-card rail for each catalog collection with a section arrow. |
| `theme-shop.bundle-card` | card | Theme bundle | A discounted topical collection showing included themes, individual total, bundle price, and savings. |
| `theme-shop.empty-state` | card | Theme catalog empty state | Clear recovery state when search and filters produce no matching themes. |
| `theme-shop.preview-tuning` | region | Wallpaper preview tuning | Admin-only development controls for comparing full-image, cropped, and manually positioned wallpaper treatments inside the theme card frame. |

### `search` — `/search`

Live source: `apps/web/components/surface-views.tsx` (`SearchSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockSearchSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `search.route-hero` | region | Search hero | Search scope, query, and state metrics. |
| `search.query-card` | card | Search controls | Query input and search action. |
| `search.results-card` | card | Search results | Book, sentence, and lexical-entry results. |
| `search.result-item` | region | Search result | One result row with type, score, snippet, book, and page. |
| `search.loading-state` | region | Search loading | Loading skeleton while a query runs. |
| `search.error-state` | card | Search error | Search request error. |

### `settings` — `/settings`

Live source: `apps/web/components/surface-views.tsx` (`SettingsSurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockSettingsSurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `settings.route-hero` | region | Settings hero | Profile-storage, theme, and reader-mode metrics. |
| `settings.preferences-card` | card | Preferences form | Theme-settings link and reader speech-voice preference for normal learner accounts. |
| `settings.developer-tools-card` | card | Developer controls | Admin-only inventory-labels toggle, version-footer toggle, and implementation-roadmap entry. |
| `settings.theme-settings-link` | button | Open theme settings | Routed link from Settings to the consolidated theme settings page. |
| `settings.inventory-labels-toggle` | control | Inventory labels | Admin-only debug toggle that shows the app's inventory label overlay for QA and code review. |
| `settings.build-footer-toggle` | control | Build details | Admin-only local browser preference that adds a diagnostic note to the always-visible version, build timestamp, and time-since-build card. |
| `settings.speech-voice-toggle` | control | Speech voice | Male/female speech preference that is mirrored into the reader audio controls and persisted through the settings API. |
| `settings.roadmap-card` | card | Vocabulary roadmap | Direct Settings entry to the language-pack implementation roadmap. |
| `settings.loading-state` | region | Settings loading | Loading skeleton for settings. |
| `settings.error-state` | card | Settings error | Settings load/save error. |

### `study` — `/study`

Live source: `apps/web/components/surface-views.tsx` (`StudySurfaceView`); demo source: `apps/web/components/mock-route-views.tsx` (`MockStudySurfaceView`).

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `study.route-hero` | region | Study hero | Queue size and learner-state metrics. |
| `study.programs-card` | card | Program introduction | Curated level vocabulary from the active language programs. |
| `study.program-group` | region | Program group | One collapsible language-program curriculum block. |
| `study.program-level` | region | Program level | One level within a language program, including its introductory vocabulary slice. |
| `study.program-item` | region | Program item | One curated vocabulary item inside a study-program level with a tap-to-expand axis and metadata panel. |
| `study.program-item-toggle` | button | Program item toggle | Opens and closes one curated vocabulary item inside a study-program level. |
| `study.program-item-details` | region | Program item details | Expanded axis chart and metadata panel for one curated vocabulary item. |
| `study.program-item-axis-chart` | card | Axis SRS chart | Spider chart showing the per-axis SRS stage for one program vocabulary item. |
| `study.program-practice-link-summary` | button | Practice this level | Launches the one-by-one practice page from the collapsed program-level summary. |
| `study.queue-card` | card | Due items | Collapsible due-vocabulary area with a forecast chart and language-grouped review subcards. |
| `study.queue-card-toggle` | button | Due items toggle | Opens and closes the due-items card. |
| `study.due-review-chart` | region | Upcoming review forecast | Adjustable-horizon bar chart anchored at the current time and labeled with coarse time-frame check-ins over the upcoming period. |
| `study.queue-language-group` | region | Due language group | One collapsible language subcard inside the due-items card with a top-right expand toggle and language-specific study action. |
| `study.queue-language-group-toggle` | button | Due language toggle | Opens and closes one language subcard in the due-items card. |
| `study.queue-language-group-details` | region | Due language details | Expanded due-term pills, language-specific study-source actions, and reminder controls for one language. |
| `study.queue-language-term-origin-legend` | region | Term source legend | In-section key explaining the distinct Glossed and Program term-pill colors. |
| `study.queue-language-term-pill` | button | Due term pill | One compact due term pill that opens a metadata and axis panel inside an expanded language subcard. |
| `study.queue-language-term-details` | region | Due term details | Expanded metadata panel for one due term, including the axis-stage radar chart. |
| `study.queue-language-term-axis-chart` | card | Axis SRS chart | Spider chart showing the per-axis SRS stage for one due term. |
| `study.queue-language-source-actions` | region | Study source actions | Group of program, glossed, and combined study buttons inside one due-language subcard. |
| `study.queue-language-program` | button | Study program words | Launches a program-only practice session for one due-language subcard. |
| `study.queue-language-glossed` | button | Study glossed words | Launches a glossed-vocabulary practice session for one due-language subcard. |
| `study.queue-language-both` | button | Study both | Launches a combined program-and-glossed practice session for one due-language subcard. |
| `study.queue-language-notify` | button | Notify me | Captures a reminder request for a language with no items due yet. |
| `study.review-practice-link` | button | Start review session | Launches the one-by-one review page for due or saved vocabulary. |
| `study.glossed-vocabulary-card` | card | Glossed vocabulary | Collapsible language-grouped terms captured during reading sessions when a word needed help, with source metadata and axis-stage details. |
| `study.glossed-vocabulary-card-summary` | button | Glossed vocabulary toggle | Opens and closes the glossed-vocabulary card. |
| `study.glossed-vocabulary-language-group` | region | Study language group | One collapsible language bucket inside the glossed vocabulary list. |
| `study.glossed-vocabulary-item` | region | Glossed vocabulary item | One expandable saved term row that shows the term, pronunciation, and English meaning before the full source metadata. |
| `study.glossed-vocabulary-item-toggle` | button | Saved term toggle | Opens and closes the full metadata inspector for one glossed term. |
| `study.glossed-vocabulary-item-details` | region | Glossed term details | Expanded metadata panel for one glossed term, including the axis-stage radar chart and full source metadata. |
| `study.glossed-vocabulary-item-axis-chart` | card | Axis SRS chart | Spider chart showing the per-axis SRS stage for one glossed term. |
| `study.practice-page` | page | Vocabulary practice | One-at-a-time practice route for program study, glossed vocabulary study, combined study, or due-item review. |
| `study.practice-card` | card | Practice card | Active practice card with ordered word introductions followed by randomized axis drills, reveal feedback, intro pronunciation, typed-answer, and progression controls. |
| `study.practice-pronunciation-guide` | region | Pronunciation guide | Compact pronunciation line, audio button, and syllable breakdown shown only on the first introduction card for a term. |
| `study.practice-answer-input` | region | Answer input | Single-line learner response field for the active practice term. |
| `study.practice-input-composition` | region | Japanese input composition | Visible Japanese-only helper showing the composed answer while romaji is converted to hiragana; direct kana remains available. |
| `study.practice-answer-submit` | button | Check answer | Submits the typed practice response against the stored meaning. |
| `study.practice-navigation` | region | Practice navigation | Previous, next-word, check-answer, and gated next controls for the active practice card, with the intro phase advancing immediately and assessment cards unlocking after a checked answer or Not sure response. |
| `study.practice-previous` | button | Previous term | Moves to the previous practice term. |
| `study.practice-next` | button | Next term | Moves to the next intro or assessment card, and advances to the next introduction chunk when the current chunk is finished. |
| `study.practice-not-sure` | button | Not sure | Reveals the meaning and allows the learner to continue when they cannot provide an answer during an assessment card. |
| `study.practice-answer-feedback` | region | Answer feedback | Correct/incorrect feedback after checking the typed response. |
| `study.practice-auto-advance` | region | Correct-answer auto-advance | Short, visible countdown after a correct answer before the next assessment card opens. |
| `study.practice-auto-advance-cancel` | button | Stay on current card | Cancels the correct-answer auto-advance countdown so the learner can review the current card. |
| `study.loading-state` | region | Study loading | Loading skeleton for the study queue. |
| `study.error-state` | card | Study error | Study queue request error. |

### `roadmap` — `/roadmap`

Source: `apps/web/app/roadmap/page.tsx` (`RoadmapPage`)

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `roadmap.route-hero` | region | Roadmap hero | Language-pack tracker title, preview badge, and status metrics. |
| `roadmap.implementation-plan-card` | card | Implementation plan | Ordered language-pack implementation steps. |
| `roadmap.plan-step` | region | Plan step | One implementation step with status and description. |
| `roadmap.current-focus-card` | card | Current focus | Explanation of the active Korean language-pack work. |
| `roadmap.language-tracker-card` | card | Per-language tracker | Container for language-pack progress cards. |
| `roadmap.language-card` | card | Language track | One language’s status, progress meter, pack, benchmark, and next step. |

## Standalone preview aliases

The active `site/` HTML previews are alternate implementations of the product surfaces above. They use the same inventory IDs, so a card added to a preview should update the corresponding route section rather than creating a second name. `site/legacy/` is excluded because it is an archived implementation.

| Preview page | File | Inventory mapping |
| --- | --- | --- |
| Home | `site/home-preview.html` | `home` |
| Library | `site/library-preview.html` | `library` |
| Library detail | `site/library-detail-preview.html` | `book-detail` |
| Reader | `site/reader-preview.html` | `reader` |
| Analysis | `site/analysis-preview.html` | `analysis` |
| Import | `site/import-preview.html` | `import` |
| Search | `site/search-preview.html` | `search` |
| Progress | `site/progress-preview.html` | `progress` |
| Profile | `site/profile-preview.html` | `profile` |
| Study | `site/study-preview.html` | `study` |
| Activity | `site/activity-preview.html` | `activity` |
| Vocabulary | `site/vocabulary-preview.html` | `preview.vocabulary` (preview-only page) |
| Roadmap | `site/roadmap-preview.html` | `roadmap` |

The Home preview also has preview-only regions that are not in the current Next Home route:

| ID | Type | Visible name | Source | Purpose |
| --- | --- | --- | --- | --- |
| `preview.home.continue-rail` | region | Continue reading | `site/home-preview.html` | Current reading items and progress bars. |
| `preview.home.recent-analyses` | region | Recent analyses | `site/home-preview.html` | Recent analysis rows linking to the analysis preview. |
| `preview.home.recent-analysis-row` | region | Recent analysis row | `site/preview-router.js` | One analysis row with title, level tag, date, and score dial. |
| `preview.home.goals` | region | Goals | `site/home-preview.html` | Weekly reading goal and streak summary. |
| `preview.home.weekly-reading-goal-card` | card | Weekly reading goal | `site/home-preview.html` | Reading target progress. |
| `preview.home.streak-card` | card | Streak | `site/home-preview.html` | Consecutive reading streak. |

### `preview.vocabulary` — preview-only Vocabulary page

Source: `site/vocabulary-preview.html`

| ID | Type | Visible name | Purpose |
| --- | --- | --- | --- |
| `preview.vocabulary.summary` | region | Vocabulary summary | New, review, and mastered vocabulary counts. |
| `preview.vocabulary.new-card` | card | New | Count of newly encountered vocabulary. |
| `preview.vocabulary.review-card` | card | Review | Count of vocabulary items due for review. |
| `preview.vocabulary.mastered-card` | card | Mastered | Count of mastered vocabulary items. |
| `preview.vocabulary.insights-card` | card | Insights | Time-filtered vocabulary learning insights. |
| `preview.vocabulary.growth-card` | card | Growth | Vocabulary growth trend visualization. |
| `preview.vocabulary.suggested-card` | card | Suggested for you | Recommended vocabulary items. |

## Cross-cutting implementation notes

- `RoutePage` owns the shared hero and metrics structure for Analysis, Activity, Import, Progress, Profile, Search, Settings, Study, and Roadmap.
- Live and demo implementations intentionally share route and card IDs. If their layouts diverge, document the divergence in the route section before adding a new ID.
- `GlobalThemePicker` is rendered on My Themes as `theme-settings.app-theme-card`; the theme provider remains a shell-level region because it affects every route.
- My Themes at `/profile/themes` owns appearance behavior and personal theme management. Theme Shop at `/themes` independently owns catalog discovery, collection offers, preview status, ownership, and pricing.
- The standalone `site/` preview mirrors these product surfaces. Its active HTML aliases and preview-only Vocabulary surface are listed above.

## Tracker cross-reference

Use this section to move from a component ID to the issue that owns its pending work. When an issue changes scope, update both the issue and this table.

| Inventory IDs | Tracker item | Relationship |
| --- | --- | --- |
| `preview.home.recent-analyses`, `preview.home.recent-analysis-row`, `analysis.difficulty-card`, `analysis.estimated-level-card`, `analysis.vocabulary-distribution-card`, `analysis.average-vocabulary-level-card`, `analysis.unknown-words-card`, `analysis.estimated-comprehension-card`, `analysis.recommendation-card` | [#42](https://github.com/TextPlex/textplex/issues/42) | Define the canonical difficulty/expected-HSK metric and wire the live and preview consumers. |
| `analysis.*`, `reader.*` analytics regions | [#31](https://github.com/TextPlex/textplex/issues/31) | Broader reader-detail analytics work; #42 owns the difficulty/HSK metric contract. |
| `reader.beginning-action` | [#93](https://github.com/TextPlex/textplex/issues/93) | Discoverable escape hatch for opening a book at its first page when the reader starts elsewhere. |
| `study.practice-input-composition`, `study.practice-auto-advance`, `study.practice-auto-advance-cancel` | [#88](https://github.com/ajth-work/textplex/issues/88) | Japanese Study romaji-to-hiragana composition with a visible, cancellable correct-answer auto-advance. |
| `admin-feedback.page`, `admin-feedback.summary`, `admin-feedback.metrics`, `admin-feedback.filters`, `admin-feedback.tester-list`, `admin-feedback.record-list`, `admin-feedback.detail`, `admin-feedback.screenshots`, `admin-feedback.plan`, `admin-feedback.resolution` | [#79](https://github.com/TextPlex/textplex/issues/79)–[#84](https://github.com/TextPlex/textplex/issues/84) | Feedback operations surface for reviewing tester reports, opening GitHub-linked issues, maintaining private tester nicknames, recording triage/resolution decisions, and monitoring local feedback health. Roadmap: `docs/FEEDBACK_CONSOLE_ADMIN_ROADMAP.md`. |
| `tester.page`, `tester.summary`, `tester.record-list`, `tester.detail`, `tester.original-feedback`, `tester.verification`, `tester.timeline`, `shell.feedback-notifications` | [#79](https://github.com/TextPlex/textplex/issues/79)–[#84](https://github.com/TextPlex/textplex/issues/84) | Authenticated tester feedback console and notification-driven implementation verification loop. |
| `admin.nav`, `admin.page`, `admin.hero`, `admin.summary-grid`, `admin.profile-summary-card`, `admin.reading-summary-card`, `admin.reading-depth-card`, `admin.exposure-summary-card`, `admin.activity-card`, `admin.breakdown-card`, `admin.scope-note`, `admin.auth-status-card`, `admin.analytics-funnel-card`, `admin.analytics-value-card`, `admin.analytics-paywall-card`, `admin.analytics-feature-card`, `admin.analytics-feature-filter`, `admin.analytics-retention-card`, `admin.analytics-user-watchlist` | [#97](https://github.com/ajth-work/textplex/issues/97) | Admin-only aggregate usage and paid-value signal console backed by local profile databases, book records, feedback files, translation usage, and append-only analytics events, with role-aware feature-demand comparison in the admin card. |
| `admin-theme.page`, `admin-theme.list`, `admin-theme.editor`, `admin-theme.ai-assistant`, `admin-theme.preview`, `admin-theme.color-controls`, `admin-theme.loading-state`, `admin-theme.error-state` | `theme-store.admin-editor` | Admin-only theme creation and editing surface under the existing theme-store initiative; creator publishing and compensation remain future scope. |
| `progress.*`, `study.*`, `preview.vocabulary.*` | [#27](https://github.com/TextPlex/textplex/issues/27) | Multi-path insights dashboard and assessment-family progression. |
| `settings.theme-settings-link`, `theme-settings.route-hero`, `theme-settings.app-theme-card`, `theme-settings.behavior-card`, `theme-shop.route-hero`, `theme-shop.storefront-intro`, `theme-shop.catalog-card`, `theme-shop.selected-preview`, `theme-shop.store-controls`, `theme-shop.search`, `theme-shop.category-nav`, `theme-shop.mode-tabs`, `theme-shop.catalog-grid`, `theme-shop.theme-option`, `theme-shop.collections-carousel`, `theme-shop.collection-slide`, `theme-shop.collection-arrows`, `theme-shop.collection-dots`, `theme-shop.collection-rail`, `theme-shop.bundle-card`, `theme-shop.preview-tuning`, `theme-shop.empty-state` | [#73](https://github.com/ajth-work/textplex/issues/73) | The dedicated `/themes` storefront now owns discovery, preview, ownership, and pricing while `/profile/themes` retains appearance settings; checkout and fulfillment remain future work. |
| `home.page`, `home.header`, `home.search`, `home.continue-reading`, `home.continue-reading-card`, `home.continue-reading-list`, `home.continue-reading-row`, `home.goals`, `home.weekly-goal`, `home.exposure-goal`, `home.empty-state`, `home.error-state`, `library.search-hero`, `library.filter-menu`, `library.filter-button`, `library.language-filter`, `library.search`, `library.document-count`, `library.import-button`, `library.shelf`, `library.skeleton-card`, `library.book-card`, `library.book-info-button`, `library.book-open-button`, `library.empty-state`, `library.error-state`, `reader.unavailable-state`, `shell.primary-nav`, `shell.primary-nav-menu`, `shell.secondary-nav`, `shell.reader-nav`, `shell.reader-nav-reveal` | Frontend migration Phase 7 (In progress) | Canonical Next home, library, and reader recovery slices use one focused shell navigation model; the missing-reader state routes learners to the Library or import flow. |
| `reader.header`, `reader.options-dialog`, `reader.navigation-hide-delay-section`, `reader.navigation-hide-delay-slider`, `reader.theme-section`, `reader.theme-grid`, `reader.theme-more-button`, `reader.session-summary-toggle`, `reader.session-summary-details`, `reader.reading-progress-module`, `reader.lookup-fallback-section`, `reader.page-card`, `reader.navigation-card`, `reader.sentence-tools`, `reader.token-mode-button`, `reader.source-sentence-card`, `reader.sentence-translation-card`, `reader.translation-reveal-card`, `reader.sentence-help-section`, `reader.meaning-line-toggle`, `reader.meaning-line-reveal-all-toggle`, `reader.meaning-line-reveal-all-action`, `reader.definition-trace-toggle`, `reader.tools-card`, `reader.token-display-settings`, `reader.token-text-size-control`, `reader.token-spacing-control`, `reader.token-inspector`, `reader.sentence-hsk-chart` | Consolidate standalone preview features into the Next.js app (Local pending) | Phase 2 reader parity slice; Next now owns the reader metadata, compact pager, compact visual progress strip, moved options-panel utilities, reader navigation hide-delay preference, recent-first theme picker, Google fallback usage summary, language-aware sentence tools row, compact session-active bar with a swipeable subpill rail, independent token text-size and spacing preferences, and a full-reveal escape hatch for incomplete meaning-line alignment while standalone remains the compatibility reference. |
| `reader.word-audio-button`, `reader.definition-remembered-button`, `reader.definition-missed-button`, `reader.definition-segment`, `reader.russian-syllable-toggle`, `reader.token-audio-toggle`, `reader.token-audio-toast`, `reader.sentence-audio-speed`, `reader.mixed-language-audio-toggle`, `reader.audio-speed-toast`, `reader.reading-profile-card` | Add pronunciation freshness controls, definition feedback, and sentence audio playback (Local pending) | Selected-token playback, remembered/missed word feedback, syllable-chip audio, the Russian syllable display toggle, default-on token-tap audio with a first-use notice, the experimental mixed-language sentence audio toggle, and the local reading-profile tracker details. |
| `reader.sentence-feedback-button`, `reader.definition-correction-button`, `reader.word-quick-feedback` | Untracked | Targeted reader correction feedback | Reuses the existing feedback dialog and persistence flow while storing whether a report targets the active sentence or selected word, capturing the exact content text, and offering one-tap common word-correction reasons. |
| `shell.feedback-close-button` | [#124](https://github.com/ajth-work/textplex/issues/124) | Larger, legible feedback-dialog close target that preserves responsive header spacing. |
| `import.form`, `import.photo-pages-card`, `import.progress-card`, `book-detail.import-progress-card`, `book-detail.prepared-pages-card`, `surface.page-by-page-append-card`, `reader.page-by-page-upload-state`, `reader.page-frontier-upload-button`, `reader.page-upload-input-mode`, `reader.end-of-content-page`, `reader.completion-summary-card`, `import.recent-books-card`, `import.book-item` | Consolidate standalone preview features into the Next.js app (Local pending) | Phase 2 import slice; Next now submits pasted text and PDF, EPUB, and TXT uploads to the API, retains the latest background extraction across route changes, supports extendable page-by-page sources, pauses the Reader while new pages are processed, shows matching progress on book detail, and uses an inline plus/arrow frontier control with resumable first-page readiness and background batch processing. |
| `import.wikipedia-random-card`, `import.wikipedia-random-button` | Untracked | Live and demo import surfaces expose a selected-target-language Wikipedia random article action backed by the FastAPI import pipeline. |
| `analysis.difficulty-card`, `analysis.vocabulary-distribution-card`, `analysis.summary-card`, `analysis.generation-prompt-card`, `analysis.sentence-hsk-chart`, `analysis.page-hsk-chart`, `book-detail.extraction-snapshot-card`, `book-detail.generation-prompt-card`, `book-detail.page-hsk-chart`, `reader.sentence-hsk-chart` | Frontend migration Phase 3 (Local complete) | API-backed sentence/page/book HSK analytics now render in Next analysis and book-detail routes with compatibility previews retained. |
| `settings.roadmap-card` | Untracked | Settings discovery entry for the existing Roadmap route; create a dedicated tracker item if roadmap navigation becomes a larger product initiative. |
| `settings.build-footer-toggle`, `shell.build-footer` | Untracked | Local browser preference and shared build card that expose the current version, build timestamp, elapsed time, and feedback action on every page. |
| `settings.speech-voice-toggle`, `reader.speech-voice-toggle` | Untracked | Shared male/female speech preference for browser playback across the Settings surface and reader audio controls. |
| `profile.hosted-account-card` | Frontend migration Phase 5 (In Progress) | Authenticated read-only hosted profile hydration; local learner metrics remain the default profile source. |
| `profile.email-change-form` | Frontend migration Phase 5 (In Progress) | Supabase Auth email-change request with double confirmation; learner databases remain keyed by immutable user ID. |
| `profile.migration-card` | Frontend migration Phase 5 (In Progress) | Explicit preview, ready, completed, empty, and error states for account migration. |
| `shell.brand`, `auth.page`, `auth.public-return`, `auth.target-language`, `auth.learning-track`, `auth.callback-state`, `auth.reset-password-page`, `auth.reset-password-card`, `auth.reset-password-form`, `auth.reset-password-success`, `auth.reset-password-error` | Frontend migration Phase 5 (In Progress) | Supabase email/password account flow with a public return path from the shared shell and auth card, including registration target-language and learning-path capture, recovery-session password updates, and expired-link recovery guidance. |
| `onboarding.page`, `onboarding.expectations-card`, `onboarding.form`, `onboarding.account-type-question`, `onboarding.target-language-question`, `onboarding.learning-track-question`, `onboarding.intent-question`, `onboarding.confidence-question`, `onboarding.support-question`, `onboarding.first-goal-question`, `onboarding.beta-acknowledgement`, `onboarding.continue-action`, `profile.hosted-account-card`, `admin-feedback.record-list`, `admin-feedback.detail` | [#123](https://github.com/ajth-work/textplex/issues/123), Frontend migration Phase 5 (In Progress) | Required onboarding now captures member/tester intent, persists the selected non-privileged role through the server-only Supabase Auth Admin API, refreshes the trusted role claim, and sends one idempotent tester-role verification report with the captured account role visible in the admin feedback console. Retryable hosted-profile storage failures keep the completed member onboarding return flow available while server diagnostics identify the provider operation. |
| `auth.page`, `auth.callback-state`, `auth.reset-password-page`, `auth.reset-password-card`, `auth.reset-password-form`, `auth.reset-password-success`, `auth.reset-password-error` | Frontend migration Phase 5 (In Progress) | Supabase email/password account flow, including recovery-session password updates and expired-link recovery guidance. |
| `privacy.page`, `privacy.summary-card`, `privacy.collection-card`, `privacy.usage-card`, `privacy.providers-card`, `privacy.controls-card`, `privacy.contact-card`, `auth.policy-note` | [#53](https://github.com/TextPlex/textplex/issues/53) | Public privacy policy page and sign-up reminder note, with mirrored draft copy and a link to the third-party data-flow note. |
| `landing.page`, `landing.support`, `landing.support-subscription-panel`, `landing.pricing-tier`, `landing.cta` | Untracked | Beta packaging copy for the Open Book, Deep Read, and Immersion Studio plans, including fair-use language and the premium custom-narrative boundary. |
| `landing.support-theme-panel`, `landing.theme-card`, `landing.theme-preview-art`, `landing.theme-mode-toggle` | Untracked | Interactive landing-page theme catalog preview with five representative core, premium, fruit, seasonal, and international theme pairs. |

## Update rule for new UI

Update this file in the same change whenever a feature:

1. adds, removes, or renames a route;
2. adds a user-visible page region, card, modal, drawer, panel, list, or repeated item type; or
3. changes which route owns an existing region.

For a new card, choose a route-scoped ID such as `library.import-progress-card`, add it to that route’s table, and include its source path and purpose. If the same card is reused on multiple routes, give it a shared ID under `surface.*` and list each route that uses it. Do not reuse a retired ID for a different purpose.

The implementation handoff should name the inventory ID in the change summary, issue, or review note. A visual QA pass should use the IDs to identify the exact region being checked.

If a new UI item is created to satisfy an existing tracker issue, add its inventory ID to that issue's cross-reference row. If a new UI item has no issue yet, record `Untracked` during the same change and create or identify the appropriate tracker item before handoff.
