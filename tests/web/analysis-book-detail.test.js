const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");
const analysisRouteSource = read("apps", "web", "app", "analysis", "[bookId]", "page.tsx");
const analysisSource = read("apps", "web", "components", "surface-views.tsx");
const bookDetailSource = read("apps", "web", "components", "book-detail-view.tsx");
const chartSource = read("apps", "web", "components", "hsk-series-chart.tsx");
const stylesSource = read("apps", "web", "app", "globals.css");

test("Next analysis route remains dynamic and selects the live surface outside demo mode", () => {
  assert.match(analysisRouteSource, /export const dynamic = "force-dynamic"/);
  assert.match(analysisRouteSource, /<AnalysisSurfaceView bookId=\{params\.bookId\} \/>/);
  assert.match(analysisRouteSource, /<MockAnalysisSurfaceView bookId=\{params\.bookId\} \/>/);
});

test("analysis surface covers loading, error, empty, and sentence/page HSK series states", () => {
  assert.match(analysisSource, /LoadingSkeleton label="Loading analysis"/);
  assert.match(analysisSource, /Unable to load analysis/);
  assert.match(analysisSource, /analysis\.sentence-hsk-chart/);
  assert.match(analysisSource, /analysis\.page-hsk-chart/);
  assert.match(analysisSource, /Sentence chart will appear after extraction completes/);
  assert.match(analysisSource, /Page chart will appear after extraction completes/);
});

test("book detail loads analysis independently and exposes page-chart loading and empty states", () => {
  assert.match(bookDetailSource, /\/analysis\/\$\{bookId\}/);
  assert.match(bookDetailSource, /LoadingSkeleton label="Loading book HSK analysis"/);
  assert.match(bookDetailSource, /Unable to load book HSK analysis/);
  assert.match(bookDetailSource, /book-detail\.page-hsk-chart/);
  assert.match(bookDetailSource, /Page chart will appear after extraction completes/);
  assert.match(bookDetailSource, /setAnalysis\(null\)/);
});

test("HSK chart has a responsive scroll surface, fixed six-level palette, and accessible point labels", () => {
  assert.match(chartSource, /role="status"/);
  assert.match(stylesSource, /\.hsk-series-scroll\s*\{[\s\S]*?overflow-x: auto/);
  assert.match(chartSource, /#006b2e/);
  assert.match(chartSource, /#8f1239/);
  assert.match(chartSource, /<title>/);
});
