const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const repoRoot = path.join(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

test("Compose defines Next as the canonical product and scopes the static shell", () => {
  const compose = read("docker-compose.yml");

  assert.match(compose, /web:\r?\n\s+build:/);
  assert.match(compose, /- "3000:3000"/);
  assert.match(compose, /profiles:\s+\["legacy"\]/);
  assert.match(compose, /- "8201:8000"/);
  assert.match(compose, /NEXT_PUBLIC_TEXTPLEX_API_URL/);
});

test("canonical deployment docs keep the browser and API ports explicit", () => {
  const readme = read("README.md");
  const localDevelopment = read("docs", "LOCAL_DEVELOPMENT.md");
  const phase = read("docs", "FRONTEND_MIGRATION_PHASE_4.md");

  for (const document of [readme, localDevelopment, phase]) {
    assert.match(document, /3000/);
    assert.match(document, /8201/);
    assert.match(document, /8200/);
  }
  assert.match(phase, /legacy\/preview compatibility/);
});
