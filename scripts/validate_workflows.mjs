import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = new URL("../", import.meta.url);
const workflowDirectory = new URL(".github/workflows/", repoRoot);
const routeManifest = JSON.parse(readFileSync(new URL("config/route-smoke.json", repoRoot), "utf8"));

const errors = [];
const workflowFiles = readdirSync(workflowDirectory).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
let actionReferenceCount = 0;

for (const file of workflowFiles) {
  const source = readFileSync(new URL(file, workflowDirectory), "utf8");
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)/);
    if (!match) continue;
    const reference = match[1];
    if (reference.startsWith("./") || reference.startsWith("$/")) continue;
    actionReferenceCount += 1;
    if (!/@[0-9a-f]{40}$/.test(reference)) {
      errors.push(`${file}: third-party action is not pinned to a 40-character commit SHA: ${reference}`);
    }
  }
}

for (const profile of ["canonical", "legacy"]) {
  const routes = routeManifest[profile];
  if (!Array.isArray(routes) || routes.length === 0) {
    errors.push(`config/route-smoke.json: ${profile} route list must not be empty`);
    continue;
  }
  const paths = routes.map((route) => route.path);
  if (paths.some((path) => typeof path !== "string" || !path.startsWith("/"))) {
    errors.push(`config/route-smoke.json: ${profile} routes must use absolute paths`);
  }
  if (new Set(paths).size !== paths.length) {
    errors.push(`config/route-smoke.json: ${profile} routes contain duplicate paths`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${workflowFiles.length} workflow files, ${actionReferenceCount} pinned actions, and ${routeManifest.canonical.length + routeManifest.legacy.length} smoke routes.`);
}
