const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..", "..");
const source = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "goals-view.tsx"), "utf8");
const homeSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "home-surface.tsx"), "utf8");
const inventory = fs.readFileSync(path.join(repoRoot, "docs", "COMPONENTS_INVENTORY.md"), "utf8");

test("goals route exposes editable period-based targets", () => {
  assert.match(source, /inventoryId="goals\.page"/);
  assert.match(source, /data-inventory-id="goals\.list"/);
  assert.match(source, /goals\.weeklyPages/);
  assert.match(source, /goals\.dailySentences/);
  assert.match(source, /goals\.monthlyWords/);
  assert.match(source, /goals\.weeklySessions/);
  assert.match(source, /goal-edit-label/);
  assert.match(source, /Save target/);
  assert.match(homeSource, /<Link href="\/goals">See All<\/Link>/);
  assert.match(inventory, /`goals\.focus-card`/);
  assert.match(inventory, /`goals\.sessions-card`/);
});
