# TextPlex Viewport Audit Checklist

Use this checklist when reviewing TextPlex surfaces across viewport sizes.

## Target devices

| Label | Device class | Viewport | Orientation |
| --- | --- | --- | --- |
| Mobile S | iPhone SE | 375x667 | Portrait |
| Mobile M | iPhone 14 / Pixel 7 | 393x852 | Portrait |
| Mobile L | iPhone 14 Pro Max / Pixel 8 Pro | 430x932 | Portrait |
| Tablet P | iPad / Android tablet | 768x1024 | Portrait |
| Tablet L | iPad landscape | 1024x768 | Landscape |
| Laptop | Small laptop | 1365x768 | Landscape |
| Desktop | Standard desktop | 1440x900 | Landscape |
| Large Desktop | Large desktop | 1920x1080 | Landscape |

## Surfaces to cover

- `home`
- `library`
- `reader`
- `analysis`
- `search`
- `study`
- `profile`
- `settings`
- `import`

## Pre-flight

- Confirm the Next app is running on port `3000`.
- Identify the route and inventory ID being checked.
- Open the surface at the target viewport size.
- Capture the browser viewport dimensions before judging layout.

## Layout checks

- No unintended horizontal scrolling.
- No clipped headers, dialogs, drawers, menus, or cards.
- No overlapping text, buttons, or tiles.
- No content pushed off-screen without a clear secondary path.
- Navigation remains usable at the current viewport.
- Primary actions remain visible and reachable.
- Typography remains readable without zooming.

## Interaction checks

- Buttons and links are large enough to tap or click comfortably.
- Hover-only behavior does not hide essential content on touch viewports.
- Forms remain usable with the keyboard open on mobile-sized screens.
- Reader controls, analysis controls, and study controls remain accessible.

## Surface-specific reminders

- Home: featured content, recent analyses, and progress cards should wrap cleanly.
- Library: search, filters, and book cards should not compress into unreadable rows.
- Reader: page image, sentence content, and token tools should remain usable.
- Analysis: summary, difficulty, and chart regions should not collide.
- Search: query controls and result rows should stay aligned.
- Study: review queues, groups, and practice cards should remain navigable.
- Profile: account and migration panels should fit without truncation.
- Settings: preference controls and theme-related sections should not overflow.
- Import: progress and confirmation states should remain visible.

## Report format

- Route
- Inventory ID
- Device and viewport
- Severity
- Issue summary
- Reproduction notes
- Screenshot or visible symptom

