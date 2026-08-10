const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("beta onboarding is required before protected routes render", () => {
  const appFrame = read("apps", "web", "components", "app-frame.tsx");
  const onboarding = read("apps", "web", "components", "beta-onboarding.tsx");
  const page = read("apps", "web", "app", "onboarding", "page.tsx");
  const inventory = read("docs", "COMPONENTS_INVENTORY.md");

  assert.match(appFrame, /onboarding\.completed/);
  assert.match(appFrame, /router\.replace\(`\/onboarding\?returnTo=/);
  assert.match(appFrame, /pathname === "\/onboarding"/);
  assert.match(appFrame, /pathname\.startsWith\("\/auth"\)/);
  assert.match(appFrame, /const onboardingCheckRoute/);
  assert.match(onboarding, /onboarding\.intent/);
  assert.match(onboarding, /onboarding\.confidence/);
  assert.match(onboarding, /onboarding\.support/);
  assert.match(onboarding, /onboarding\.target_language/);
  assert.match(onboarding, /onboarding\.target-language-question/);
  assert.match(onboarding, /languageDisplayLabel/);
  assert.match(onboarding, /shortCode/);
  assert.match(onboarding, /learningTrack/);
  assert.match(onboarding, /onboarding\.learning-track-question/);
  assert.doesNotMatch(onboarding, /profile\/hosted/);
  assert.match(onboarding, /onboarding\.learning_track/);
  assert.match(onboarding, /onboarding\.beta_acknowledged_at/);
  assert.match(onboarding, /Only import books and text you are allowed to use/);
  assert.match(onboarding, /Use the feedback button/);
  assert.match(page, /BetaOnboarding/);
  assert.match(inventory, /`onboarding\.page`/);
});
