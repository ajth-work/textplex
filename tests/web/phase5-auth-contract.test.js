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

test("Phase 5 exposes an authenticated hosted profile read path", () => {
  const authService = read("apps", "api", "app", "services", "auth.py");
  const main = read("apps", "api", "app", "main.py");
  const profileSurface = read("apps", "web", "components", "surface-views.tsx");
  const sharedContracts = read("packages", "shared", "src", "contracts.ts");

  assert.match(authService, /get_authenticated_user_context/);
  assert.match(authService, /get_hosted_profile/);
  assert.match(main, /@app\.get\("\/profile\/hosted"/);
  assert.match(main, /@app\.put\("\/profile\/hosted"/);
  assert.match(main, /@app\.get\("\/profile\/migration"/);
  assert.match(main, /@app\.get\("\/themes\/catalog"/);
  assert.match(profileSurface, /fetchJson<HostedProfileSurfaceResponse>\("\/profile\/hosted"\)/);
  assert.match(profileSurface, /putJson<HostedProfileSurfaceResponse>\("\/profile\/hosted"/);
  assert.match(profileSurface, /profile\.hosted-account-card/);
  assert.match(profileSurface, /profile\.migration-card/);
  assert.match(sharedContracts, /HostedProfileSurfaceResponse/);
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

test("Phase 5 records migration and entitlement ownership boundaries", () => {
  const migration = read("apps", "api", "app", "db", "migrations", "user", "0002_profile_migrations.sql");
  const themeMigration = read("supabase", "migrations", "20260722120000_create_theme_catalog.sql");
  const phase = read("docs", "FRONTEND_MIGRATION_PHASE_5.md");

  assert.match(migration, /profile_migrations/);
  assert.match(themeMigration, /create table if not exists public\.theme_catalog/);
  assert.match(themeMigration, /theme_entitlements/);
  assert.match(themeMigration, /\(select auth\.uid\(\)\) = user_id/);
  assert.match(phase, /merge_non_destructive/);
  assert.match(phase, /entitlement/);
});
