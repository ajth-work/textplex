const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("saved account sessions stay separate from the active Supabase session", () => {
  const storage = read("apps", "web", "lib", "saved-auth-sessions.ts");
  const provider = read("apps", "web", "components", "auth-provider.tsx");

  assert.match(storage, /textplex\.saved-auth-sessions/);
  assert.match(storage, /localStorage/);
  assert.match(storage, /refresh_token/);
  assert.match(storage, /removeSavedAuthSession/);
  assert.match(provider, /setSession\(\{/);
  assert.match(provider, /saveAuthSession/);
  assert.match(provider, /switchAccount/);
});

test("the account menu exposes switching, adding, and trusted-device removal", () => {
  const accountMenu = read("apps", "web", "components", "account-menu.tsx");
  const authPage = read("apps", "web", "app", "auth", "page.tsx");
  const inventory = read("docs", "COMPONENTS_INVENTORY.md");

  assert.match(accountMenu, /shell\.account-switcher/);
  assert.match(accountMenu, /Add another account/);
  assert.match(accountMenu, /Remove \$\{savedAccountLabel\} from this device/);
  assert.match(authPage, /add-account/);
  assert.match(authPage, /isAddingAccount/);
  assert.match(inventory, /shell\.account-switcher/);
});
