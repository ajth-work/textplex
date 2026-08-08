# Web reader

This workspace is the active Next.js app. Default feature work targets the `3000` app; treat the standalone `8200` shell as a legacy reference only unless a task explicitly asks to update it.

Bootstrap this workspace with the current Next.js App Router defaults before feature work. Preserve this workspace location and implement routes in this order:

1. `/library`
2. `/books/[bookId]`
3. `/reader/[bookId]/[pageNumber]`
4. `/progress`

The reader route is the first real product surface.

## Chromium DevTools workspace

This app now serves `/.well-known/appspecific/com.chrome.devtools.json` so Chromium DevTools can auto-connect the local `apps/web` source folder on `localhost`.

When that workspace is active, edits you make to the source files in DevTools can be saved back to the repo and will persist across reloads. The landing-page copy lives in `apps/web/components/landing-page.tsx`, and the current route shell starts in `apps/web/app/page.tsx`.
