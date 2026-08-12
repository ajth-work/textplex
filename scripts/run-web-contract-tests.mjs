import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const webTestsDir = join(process.cwd(), "tests", "web");

const testFiles = readdirSync(webTestsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
  .map((entry) => join(webTestsDir, entry.name))
  .sort((left, right) => left.localeCompare(right));

if (testFiles.length === 0) {
  console.error(`No web contract test files were found in ${webTestsDir}.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
