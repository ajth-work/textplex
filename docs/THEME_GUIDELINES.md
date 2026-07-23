# TextPlex Theme Guidelines

Status: active product guideline  
Scope: every user-facing screen, card, control, state, and reading surface  
Current theme packs: Neutral, Warm Sepia, Dark Ink, Pitch Black, Jade, Ceramic, Crimson Gold, NES, Famicom, SNES, Super Famicom

## Purpose

TextPlex themes are a visual language layer for the whole product. They should make the app feel coherent and culturally or regionally suggestive without turning the interface into literal flag branding.

The priorities are:

1. Reading clarity and functional visibility.
2. Consistent theme expression across every route.
3. Clear hierarchy between the app canvas, cards, controls, and reading content.
4. Calm, purposeful color rather than decoration for its own sake.

The global theme is selected from Profile under Appearance > Global theme. Reader typography, density, token mode, and text size remain reader controls, but the reader still inherits the global palette unless a reader-specific surface intentionally needs a local treatment.

## Theme Contract

Every visible component must consume semantic theme roles rather than raw colors. The role names below are the contract for the active Next app; the standalone preview site should only be updated when a task explicitly calls for legacy-shell or GitHub Pages parity.

| Role | Use | Requirements |
| --- | --- | --- |
| `canvas` | Page background and shell atmosphere | May use a gradient or texture, but must not compete with content. |
| `surface` | Large sections, panels, profile areas, forms | Must separate from `canvas` with tone, border, or shadow. |
| `card` | Book cards, goal cards, stat cards, list rows | Must have a readable text pairing for every theme. |
| `card-raised` | Selected cards, popovers, dialogs, theme options | Must be visibly above `card` without relying only on shadow. |
| `text` | Primary shell and page text | Must remain readable on `canvas` and `surface`. |
| `card-text` | Primary text inside cards | Must remain readable on `card`. |
| `muted` | Metadata, supporting copy, labels | Must not become low-contrast grey on dark or saturated backgrounds. |
| `card-muted` | Metadata inside cards | Must be tested separately from shell metadata. |
| `accent` | Active states, progress, selected controls, links | Use consistently; do not use multiple unrelated accent colors in one screen. |
| `accent-strong` | Accent text on pale surfaces or accent fills | Must pass contrast against its actual background. |
| `accent-soft` | Pills, selected backgrounds, hover states | Must remain visible without obscuring text. |
| `border` | Card boundaries, dividers, inputs | Must be visible in both light and dark themes. |
| `focus` | Keyboard focus rings and active outlines | Must be visible against both the component and surrounding canvas. |
| `positive` | Completed, healthy, live, or successful states | Must not be confused with `accent`. |
| `warning` | Pending, caution, or incomplete states | Must remain readable on its fill. |
| `danger` | Errors and destructive actions | Must not rely on red text alone. |
| `reader-text` | Chinese text, pinyin, translations | Prioritize long-form reading comfort over brand expression. |
| `reader-selected` | Selected token or sentence | Must show selection without reducing character legibility. |

Never solve a contrast problem by changing a single component to an arbitrary color. Fix the semantic token pairing or add a component-specific semantic role.

## Fixed Data Visualization Palettes

Some data visualizations carry meaning that must remain stable across theme packs. The HSK Character Level Distribution is one such exception: its colors communicate increasing language difficulty, not theme identity.

The HSK distribution must use this fixed gradient in every theme:

| Level | Color | Meaning |
| --- | --- | --- |
| HSK 1 | `#006b35` | Dark green, earliest level |
| HSK 2 | `#24a342` | Green |
| HSK 3 | `#b0b20e` | Yellow-green |
| HSK 4 | `#e78f09` | Orange |
| HSK 5 | `#df492d` | Red-orange |
| HSK 6 | `#8b0e2b` | Dark red, highest standard level |

Rules for this visualization:

- Do not substitute theme accent colors for the HSK level colors.
- Keep the level labels above the bar and rounded whole-number percentages below it.
- Center each level and percentage in the same proportional column as its bar segment.
- Use precise source percentages for segment widths; round only the displayed labels.
- If higher HSK bands are present, extend the red end of the gradient rather than restarting the scale.

## Palette Direction

These descriptions define the intended behavior of the current packs. Hex values belong in theme token definitions, not in page components.

