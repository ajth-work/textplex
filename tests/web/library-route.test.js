const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const librarySource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "library-view.tsx"), "utf8");
const languageOptionsSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "lib", "language-options.ts"), "utf8");
const stylesheetSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");

test("Next library exposes a filter menu with language, progress, and book-status filters", () => {
  assert.match(librarySource, /const libraryLanguageOptions: LibraryLanguageOption\[\] = \[/);
  for (const code of ["all", "zh", "ko", "ja", "ru", "he", "ar"]) {
    assert.match(code === "all" ? librarySource : languageOptionsSource, new RegExp(`code: "${code}"`));
  }
  assert.match(librarySource, /const \[languageCode, setLanguageCode\] = useState\("all"\)/);
  assert.match(librarySource, /const \[readingFilter, setReadingFilter\] = useState<LibraryReadingFilter>\("all"\)/);
  assert.match(librarySource, /const \[processingFilter, setProcessingFilter\] = useState<LibraryProcessingFilter>\("all"\)/);
  assert.match(librarySource, /data-inventory-id="library\.filter-menu"/);
  assert.match(librarySource, /data-inventory-id="library\.filter-button"/);
  assert.match(librarySource, /Reading progress/);
  assert.match(librarySource, /Not started/);
  assert.match(librarySource, /In progress/);
  assert.match(librarySource, /Finished/);
  assert.match(librarySource, /Book status/);
  assert.match(librarySource, /Ready to read/);
  assert.match(librarySource, /Clear all/);
});

test("Next library uses one Import action and routes it to the import flow", () => {
  assert.match(librarySource, /className="library-hero card"/);
  assert.match(librarySource, /data-inventory-id="library\.import-button"/);
  assert.match(librarySource, /href="\/import"/);
  assert.doesNotMatch(librarySource, /generateReaderArticle\(/);
  assert.doesNotMatch(librarySource, /library-generator-settings/);
  assert.doesNotMatch(librarySource, /Generate practice article/);
  assert.match(stylesheetSource, /\.library-filter-menu\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*flex-end;/);
  assert.match(stylesheetSource, /\.library-filter-menu[\s\S]*\.library-filter-panel/);
  assert.match(stylesheetSource, /\.library-import-button\.button/);
});
