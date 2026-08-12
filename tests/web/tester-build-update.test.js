import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (...parts) => readFileSync(resolve(root, ...parts), "utf8");

test("tester build updates are grouped, account-scoped, and blocking", () => {
  const updates = read("apps", "web", "lib", "tester-build-updates.ts");
  const gate = read("apps", "web", "components", "tester-build-update-gate.tsx");
  const frame = read("apps", "web", "components", "app-frame.tsx");
  const roles = read("apps", "web", "lib", "auth-roles.ts");

  assert.match(roles, /isTextPlexTester/);
  assert.match(updates, /textplex\.tester-last-build/);
  assert.match(updates, /testerLastBuildStorageKey\(userId\)/);
  assert.match(updates, /getTesterChangelogSince/);
  assert.match(updates, /title: "Reader and language support"/);
  assert.match(updates, /title: "Import and library"/);
  assert.match(gate, /Acknowledge and continue/);
  assert.match(gate, /data-inventory-id="shell\.tester-build-update-items"/);
  assert.match(frame, /isTextPlexTester\(user\)/);
  assert.match(frame, /lastBuild === appVersion \? "complete" : "required"/);
  assert.match(frame, /<TesterBuildUpdateGate/);
});
