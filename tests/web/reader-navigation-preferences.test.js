const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("reader navigation hide delay is shared by settings and the app shell", () => {
  const preferences = read("apps", "web", "lib", "reader-preferences.ts");
  const reader = read("apps", "web", "components", "reader-view.tsx");
  const shell = read("apps", "web", "components", "app-shell.tsx");

  assert.match(preferences, /READER_NAV_HIDE_DELAY_STORAGE_KEY/);
  assert.match(preferences, /READER_NAV_HIDE_DELAY_DEFAULT_MS = 3200/);
  assert.match(preferences, /READER_NAV_HIDE_DELAY_MIN_MS = 1000/);
  assert.match(preferences, /READER_NAV_HIDE_DELAY_MAX_MS = 15000/);
  assert.match(reader, /data-inventory-id="reader\.navigation-hide-delay-section"/);
  assert.match(reader, /data-inventory-id="reader\.navigation-hide-delay-slider"/);
  assert.match(reader, /persistReaderNavHideDelayMs/);
  assert.match(shell, /readerNavHideDelayRef\.current/);
  assert.match(shell, /READER_NAV_HIDE_DELAY_CHANGE_EVENT/);
  assert.match(shell, /readReaderNavHideDelayMs/);
});
