# TextPlex Wallpaper Generation Prompt

Version: 6  
Purpose: Generate calm, readable canvas wallpaper for TextPlex theme packs and local wallpaper tests.

## Asset Versioning

- Name the first generated asset `<theme-id>-v1.<ext>`.
- Name each revised generation `<theme-id>-v2.<ext>`, `<theme-id>-v3.<ext>`, and so on.
- Never overwrite an earlier wallpaper version and never use an unversioned production filename.
- The active theme selection must point to the latest approved version in `apps/web/lib/theme-catalog.ts`.
- Keep prior versions in `apps/web/public/themes/` for comparison and rollback; draft versions are not automatically customer-facing.
- Use the same versioning rule for daylight, night, seasonal, city, produce, and local test wallpapers.

## Universal Master Prompt

Use this as the default prompt for any wallpaper subject.

```text
Create a premium mobile reading app wallpaper called "[THEME NAME]".

Illustrate [SUBJECTS / MOTIFS] in a refined vintage-botanical watercolor or gouache-inspired editorial style with soft shading, subtle paper texture, gentle detail, and a polished premium finish.

Keep the artwork visibly painted and layered. Avoid flat sticker-like shapes, overly simplified icon rendering, or hard-edged cartoon treatment. Use soft tonal depth, leaf veining, petal translucency, and subtle grain so the motifs feel hand-painted and premium.

When matching the fruit reference set, favor a calm botanical wallpaper look: softly shaded painted motifs, subtle paper texture, muted saturated colors, and enough tonal depth that each fruit reads as an illustration rather than a cutout sticker. Keep spacing airy, but let the motifs feel embedded in the background through light shadows, nuanced edges, and gentle variation.

Arrange the motifs in a spacious, balanced diagonal scatter with generous negative space and a natural visual rhythm. Vary scale and rotation without creating a rigid grid, evenly spaced stickers, dense clutter, or flat empty dead zones.

Density calibration note: when the wallpaper is meant to read as a repeat-style catalog pattern, aim for roughly 15 to 18 visible motifs in a 9:16 frame, counting the main subject motifs and any small accent dots or blossoms. Keep the distribution airy but not sparse, let a few motifs sit near the edges without cropping, and allow the center to participate in the pattern instead of forcing a dead zone. If the reference feels fuller, add small filler motifs rather than crowding the main motifs or compressing everything into one cluster.

Use a soft [BACKGROUND COLOR / PALETTE] background that complements the subject matter and remains suitable behind reading app UI. Keep the composition balanced and readable behind content, but do not over-prioritize an empty center.

Night variants must stay subdued and low-glare. Keep saturation restrained, avoid candy-bright or neon hues, and prefer muted, dusted, or earth-toned recoloring so the wallpaper supports reading UI instead of competing with it. Any glow, highlight, or warm accent should be small, soft, and intentionally sparse.

Strict containment rule: all objects must remain 100% inside the canvas. No partial motifs. No clipped leaves. No cropped branches. No edge bleed. Maintain a narrow internal buffer around the entire canvas perimeter.

Keep every motif comfortably inset from the border. If any leaf tip, tendril, blossom, seed dot, or fruit edge starts to feel close to the frame, scale the motif down or move it inward rather than letting it graze the perimeter. Prefer a little extra breathing room over a crowded edge.

General repeat-friendly margin: keep content inset by roughly 2% to 4% of the frame on all sides, scaled proportionally for higher-resolution exports. Let motifs run up close to the border line so the tile stays full, but do not let any object cross the canvas edge.

Do not allow any object, leaf, branch, flower, fruit, building, shell, star, or decorative element to touch or cross the canvas boundary. Keep motifs close enough to the edges for fullness, but leave a small safe margin so repeated tiles do not create a fake border or empty gutter.

Extend the background color or paper texture cleanly to every edge and corner. The artwork must feel full-bleed, without a visible border, frame, brown edge band, hard stripe, or second background layer.

The wallpaper should feel elegant, soft, botanical or decorative, gently detailed, calm, premium, and readable behind app content.

No typography, words, letters, numbers, labels, logos, UI elements, flags, maps, political symbols, literal branding, copied signage, harsh shadows, neon colors, or loud contrast.

Portrait 9:16 composition, at least 1440x2560 pixels, high resolution. Output one clean wallpaper image only, with no mockup, phone frame, browser chrome, or presentation border.
```

## TextPlex Theme Parameters

Append these fields to the master prompt when the asset is part of a catalog theme:

