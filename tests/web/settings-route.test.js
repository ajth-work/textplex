const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const surfaceSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "surface-views.tsx"), "utf8");
const mockSurfaceSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "mock-route-views.tsx"), "utf8");
const stylesheetSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "app", "globals.css"), "utf8");

test("Settings menu cards use the shared route card spacing", () => {
  assert.match(surfaceSource, /<section className="card feature-card">[\s\S]*Preferences[\s\S]*<\/section>\s*<Link className="card feature-card settings-roadmap-card"/);
  assert.match(mockSurfaceSource, /<section className="card feature-card">[\s\S]*Preferences[\s\S]*<\/section>\s*<Link className="card feature-card settings-roadmap-card"/);
  assert.match(stylesheetSource, /\.app-shell\s*\{[\s\S]*display: grid;[\s\S]*gap: 1rem;/);
});
