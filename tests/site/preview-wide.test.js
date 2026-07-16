const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const previewFiles = [
  "activity-preview.html",
  "analysis-preview.html",
  "home-preview.html",
  "import-preview.html",
  "library-detail-preview.html",
  "library-preview.html",
  "profile-preview.html",
  "progress-preview.html",
  "reader-preview.html",
  "search-preview.html",
  "study-preview.html",
  "vocabulary-preview.html",
];

test("preview pages include the shared wide-screen stylesheet", () => {
  for (const fileName of previewFiles) {
    const html = fs.readFileSync(path.resolve(__dirname, "../../site", fileName), "utf8");
    assert.match(html, /href="\.\/*preview-wide\.css"/, `expected ${fileName} to load preview-wide.css`);
  }
});
