const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("beta feedback loop wires authenticated submission to the protected admin review surface", () => {
  const widget = read("apps", "web", "components", "feedback-widget.tsx");
  const client = read("apps", "web", "lib", "textplex.ts");
  const adminPage = read("apps", "web", "app", "admin", "feedback", "page.tsx");
  const adminView = read("apps", "web", "components", "admin-feedback-view.tsx");
  const inventory = read("docs", "COMPONENTS_INVENTORY.md");

  assert.match(widget, /submitFeedback\(trimmedMessage, context\)/);
  assert.match(client, /postJson<FeedbackRecord>\("\/feedback", \{ original_text: originalText, context \}\)/);
  assert.match(client, /headers: await authHeaders\(true\)/);
  assert.match(adminPage, /<AdminOnly>/);
  assert.match(adminPage, /<AdminFeedbackView \/>/);
  assert.match(adminView, /fetchJson<\{ records: FeedbackRecord\[\] \}>\("\/feedback"\)/);
  assert.match(adminView, /patchJson<FeedbackRecord>\(`\/feedback\/\$\{selectedRecord\.id\}\/status`/);
  assert.match(inventory, /`admin-feedback\.page`[^\n]*Admin-only feedback review surface/);
});
