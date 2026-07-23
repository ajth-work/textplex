const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const routeSource = fs.readFileSync(
  path.join(repoRoot, "apps", "web", "app", "reader", "[bookId]", "[pageNumber]", "page.tsx"),
  "utf8",
);
const readerSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "reader-view.tsx"), "utf8");

test("Next reader route passes dynamic book and page parameters to the live reader", () => {
  assert.match(routeSource, /<ReaderView bookId=\{params\.bookId\} pageNumber=\{Number\(params\.pageNumber\)\} \/>/);
  assert.match(routeSource, /export const dynamic = "force-dynamic"/);
});

test("Next reader contract keeps loading, error, extraction, lookup, and chart states", () => {
  assert.match(readerSource, /ReaderLoadingSkeleton/);
  assert.match(readerSource, /Preparing page text/);
  assert.match(readerSource, /Reader unavailable/);
  assert.match(readerSource, /Try again/);
  assert.match(readerSource, /\/lexicon\/lookup\?/);
  assert.match(readerSource, /ReaderHskChart/);
});

test("Next reader definition card stays compact and exposes the save action", () => {
  assert.match(readerSource, /data-inventory-id="reader\.token-inspector"/);
  assert.match(readerSource, /className=\{`definition-save/);
  assert.match(readerSource, /handleToggleSelectedTokenSaved/);
  assert.doesNotMatch(readerSource, /<dl className="definition-grid">/);
});
