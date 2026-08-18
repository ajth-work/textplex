const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const surfaceSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "surface-views.tsx"), "utf8");
const clientSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "lib", "textplex.ts"), "utf8");
const mockSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "mock-route-views.tsx"), "utf8");
const inventorySource = fs.readFileSync(path.join(repoRoot, "docs", "COMPONENTS_INVENTORY.md"), "utf8");

test("Next import surface exposes random Wikipedia import for the selected target language", () => {
  assert.match(surfaceSource, /const \[wikipediaLanguageCode, setWikipediaLanguageCode\] = useState\("zh"\)/);
  assert.match(surfaceSource, /postJson<BookRecord>\("\/wikipedia\/random-import", \{ language_code: wikipediaLanguageCode \}\)/);
  assert.match(surfaceSource, /Wikipedia language/);
  assert.match(surfaceSource, /data-inventory-id="import\.wikipedia-random-card"/);
  assert.match(surfaceSource, /data-inventory-id="import\.wikipedia-random-button"/);
  assert.match(surfaceSource, /Import random \$\{languageShortCode\(wikipediaLanguageCode\)\.toUpperCase\(\)\} article/);
  assert.match(clientSource, /throw await apiRequestError\(response, pathname\)/);
  assert.match(mockSource, /data-inventory-id="import\.wikipedia-random-button"/);
  assert.match(inventorySource, /`import\.wikipedia-random-card`/);
  assert.match(inventorySource, /`import\.wikipedia-random-button`/);
});