| Pack | Canvas direction | Card direction | Text direction | Accent direction | Avoid |
| --- | --- | --- | --- | --- | --- |
| Neutral | Warm ivory with a light editorial gradient | Ivory and soft white | Charcoal and slate | Restrained amber | Flat white everywhere. |
| Warm Sepia | Parchment, tea, and aged paper | Cream and parchment | Deep brown | Burnt orange and tea brown | Brown-on-brown metadata. |
| Dark Ink | Blue-charcoal and near-black | Soft charcoal | Ivory and cool white | Warm gold | Pure white text at every level. |
| Pitch Black | Near-black with minimal atmosphere | Black and graphite | Soft white | Quiet cool gold | Thin grey text and invisible borders. |
| Jade | Deep green with restrained gold light | Deep jade green | Ivory, pale jade, and warm gold | Jade-gold | Dark blue inherited from default styles. |
| Ceramic | Porcelain, mist, and slate | White porcelain and cool grey | Graphite and slate | Slate blue-grey | Low-contrast grey on white. |
| Crimson Gold | Lacquer red and deep wine | Warm gold-paper or cream | Pale gold on the canvas; dark red on cards | Luminous gold | Dark red text on dark red canvas. |
| NES | Deep navy, cartridge grey, and signal red | Warm cartridge grey and soft navy | Cream on canvas; navy on cards | Signal red | Literal pixel-art treatment or red text on red fills. |
| Famicom | Cream plastic and oxblood red | Warm ivory and charcoal | Charcoal and cream | Oxblood red | Over-saturating the page with red. |
| SNES | Graphite lavender and cool plum | Pale lavender and soft graphite | Cream on canvas; plum on cards | Muted purple | Neon arcade gradients or low-contrast violet text. |
| Super Famicom | Charcoal hardware, teal atmosphere, and coral detail | Soft graphite and warm porcelain | Cream on canvas; charcoal on cards | Coral with amber support | Treating the palette as a literal controller illustration. |

## Surface Hierarchy

Every screen should make this hierarchy apparent:

```text
canvas
  shell / navigation
    surface or hero
      card
        card-raised / selected / dialog
          focus or active state
```

Rules:

- The canvas establishes the theme identity.
- Large surfaces support grouping but should not look like every other card.
- Cards must adapt their background and text pairing per theme. A global dark theme must not leave white cards with dark legacy text or dark cards with grey legacy text.
- Selected cards use `accent-soft`, `accent`, or a clear border plus a contrast-safe text color. Never use color alone to communicate selection.
- Shadows are supportive. A theme must still work when shadows are reduced or unavailable.
- Rounded corners and spacing remain product-level conventions. Themes change color, border, and atmosphere, not component geometry without a deliberate design decision.
- Cover art, book artwork, and extracted page images are content. Do not apply a global color filter that damages them.

## Typography Rules

- Use the established editorial serif for book titles and long-form reading text.
- Use the established sans-serif for metadata, controls, labels, navigation, and status text.
- Primary text should use `text` or `card-text`, not a hard-coded color.
- Metadata should use `muted` or `card-muted`; do not use default browser grey.
- Pinyin must remain visually subordinate to Chinese characters but readable at every theme.
- Chinese characters, translations, and selected tokens must never inherit a low-contrast navigation or metadata color.
- Do not globally recolor every `h1`, `h2`, or `h3` without knowing whether it sits on the canvas or inside a card. Heading context determines the semantic role.

## Control Rules

Controls must be designed in all states:

| State | Required treatment |
| --- | --- |
| Default | Clear label, visible boundary or fill, readable against its surface. |
| Hover | Small elevation, border, or accent shift; do not cause layout movement that changes reading position. |
| Focus | Strong visible focus ring using `focus`; never remove the browser focus indication without replacement. |
| Active / selected | Accent plus text or icon change; selection must be understandable without color vision. |
| Disabled | Reduced emphasis but still legible enough to understand what is unavailable. |
| Loading | Use theme-safe skeletons or status copy; do not use grey blocks that disappear on dark themes. |
| Error | Use `danger`, an icon or label, and explanatory text. |
| Success / live | Use `positive` plus text such as “Saved”, “Live”, or “Ready”. |

Specific controls:

