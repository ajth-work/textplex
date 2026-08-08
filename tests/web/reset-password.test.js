const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("Supabase recovery links have a dedicated password update flow", () => {
  const authPage = read("apps", "web", "app", "auth", "page.tsx");
  const callbackPage = read("apps", "web", "app", "auth", "callback", "page.tsx");
  const resetPasswordPage = read("apps", "web", "app", "auth", "reset-password", "page.tsx");
  const landingPage = read("apps", "web", "components", "landing-page.tsx");

  assert.match(authPage, /auth\/reset-password\?returnTo=/);
  assert.match(callbackPage, /PASSWORD_RECOVERY/);
  assert.match(callbackPage, /auth\/reset-password\?returnTo=/);
  assert.match(resetPasswordPage, /updateUser\(\{ password \}\)/);
  assert.match(resetPasswordPage, /auth\.reset-password-form/);
  assert.match(resetPasswordPage, /auth\.reset-password-account/);
  assert.match(resetPasswordPage, /Resetting the password for/);
  assert.match(resetPasswordPage, /accountLabel \?\? accountEmail/);
  assert.match(resetPasswordPage, /setAccountEmail/);
  assert.match(resetPasswordPage, /expired/);
  assert.match(landingPage, /error_code.*otp_expired/);
});
