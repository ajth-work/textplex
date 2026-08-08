const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const librarySource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "library-view.tsx"), "utf8");
const stylesheetSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");

test("Next library exposes target-language filter buttons above the shelf", () => {
  assert.match(librarySource, /const libraryLanguageOptions: LibraryLanguageOption\[\] = \[/);
  for (const code of ["all", "zh", "ko", "ja", "ru", "he", "ar"]) {
    assert.match(librarySource, new RegExp(`code: "${code}"`));
  }
  assert.match(librarySource, /const \[languageCode, setLanguageCode\] = useState\("all"\)/);
  assert.match(librarySource, /matchesLibraryLanguage\(book: BookRecord, languageCode: string\): boolean/);
  assert.match(librarySource, /data-inventory-id="library\.language-filter"/);
  assert.match(librarySource, /Language filter buttons/);
  assert.match(librarySource, /library-language-button/);
  assert.match(librarySource, /Show all languages/);
});

test("Next library keeps the language filter visually grouped with the search hero", () => {
  assert.match(librarySource, /className="library-hero card"/);
  assert.match(librarySource, /className="library-language-filter"/);
  assert.match(librarySource, /className="library-language-filter-row"/);
    assert.match(librarySource, /generateReaderArticle\(/);
    assert.match(librarySource, /data-inventory-id="library\.generate-article-button"/);
    assert.match(librarySource, /library-practice-action/);
    assert.match(librarySource, /library-generator-settings/);
    assert.match(librarySource, /data-inventory-id="library\.generator-settings"/);
    assert.match(librarySource, /data-inventory-id="library\.generator-summary"/);
    assert.match(librarySource, /Generator settings/);
    assert.match(librarySource, /Target language/);
    assert.match(librarySource, /Vocabulary balance/);
    assert.match(librarySource, /library-practice-status/);
    assert.match(stylesheetSource, /\.library-language-filter[\s\S]*\.library-language-button/);
    assert.match(stylesheetSource, /\.library-practice-action[\s\S]*\.library-generator-settings/);
    assert.match(stylesheetSource, /\.library-generator-grid[\s\S]*\.library-practice-status/);
  });
