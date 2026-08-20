const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const stylesheetSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");
const inventorySource = fs.readFileSync(path.join(repoRoot, "docs", "COMPONENTS_INVENTORY.md"), "utf8");

test("shared routes use the compact app-wide layout rhythm", () => {
  assert.match(stylesheetSource, /App-wide visual density pass/);
  assert.match(stylesheetSource, /--layout-stack-gap: 0\.75rem/);
  assert.match(stylesheetSource, /\.app-shell-content > main\.app-shell\s*\{[^}]*padding: 0 0 1\.5rem/);
  assert.match(stylesheetSource, /\.home-hero > \.metric-grid:has\(> div:nth-child\(2\):last-child\)/);
  assert.match(stylesheetSource, /\.settings-inspector-row\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(stylesheetSource, /\.profile-email-change\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(stylesheetSource, /\.activity-progress-grid\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(stylesheetSource, /@media \(min-width: 761px\)[\s\S]*\.library-import-button\.button\s*\{[^}]*grid-column: 2/);
  assert.match(stylesheetSource, /\.app-build-footer\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(18rem, 0\.9fr\)/);
  assert.match(stylesheetSource, /\.landing-hero-actions--public \.button-primary\s*\{[^}]*order: 1/);
});

test("the component inventory records the app-wide density ownership", () => {
  assert.match(inventorySource, /App-wide visual density pass/);
  assert.match(inventorySource, /`shell\.chrome`, `shell\.build-footer`, `shell\.feedback-footer`, `shell\.feedback-button`, `surface\.route-hero`, `surface\.metrics`/);
  assert.match(inventorySource, /`library\.search-hero`, `library\.import-button`, `activity\.pages-progress-chart`, `activity\.sentences-progress-chart`, `settings\.preferences-card`, `profile\.email-change-form`/);
});