- Search fields use a theme-aware surface, icon, text, and placeholder. Placeholder text must not be the only indication of the field’s purpose.
- Bottom navigation uses `card-text` for the active item and `card-muted` for inactive items. The center action uses `accent` and must keep its icon readable.
- Pills and tags use `accent-soft` with `accent-strong` or an explicitly safe text pairing. Avoid dark accent text on dark accent fills.
- Score rings and progress meters require a readable number or label in the center. The ring color is not enough.
- Buttons must be checked on both cards and the page canvas. A primary button that works on the canvas may fail inside a card.

## Screen Guidelines

### Home

- Keep the brand and section headings legible against the themed canvas.
- The search surface must adapt with a readable icon, input text, and placeholder.
- Continue Reading cards must adapt as complete units: artwork can stay content-authored, while title, author, progress metadata, bookmark, and progress bar use card roles.
- Recent Analysis rows sit on the canvas and therefore use shell text roles, not card-muted text from a light card.
- Difficulty percentages need readable center text independent of the ring color.
- Goal cards adapt their surface, title, value, supporting label, ring center, and icon together.
- Bottom navigation must have readable inactive labels, a distinct active item, and a high-contrast center action.

### Library

- Book cards use `card`, `card-text`, and `card-muted`.
- Shelf controls, grid/list toggles, filters, and search use the same control contract.
- Book cover artwork remains unfiltered; the surrounding card and metadata carry the theme.
- Empty-library and archived-book states need a readable explanation and action in every theme.

### Library Detail and Analysis

- Hero metadata and book facts use `surface` and `text` roles.
- Vocabulary, frequency, and progress rows use `card` and `card-text`; frequency numbers use `accent-strong` only when contrast-safe.
- Difficulty scores, percentages, and progress rings require readable center labels.
- The HSK Character Level Distribution uses the fixed cross-theme gradient documented above; active theme changes must not recolor its segments.
- Missing extraction, unavailable data, and error states must remain obvious on dark green, black, and red canvases.

### Reader

- The reading panel is the highest-priority surface. It must provide comfortable contrast and generous whitespace.
- Chinese characters use `reader-text`; pinyin uses a readable but subordinate reader-muted role.
- Selected tokens use `reader-selected` with enough contrast for both glyphs and pinyin.
- Session statistics, progress pills, timer controls, and navigation buttons must not borrow low-contrast shell metadata colors.
- Reader theme controls may change typography, density, and local reading treatment, but they must stay synchronized with the global palette when the global theme is saved.
- Page images and scans are content surfaces and must not be globally color-shifted.

### Insights / Progress / Vocabulary / Study

- Stat cards need an explicit card text and card muted pairing for each pack.
- Colored categories such as new, review, mastered, or learning must be distinguishable from the theme accent and remain readable in their card.
- Charts, meters, rings, and numeric summaries need text labels or values in addition to color.
- Empty queues, completed queues, and recommendations are first-class states, not unstyled fallbacks.

### Profile

- The Appearance > Global theme picker is the canonical place to select the app-wide pack.
- Theme option cards must show a swatch, name, description, selected state, and readable control label.
- The current theme must be visible in both the picker and stored preferences.
- Profile metrics, learning tracks, settings rows, and book activity use the same card contract.
- Saving should provide a visible success or error state without relying on a toast alone.

### Theme Shop Bundles

- Individual themes remain independently previewable and are priced at `$1.99` in the catalog model.
- A bundle must contain at least three topically aligned themes and show its included themes, individual total, bundle price, and exact savings.
- The Classic Consoles bundle contains NES, Famicom, SNES, and Super Famicom. Its `$6.49` bundle price is discounted from `$7.96`, saving `$1.47`.
- Bundle presentation is a catalog offer only until checkout and entitlement infrastructure exists. Do not imply payment completion from a preview or theme-selection action.
- Bundle names and palette descriptions should communicate the shared design direction without using console logos, screenshots, or copied hardware artwork.

### Import, Search, Activity, Settings, and Roadmap

