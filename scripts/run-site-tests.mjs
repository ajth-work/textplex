import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const siteTestsDir = join(process.cwd(), "tests", "site");

const testFiles = readdirSync(siteTestsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
  .map((entry) => join(siteTestsDir, entry.name))
  .sort((left, right) => left.localeCompare(right));

if (testFiles.length === 0) {
  console.error(`No site test files were found in ${siteTestsDir}.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
