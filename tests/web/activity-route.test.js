const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const liveSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "surface-views.tsx"), "utf8");
const demoSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "mock-route-views.tsx"), "utf8");
const stylesheetSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");
const inventorySource = fs.readFileSync(path.join(repoRoot, "docs", "COMPONENTS_INVENTORY.md"), "utf8");

test("Activity groups events by recently read book or article", () => {
  assert.match(liveSource, /function groupActivityEvents\(events: ActivityEvent\[\]\)/);
  assert.match(liveSource, /latestReadAt/);
  assert.match(liveSource, /data\.reading_history/);
  assert.match(liveSource, /activity\.pages-progress-chart/);
  assert.match(liveSource, /activity\.sentences-progress-chart/);
  assert.match(liveSource, /activity\.recent-books-list/);
  assert.match(liveSource, /<details key=\{group\.bookId\}/);
  assert.match(liveSource, /data-inventory-id="activity\.event-item"/);
  assert.match(demoSource, /<details className="activity-book-group"/);
  assert.match(demoSource, /ReadingProgressChart/);
  assert.match(stylesheetSource, /\.reading-progress-card\s*\{/);
  assert.match(stylesheetSource, /\.activity-book-group\[open\] \.activity-book-summary::after/);
  assert.match(inventorySource, /`activity\.recent-books-list`/);
  assert.match(inventorySource, /`activity\.recent-book-group`/);
});
