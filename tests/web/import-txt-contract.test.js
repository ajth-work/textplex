import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (...parts) => readFileSync(resolve(root, ...parts), "utf8");

test("TXT upload support is wired through the live and demo import surfaces", () => {
  const liveImport = read("apps", "web", "components", "surface-views.tsx");
  const demoImport = read("apps", "web", "components", "mock-route-views.tsx");
  const demoData = read("apps", "web", "lib", "demo-data.ts");
  const sharedContract = read("packages", "shared", "src", "contracts.ts");

  assert.match(liveImport, /\.endsWith\("\.txt"\)/);
  assert.match(liveImport, /text\/plain,\.txt/);
  assert.match(liveImport, /PDF, EPUB, or TXT/);
  assert.match(demoImport, /supported_inputs: \["pdf", "epub", "txt"/);
  assert.match(demoData, /supported_inputs: \["pdf", "epub", "txt"/);
  assert.match(sharedContract, /can_upload_txt: boolean/);
});
