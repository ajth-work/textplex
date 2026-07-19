const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("legacy reader toolbar exposes archive actions in the options menu", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../site/legacy/index.html"), "utf8");

  assert.match(html, /id="readerOptionsButton"/);
  assert.match(html, /id="readerOptionsMenu"/);
  assert.match(html, /id="archiveCurrentItem"/);
  assert.match(html, /id="deleteCurrentItem"/);
});
