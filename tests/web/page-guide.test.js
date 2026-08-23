const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const guideSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "page-guide.tsx"), "utf8");
const shellSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "app-shell.tsx"), "utf8");
const layoutSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "layout.tsx"), "utf8");
const buildFooterSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "build-footer.tsx"), "utf8");
const inventorySource = fs.readFileSync(path.join(repoRoot, "docs", "COMPONENTS_INVENTORY.md"), "utf8");

test("page guide is route-aware and remembers completed guides", () => {
  assert.match(guideSource, /function resolveGuide\(pathname: string\)/);
  assert.match(guideSource, /pathname === "\/home"/);
  assert.match(guideSource, /pathname === "\/library"/);
  assert.match(guideSource, /pathname === "\/import"/);
  assert.match(guideSource, /pathname\.startsWith\("\/reader\/"\)/);
  assert.match(guideSource, /pathname === "\/study" \|\| pathname\.startsWith\("\/study\/"\)/);
  assert.match(guideSource, /const DEFAULT_PAGE_GUIDE/);
  assert.match(guideSource, /return DEFAULT_PAGE_GUIDE/);
  assert.match(guideSource, /id: "import"/);
  assert.match(guideSource, /textplex\.page-guide\.completed\./);
  assert.match(guideSource, /window\.localStorage\.setItem/);
});

test("page guide provides carousel navigation and a persistent reopen trigger", () => {
  assert.doesNotMatch(shellSource, /<PageGuide \/>/);
  assert.match(layoutSource, /guideAction=\{<PageGuide \/>\}/);
  assert.match(buildFooterSource, /app-build-footer-header/);
  assert.match(guideSource, /aria-label=\{`Guide slide/);
  assert.match(guideSource, /Go to guide slide/);
  assert.match(guideSource, /Start exploring/);
  assert.match(guideSource, /handleTouchStart/);
  assert.match(guideSource, /handleTouchEnd/);
  assert.match(guideSource, /Math\.abs\(deltaX\) < 48/);
  assert.match(guideSource, /onTouchStart=\{handleTouchStart\}/);
  assert.match(guideSource, /data-inventory-id="shell\.page-guide-trigger"/);
  assert.match(guideSource, /data-inventory-id="shell\.page-guide-dialog"/);
  assert.match(inventorySource, /`shell\.page-guide-dialog`/);
  assert.match(inventorySource, /`shell\.page-guide-trigger`/);
});