- Forms use theme-aware input backgrounds, borders, labels, placeholder text, and validation messages.
- Recent imports and activity rows must distinguish primary event text from timestamps and metadata.
- Settings must expose the active global theme and preserve other preferences when saving.
- Settings should provide a direct, readable entry to the Roadmap so the implementation plan is discoverable without relying on the primary shell navigation.
- Roadmap preserves its editorial tracker identity: a serif-led hero, compact status metrics, ordered implementation steps, a current-focus explanation, and progress-based language cards.
- Roadmap cards use `card` and `card-text`; plan steps and pack/benchmark details use `surface-soft` and `card-muted`; progress meters use the active `accent` rather than a fixed blue or green.
- Roadmap status pills use `accent-soft` with a contrast-safe `accent-strong` pairing. Status words such as Foundation, Active build, and Queued must remain readable in every pack.
- Roadmap theme adaptation changes canvas, cards, borders, text, controls, pills, metadata, and meters while preserving the page's information architecture and generous editorial spacing.
- Roadmap language names remain content labels, not flag branding. Do not introduce literal national flag fills or artwork into the tracker cards.
- Roadmap and other informational surfaces use the same hierarchy even when they contain no book artwork.
- Every empty, loading, error, and success state must be checked on both a light and dark pack.

## Contrast Acceptance

Before a theme or component is accepted:

- Normal text meets at least WCAG AA contrast of 4.5:1.
- Large text meets at least 3:1.
- Important icons, controls, borders, and focus indicators meet at least 3:1 against their adjacent background.
- Text is checked against the actual rendered surface, not the page canvas token.
- Card text is checked separately from shell text.
- Muted text is checked separately from primary text; “muted” does not mean “barely visible”.
- The following are explicitly inspected: `Local import`, timestamps, score percentages, pinyin, progress labels, search placeholders, inactive bottom-nav labels, active bottom-nav labels, pills, tags, and error copy.

Minimum visual QA sizes:

- Mobile: 390 x 844.
- Mobile: 430 x 932.
- Desktop: 1180px content width.

Test at least Neutral, Jade, Crimson Gold, and one dark neutral pack before shipping any theme-system change. Jade and Crimson are the highest-risk packs because saturated canvases expose inherited legacy colors quickly.

## Implementation Guidance

The canonical implementation target is the Next app. Update the standalone preview only when a task explicitly asks for legacy-shell parity.

The current implementations are split between:

- Next app theme definitions: `apps/web/lib/theme.ts`, `apps/web/app/globals.css`, and the theme provider.
- Standalone served preview: `site/preview-theme.js` and `site/preview-theme.css`.
- Global selection UI: Profile Appearance section and `/settings`.

Both implementations must use the same theme names, normalization behavior, and semantic intent. If a theme is added or renamed, update both implementations in the same change.

Avoid selectors that make the entire product depend on element names or generic classes:

```css
/* Avoid */
body[data-app-theme] h3 { color: var(--accent); }
body[data-app-theme] .card { color: var(--accent); }

/* Prefer */
body[data-app-theme] .goal-card .goal-title { color: var(--card-text); }
body[data-app-theme] .bottom-nav .nav-item { color: var(--card-muted); }
```

The semantic role must follow the rendered surface. A heading on the canvas uses `text`; the same heading inside a card uses `card-text`.

## New Theme Checklist

1. Add the theme name, label, description, normalization aliases, and dark/light classification.
2. Define every semantic role in the theme token block, including card text and muted text.
3. Add a theme swatch that communicates canvas, card, and accent rather than one flat color.
4. Verify Home, Library, Reader, Insights, Profile, and Settings.
5. Check all card variants, not only the primary book card.
6. Check default, hover, focus, active, disabled, loading, error, and success states.
7. Check scores, rings, progress meters, pills, tags, metadata, pinyin, and navigation.
8. Test at mobile and desktop sizes.
9. Run `npm run test:site`, `npm run build:web`, `npm run lint:web`, and `git diff --check` as applicable.
10. Rebuild and reboot the site/API before visual QA.
11. Add a `CHANGELOG.md` entry describing the theme-system change.

## Review Questions

- Does every visible surface have a deliberate theme role?
- Can a user distinguish canvas, surface, card, and selected card?
- Is every piece of metadata readable without zooming?
- Do cards adapt without damaging artwork or reading comfort?
- Are active and inactive navigation states obvious?
- Does the theme still work when text wraps to two or three lines?
- Does the theme communicate its intended mood without looking like a literal flag?
- Is the same behavior present in both `apps/web` and `site/`?
