import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(root, "scripts/data-backup.mjs");

test("data backup and restore round-trip only book and user roots", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "textplex-backup-test-"));
  const source = path.join(tempRoot, "source");
  const restored = path.join(tempRoot, "restored");
  const archive = path.join(tempRoot, "backup.tar.gz");
  fs.mkdirSync(path.join(source, "books"), { recursive: true });
  fs.mkdirSync(path.join(source, "user"), { recursive: true });
  fs.writeFileSync(path.join(source, "books", "registry.json"), "{\"books\":1}\n");
  fs.writeFileSync(path.join(source, "user", "profile.sqlite3"), "disposable fixture\n");

  try {
    execFileSync(process.execPath, [
      script, "--mode", "backup", "--books", path.join(source, "books"), "--user", path.join(source, "user"), "--output", archive,
    ], { cwd: root, encoding: "utf8" });
    execFileSync(process.execPath, [
      script, "--mode", "restore", "--archive", archive, "--target", restored, "--confirm", "yes",
    ], { cwd: root, encoding: "utf8" });

    assert.equal(fs.readFileSync(path.join(restored, "books", "registry.json"), "utf8"), "{\"books\":1}\n");
    assert.equal(fs.readFileSync(path.join(restored, "user", "profile.sqlite3"), "utf8"), "disposable fixture\n");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
