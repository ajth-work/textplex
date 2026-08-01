# TextPlex Viewport Audit Prompt

Use this prompt as a reusable starting point for a viewport-specific UI audit.

```text
Run a [AUDIT TYPE] viewport audit for TextPlex on [DEVICE NAME] at [WIDTH]x[HEIGHT] ([ORIENTATION]).

Scope:
- Use the Next app on port 3000.
- Review the relevant route or routes for this surface.
- Use the stable inventory IDs from docs/COMPONENTS_INVENTORY.md when naming findings.

Check for:
- Horizontal scrolling that is not intentional.
- Clipped or hidden headers, nav, dialogs, cards, or controls.
- Overlapping text, images, or action buttons.
- Unreadable typography at the target viewport.
- Primary actions pushed below the fold or otherwise hard to reach.
- Touch targets that are too small on mobile or tablet.
- Layouts that break when text wraps or when cards stack.

For each finding, report:
- Route
- Inventory ID
- Device and viewport
- Severity
- What is broken
- How to reproduce
- A screenshot note or visible symptom

If there are no findings, say that the surface is clean for this viewport and mention any remaining risks.
```

## Example

```text
Run a mobile layout viewport audit for TextPlex on iPhone 14 Pro at 393x852 portrait.

Scope:
- Use the Next app on port 3000.
- Review Home, Library, Reader, Analysis, Search, Study, Profile, Settings, and Import.
- Use the inventory IDs from docs/COMPONENTS_INVENTORY.md for any issues.

Check for:
- No horizontal scrolling.
- No clipped cards or nav.
- Primary actions remain visible.
- Reader and analysis content stays readable.

Report each issue with route, inventory ID, viewport, severity, reproduction notes, and visible symptom.
```

