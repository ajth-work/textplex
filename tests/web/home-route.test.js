const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const homeRouteSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "home", "page.tsx"), "utf8");
const legacyPortalRouteSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "portal", "page.tsx"), "utf8");
const homeSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "home-surface.tsx"), "utf8");
const librarySource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "library-view.tsx"), "utf8");
const bookDetailSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "book-detail-view.tsx"), "utf8");
const readerSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "reader-view.tsx"), "utf8");
const textplexSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "lib", "textplex.ts"), "utf8");
const progressContract = fs.readFileSync(path.join(repoRoot, "packages", "shared", "src", "contracts.ts"), "utf8");
const inventorySource = fs.readFileSync(path.join(repoRoot, "docs", "COMPONENTS_INVENTORY.md"), "utf8");

test("home continuation uses learner reading progress instead of extraction analysis", () => {
  assert.match(homeRouteSource, /export default async function HomePage\(\)/);
  assert.match(homeRouteSource, /<HomeSurface books=\{data\.books\} progress=\{data\.progress\} \/>/);
  assert.match(legacyPortalRouteSource, /redirect\("\/home"\)/);
  assert.match(homeRouteSource, /fetchHomeJson<ProgressSurfaceResponse>\(origin, "\/progress", accessToken\)/);
  assert.match(homeSource, /home\.continue-reading-card/);
  assert.match(homeSource, /home\.continue-reading-list/);
  assert.match(homeSource, /home\.continue-reading-row/);
  assert.match(homeSource, /href=\{readerHref\(item\)\}/);
  assert.match(homeSource, /progress\.progress_percent/);
  assert.match(homeSource, /progress\.furthest_page/);
  assert.match(homeSource, /progress\.sentences_read/);
  assert.match(homeSource, /progress\.reading_state === "not_read"/);
  assert.doesNotMatch(homeSource, /Recent Analyses|recent-analyses|\/analysis\/\$\{book\.id\}/);
  assert.doesNotMatch(homeSource, /extracted_page_count/);
});

test("progress contract exposes furthest learner position and its unit", () => {
  assert.match(progressContract, /furthest_page: number;/);
  assert.match(progressContract, /total_sentences: number;/);
  assert.match(progressContract, /progress_percent: number;/);
  assert.match(progressContract, /progress_unit: "pages" \| "sentences";/);
  assert.match(progressContract, /reading_state: "not_read" \| "in_progress" \| "finished";/);
  assert.match(progressContract, /last_read_at: string \| null;/);
  assert.match(inventorySource, /`home\.continue-reading-list`/);
  assert.match(inventorySource, /`home\.continue-reading-row`/);
  assert.match(inventorySource, /`reader\.completion-summary-card`/);
});

test("reader entry points resume the last sentence for the selected book", () => {
  assert.match(textplexSource, /export function rememberReaderPosition\(bookId: string, pageNumber: number, sentenceOrder: number \| null\)/);
  assert.match(textplexSource, /export function resolveReaderResumePosition\(bookId: string, progress: ProgressSurfaceResponse \| null/);
  assert.match(textplexSource, /\?sentence=\$\{position\.sentenceOrder\}/);
  assert.match(readerSource, /rememberReaderPosition\(bookId, pageNumber, selectedSentenceOrder\)/);
  assert.match(readerSource, /resolveReaderResumePosition\(bookId, null, pageNumber\)/);
  assert.match(readerSource, /reader\.completion-summary-card/);
  assert.match(readerSource, /Mark as read, archive, and return/);
  assert.match(librarySource, /fetchJson<ProgressSurfaceResponse>\("\/progress"\)/);
  assert.match(librarySource, /resolveReaderResumeHref\(bookId, progress\)/);
  assert.match(librarySource, /library-read-state/);
  assert.match(bookDetailSource, /resolveReaderResumeHref\(bookId, progress, firstPageNumber\)/);
  assert.match(textplexSource, /const hasStartedReading = progressBook\?\.reading_state === "in_progress" \|\| progressBook\?\.reading_state === "finished"/);
  assert.match(bookDetailSource, /href=\{`\/reader\/\$\{bookId\}\/\$\{firstPageNumber\}`\}/);
});
