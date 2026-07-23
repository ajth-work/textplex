const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("Compose defines Next as the canonical product and scopes the static shell", () => {
  const compose = read("docker-compose.yml");

  assert.match(compose, /web:\r?\n\s+build:/);
  assert.match(compose, /- "3000:3000"/);
  assert.match(compose, /profiles:\s+\["legacy"\]/);
  assert.match(compose, /- "8201:8000"/);
  assert.match(compose, /NEXT_PUBLIC_TEXTPLEX_API_URL/);
});

test("canonical deployment docs keep the browser and API ports explicit", () => {
  const readme = read("README.md");
  const localDevelopment = read("docs", "LOCAL_DEVELOPMENT.md");
  const phase = read("docs", "FRONTEND_MIGRATION_PHASE_4.md");

  for (const document of [readme, localDevelopment, phase]) {
    assert.match(document, /3000/);
    assert.match(document, /8201/);
    assert.match(document, /8200/);
  }
  assert.match(phase, /legacy\/preview compatibility/);
});

test("Next keeps the import-to-reader-progress wiring explicit", () => {
  const importSource = read("apps", "web", "components", "surface-views.tsx");
  const readerSource = read("apps", "web", "components", "reader-view.tsx");

  assert.match(importSource, /postJson<BookRecord>\("\/texts\/import"/);
  assert.match(importSource, /href=\{`\/reader\/\$\{activeBook\.id\}\/1`\}/);
  assert.match(importSource, /Import complete\. The reader is ready\./);
  assert.match(readerSource, /postJson<ReadingSessionRecord>\("\/learning\/sessions"/);
  assert.match(readerSource, /postJson<PageReadRecord>\("\/learning\/page-reads"/);
  assert.match(readerSource, /postJson<SentenceReadRecord>\("\/learning\/sentence-reads"/);
  assert.match(readerSource, /Save to vocabulary/);
});

test("Next profile exposes the configurable legacy compatibility boundary", () => {
  const compose = read("docker-compose.yml");
  const client = read("apps", "web", "lib", "textplex.ts");
  const liveProfile = read("apps", "web", "components", "surface-views.tsx");
  const demoProfile = read("apps", "web", "components", "mock-route-views.tsx");
  const inventory = read("docs", "COMPONENTS_INVENTORY.md");

  assert.match(compose, /NEXT_PUBLIC_TEXTPLEX_LEGACY_URL/);
  assert.match(client, /legacySurfaceUrl/);
  assert.match(liveProfile, /data-inventory-id="profile\.legacy-link"/);
  assert.match(demoProfile, /data-inventory-id="profile\.legacy-link"/);
  assert.match(inventory, /`profile\.legacy-link`/);
});
