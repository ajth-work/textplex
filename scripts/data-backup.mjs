import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return path.resolve(value);
}

function runTar(args) {
  const result = spawnSync("tar", args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || `tar exited with status ${result.status}`);
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function backup() {
  const books = requiredArgument("--books");
  const user = requiredArgument("--user");
  const output = requiredArgument("--output");
  if (!fs.statSync(books).isDirectory() || !fs.statSync(user).isDirectory()) {
    throw new Error("Both --books and --user must be existing directories.");
  }

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "textplex-backup-"));
  try {
    fs.cpSync(books, path.join(staging, "books"), { recursive: true });
    fs.cpSync(user, path.join(staging, "user"), { recursive: true });
    fs.mkdirSync(path.dirname(output), { recursive: true });
    runTar(["-czf", output, "-C", staging, "books", "user"]);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  const manifest = {
    format: 1,
    created_at: new Date().toISOString(),
    archive: output,
    archive_sha256: sha256(output),
    sources: { books, user },
  };
  fs.writeFileSync(`${output}.json`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(manifest));
}

function restore() {
  const archive = requiredArgument("--archive");
  const target = requiredArgument("--target");
  if (argument("--confirm") !== "yes") {
    throw new Error("Restore requires --confirm yes and must target a disposable or approved empty directory.");
  }
  if (!fs.statSync(archive).isFile()) {
    throw new Error("Backup archive not found.");
  }
  if (fs.existsSync(target)) {
    if (!fs.statSync(target).isDirectory() || fs.readdirSync(target).length > 0) {
      throw new Error("Restore target must be a new or empty directory; no existing data was removed.");
    }
  } else {
    fs.mkdirSync(target, { recursive: true });
  }

  const listing = spawnSync("tar", ["-tzf", archive], { encoding: "utf8" });
  if (listing.error || listing.status !== 0) {
    throw new Error(listing.error?.message || listing.stderr || "Unable to inspect backup archive.");
  }
  const entries = listing.stdout.split(/\r?\n/).filter(Boolean);
  const unsafeEntry = entries.some((entry) => {
    const normalized = path.posix.normalize(entry.replaceAll("\\", "/"));
    return (
      (!normalized.startsWith("books/") && !normalized.startsWith("user/")) ||
      normalized.split("/").includes("..")
    );
  });
  if (unsafeEntry) {
    throw new Error("Backup archive contains paths outside books/ and user/.");
  }
  runTar(["-xzf", archive, "-C", target]);
  console.log(JSON.stringify({ restored: true, archive, target, archive_sha256: sha256(archive) }));
}

try {
  const mode = argument("--mode", "backup");
  if (mode === "backup") {
    backup();
  } else if (mode === "restore") {
    restore();
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
