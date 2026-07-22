const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("Phase 5 starts from an explicit Supabase identity boundary", () => {
  const authProvider = read("apps", "web", "components", "auth-provider.tsx");
  const authPage = read("apps", "web", "app", "auth", "page.tsx");
  const supabaseClient = read("apps", "web", "lib", "supabase.ts");

  assert.match(authProvider, /onAuthStateChange/);
  assert.match(authProvider, /signOut/);
  assert.match(authPage, /signInWithPassword/);
  assert.match(authPage, /signUp/);
  assert.match(authPage, /resetPasswordForEmail/);
  assert.match(supabaseClient, /persistSession: true/);
  assert.match(supabaseClient, /autoRefreshToken: true/);
});

test("Phase 5 starts from user-owned profile and settings RLS", () => {
  const migration = read("supabase", "migrations", "20260721130000_create_profiles.sql");
  const phase = read("docs", "FRONTEND_MIGRATION_PHASE_5.md");

  assert.match(migration, /alter table public\.profiles enable row level security/);
  assert.match(migration, /\(select auth\.uid\(\)\) = id/);
  assert.match(migration, /alter table public\.user_settings enable row level security/);
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/);
  assert.match(phase, /authenticated API request contract/);
  assert.match(phase, /server-authoritative/);
});
