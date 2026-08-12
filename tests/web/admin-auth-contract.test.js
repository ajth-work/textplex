const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("admin surfaces rehydrate and explain the server-resolved account role", () => {
  const authProvider = read("apps", "web", "components", "auth-provider.tsx");
  const adminOnly = read("apps", "web", "components", "admin-only.tsx");
  const adminSubnav = read("apps", "web", "components", "admin-subnav.tsx");
  const inventory = read("docs", "COMPONENTS_INVENTORY.md");

  assert.match(authProvider, /client\.auth\.getUser\(\)/);
  assert.match(authProvider, /syncAuthSessionCookie\(hydratedSession\)/);
  assert.match(adminOnly, /fetchJson<AuthMeResponse>\("\/auth\/me"\)/);
  assert.match(adminOnly, /data-inventory-id="admin\.auth-status-card"/);
  assert.match(adminSubnav, /data-inventory-id="admin\.nav"/);
  assert.match(adminSubnav, /\/admin\/feedback/);
  assert.match(adminSubnav, /\/admin\/themes/);
  assert.match(adminSubnav, /usePathname/);
  assert.match(inventory, /`admin\.nav`/);
  assert.match(inventory, /admin\.auth-status-card/);
});
