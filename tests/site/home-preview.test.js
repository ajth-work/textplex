const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("home preview profile tab points at the profile preview", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../site/home-preview.html"), "utf8");

  assert.match(html, /href="\.\/*profile-preview\.html"/);
});
