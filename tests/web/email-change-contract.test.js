const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const profileSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "surface-views.tsx"), "utf8");
const mockProfileSource = fs.readFileSync(path.join(repoRoot, "apps", "web", "components", "mock-route-views.tsx"), "utf8");
const supabaseConfig = fs.readFileSync(path.join(repoRoot, "supabase", "config.toml"), "utf8");

test("email changes use Supabase Auth and a fixed callback", () => {
  assert.match(profileSource, /getSupabaseClient/);
  assert.match(profileSource, /client\.auth\.updateUser\(/);
  assert.match(profileSource, /emailRedirectTo: redirectTo/);
  assert.match(profileSource, /window\.location\.origin.*auth\/callback/);
  assert.match(profileSource, /both your current and new email inboxes/);
  assert.match(mockProfileSource, /profile\.email-change-form/);
});

test("local Supabase Auth requires both inboxes for an email change", () => {
  assert.match(supabaseConfig, /double_confirm_changes\s*=\s*true/);
});