```text
Visual thread: [BOTANICALS / LANDSCAPE / ARCHITECTURE / FOOD-MARKET / TEXTILES / PUBLIC SPACE]
Variant: [DAYLIGHT / NIGHT]
Palette: [PALETTE]
Wallpaper background: [EXACT HEX COLOR AND COLOR NAME]

The wallpaper background is a required theme-specific decision, not a default suggestion. Use the exact background color supplied for this row as the dominant canvas color. Do not fall back to generic cream, white, or beige. Supporting motifs, paper texture, and lighting may vary, but the selected background color must remain visibly distinct from neighboring themes.

For an International city theme, also append:

```text
City: [CITY]
Specific architectural anchors: [ONE TO THREE NAMED BUILDINGS, TOWERS, GATES, TEMPLES, BRIDGES, OR PUBLIC-SPACE STRUCTURES]

Architecture-first city rule: make the named structures the primary recognizable motifs. Use their defining silhouette, roofline, facade, tower, dome, gate, or bridge geometry clearly enough to identify the city at thumbnail size. Do not substitute generic arches, anonymous towers, random pools of water, or an unrelated skyline. Keep the same named architectural anchors in the Daylight and Night variants, with only the lighting, palette, and supporting details changed.
```

Use 3 to 6 recognizable but non-stereotyped recurring motifs and a restrained supporting detail set. Keep culturally specific references suggestive and editorial rather than turning the image into a flag treatment, tourist poster, or collection of every famous landmark.

For denser repeat-pattern themes, prefer the higher end of the visible-motif range above and include small botanical or decorative fillers to create texture without breaking containment or readability.

The artwork must remain recognizable at 15% to 35% opacity and subordinate to UI cards, controls, Chinese characters, pinyin, translations, and focus rings.

Daylight variant: use a light, airy canvas with soft natural contrast.
Night variant: create a deliberate low-light recoloring, not a simple inversion; use a deep canvas with restrained highlights and enough separation for pale UI surfaces.
Night palette restraint: keep the entire image muted and low-contrast, with softened color saturation and controlled brightness so it feels calm beside UI cards and typography.
```

## Short Fill-In Template

Use this when a shorter generation prompt is useful:

```text
Create a premium mobile reading app wallpaper called "[THEME NAME]".
Illustrate [MOTIFS] in a refined vintage-botanical watercolor or gouache style with soft shading, subtle paper texture, and elegant editorial detail.
Arrange the elements in a spacious diagonal scatter with balanced negative space on a [BACKGROUND COLOR] background. Let the center remain available for content when needed; do not force a dead zone.

Strict containment rule: every motif must be 100% inside the frame. Do not crop anything. Do not let any object touch or cross the canvas boundary. No partial motifs, clipped leaves, cropped branches, or edge bleed. Keep a narrow internal buffer around the entire perimeter so the design feels full without creating a visible border or fake margin when repeated.

The result should feel calm, premium, decorative, and readable behind a reading app. No text, logos, borders, branding, or UI elements. Portrait 9:16, high resolution.
```

## Tile-Test Addendum

Use this addendum when the image will be tested with TextPlex's `Tile wallpaper` setting:

```text
Make the composition repeat-friendly. No motif may cross or touch any canvas boundary. Keep the background continuous at every edge, with no visible border or abrupt tonal shift. The left and right edges, and the top and bottom edges, should remain visually compatible when repeated. Do not create a seam, checkerboard, hard stripe, or obvious repeated focal object.
```

## Fixed-Cover Addendum

Use this addendum when the image will be used only as a fixed viewport background:

```text
Optimize for a single stationary cover image rather than a repeating pattern. Keep the center 45% of the image sparse and place the strongest motifs toward the outer thirds without touching the edges. The composition must remain balanced when cropped to mobile and desktop viewport proportions.
```

## Review Checklist

- No object touches an edge or corner.
- Every motif stays comfortably inset from the perimeter; no leaf tip, tendril, blossom, seed dot, or fruit edge feels tight to the frame.
- Repeat-friendly content follows the general margin: roughly 2% to 4% inset on all sides, scaled proportionally for output size, with motifs allowed to approach the border line but never cross it.
- No partial motifs, clipped leaves, cropped branches, or edge bleed.
- Background reaches every edge without a bar, frame, border, or second layer.
- The exact tracker-supplied wallpaper background color is visibly dominant and distinct from neighboring theme families.
- Edge spacing is tight enough for fullness but safe for repeat testing.
- Center area stays usable for content overlays and still reads well at low opacity.
- Motifs are identifiable but not dense or distracting.
- Artwork is visibly painted and layered, not flat, sticker-like, or icon-like.
- Night variants are subdued, low-glare, and deliberately muted rather than bright or candy-colored.
- No generated text, logos, flags, maps, political symbols, or copied signage.
- Day and Night variants share motifs but are independently composed and recolored.
- The artwork works as both a stationary cover and, when requested, a repeat-friendly tile.
