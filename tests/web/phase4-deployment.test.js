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
  const appShellSource = read("apps", "web", "components", "app-shell.tsx");
  const readerSource = read("apps", "web", "components", "reader-view.tsx");

  assert.match(importSource, /postJson<BookRecord>\("\/texts\/import"/);
  assert.match(importSource, /const importLanguageOptions: ImportLanguageOption\[\] = \[/);
  assert.match(importSource, /translationConfirmationCharacterThreshold/);
  assert.match(importSource, /translation_mode: translationMode === "preload" \? "preload" : "off"/);
  assert.match(importSource, /formData\.append\("translation_mode", translationMode === "preload" \? "preload" : "off"\)/);
  for (const code of ["zh", "ko", "ja", "ru", "he", "ar"]) {
    assert.match(importSource, new RegExp(`code: "${code}"`));
  }
  assert.match(importSource, /<select className="text-input" value=\{languageCode\} onChange=\{\(event\) => setLanguageCode\(event\.target\.value\)\} required>/);
  assert.match(importSource, /Translate on demand/);
  assert.match(importSource, /Translate now/);
  assert.match(importSource, /import-translation-grid/);
  assert.match(importSource, /import-confirmation-card/);
  assert.match(importSource, /resolveReaderResumeHref\(activeBook\.id, null\)/);
  assert.match(appShellSource, /resolveReaderResumeHref\(activeBookId, null, activePageNumber \?\? 1\)/);
  assert.match(importSource, /Import complete\. The reader is ready\./);
  assert.match(readerSource, /postJson<ReadingSessionRecord>\("\/learning\/sessions"/);
  assert.match(readerSource, /postJson<PageReadRecord>\("\/learning\/page-reads"/);
  assert.match(readerSource, /postJson<SentenceReadRecord>\("\/learning\/sentence-reads"/);
  assert.match(readerSource, /SentenceTranslationResponse/);
  assert.match(readerSource, /reader-sentence-tools/);
  assert.match(readerSource, /reader\.sentence-translation/);
  assert.match(readerSource, /reader\.source-sentence/);
  assert.match(readerSource, /handleToggleSentenceTranslation/);
  assert.match(readerSource, /Save to study list/);
});

test("Next profile keeps the legacy shell link removed", () => {
  const liveProfile = read("apps", "web", "components", "surface-views.tsx");
  const demoProfile = read("apps", "web", "components", "mock-route-views.tsx");
  const inventory = read("docs", "COMPONENTS_INVENTORY.md");

  assert.doesNotMatch(liveProfile, /profile\.legacy-link|legacySurfaceUrl/);
  assert.doesNotMatch(demoProfile, /profile\.legacy-link|legacySurfaceUrl/);
  assert.doesNotMatch(inventory, /`profile\.legacy-link`/);
});
