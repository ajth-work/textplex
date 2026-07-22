const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

test("update and repair cycle exposes safe commands", () => {
  const script = join(process.cwd(), "scripts", "update-repair-cycle.mjs");
  const result = spawnSync(process.execPath, [script, "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /maintenance:check/);
  assert.match(result.stdout, /maintenance:repair/);
  assert.match(result.stdout, /maintenance:update/);
  assert.match(result.stdout, /--strict/);
});
