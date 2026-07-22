#!/usr/bin/env node

import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const repoRoot = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
const args = process.argv.slice(2);
const modeIndex = args.indexOf("--mode");
const mode = modeIndex >= 0 ? args[modeIndex + 1] : "report";
const strict = args.includes("--strict");
const live = args.includes("--live");

function printHelp() {
  console.log(`TextPlex update and repair cycle

Usage:
  npm run maintenance:check
  npm run maintenance:repair
  npm run maintenance:update
  npm run maintenance:repair -- --live
  npm run maintenance:check -- --strict

Modes:
  report  Read-only dependency, runtime, audit, and worktree report (default).
  repair  Reconcile the lockfile, reinstall declared dependencies, and verify.
  update  Apply in-range npm updates, reinstall declared dependencies, and verify.

Options:
  --live    Include live API/site reachability checks; services must already run.
  --strict  Return failure when the report finds outdated packages or audit issues.
`);
}

function run(command, commandArgs, { capture = false, allowFailure = false, timeoutMs } = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    timeout: timeoutMs,
  });

  if (result.error) {
    if (!allowFailure) {
      throw result.error;
    }
    return { status: 1, stdout: "", stderr: result.error.message };
  }

  const status = result.status ?? 1;
  if (status !== 0 && !allowFailure) {
    throw new Error(`${command} ${commandArgs.join(" ")} exited with ${status}`);
  }

  return {
    status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseJson(output) {
  const trimmed = output.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function findPython() {
  const venvPython = join(
    repoRoot,
    "apps",
    "api",
    ".venv",
    process.platform === "win32" ? "Scripts" : "bin",
    process.platform === "win32" ? "python.exe" : "python",
  );

  if (existsSync(venvPython)) return venvPython;

  for (const candidate of process.platform === "win32" ? ["python.exe", "python"] : ["python3", "python"]) {
    const probe = run(candidate, ["--version"], { capture: true, allowFailure: true });
    if (probe.status === 0) return candidate;
  }

  return null;
}

function printRuntime() {
  const npmVersion = run(npmCommand, ["--version"], { capture: true, allowFailure: true });
  console.log(`Node ${process.version}; npm ${npmVersion.stdout.trim() || "unavailable"}`);
  if (nodeMajor < 24) {
    console.warn("WARNING: repair and update modes require Node 24 or newer.");
  }
}

function printWorktree() {
  const status = run("git", ["status", "--short"], { capture: true, allowFailure: true });
  if (status.status !== 0) {
    console.warn("Worktree: unknown; Git status could not be read.");
    return;
  }
  const lines = status.stdout.trim().split(/\r?\n/).filter(Boolean);
  console.log(`Worktree: ${lines.length ? `${lines.length} changed path(s)` : "clean"}`);
  if (lines.length) {
    console.warn("WARNING: review existing changes before running update mode.");
  }
}

function reportNpmDrift() {
  const outdated = run(npmCommand, ["outdated", "--json"], { capture: true, allowFailure: true, timeoutMs: 30_000 });
  const packages = parseJson(outdated.stdout) ?? {};
  const entries = Object.entries(packages).filter(([name, details]) => name !== "error" && details && typeof details === "object");

  if (entries.length === 0) {
    console.log("npm outdated: no declared packages have newer registry versions in the current ranges.");
  } else {
    console.log("npm outdated:");
    for (const [name, details] of entries) {
      console.log(`  ${name}: ${details.current ?? "missing"} -> wanted ${details.wanted ?? "n/a"}, latest ${details.latest ?? "n/a"}`);
    }
  }

  return { hasDrift: entries.length > 0, commandFailed: outdated.status !== 0 && entries.length === 0 };
}

function reportAudit() {
  const audit = run(npmCommand, ["audit", "--omit=dev", "--json"], { capture: true, allowFailure: true, timeoutMs: 60_000 });
  const data = parseJson(audit.stdout);
  const vulnerabilities = data?.metadata?.vulnerabilities ?? {};
  const total = Object.values(vulnerabilities).reduce((sum, value) => sum + (Number(value) || 0), 0);

  if (total === 0 && audit.status === 0) {
    console.log("npm audit: 0 production vulnerabilities.");
  } else {
    console.warn(`npm audit: ${total || "unavailable"} production vulnerability finding(s) or an audit command failure.`);
  }

  return { hasFindings: total > 0 || audit.status !== 0 };
}

function reportPythonDrift(python) {
  if (!python) {
    console.log("Python dependency report: skipped; no Python interpreter was found.");
    return { hasDrift: false, commandFailed: false };
  }

  const outdated = run(python, ["-m", "pip", "list", "--outdated", "--format=json"], { capture: true, allowFailure: true, timeoutMs: 30_000 });
  const packages = parseJson(outdated.stdout) ?? [];

  if (packages.length === 0 && outdated.status === 0) {
    console.log("Python outdated: no outdated packages reported.");
  } else {
    console.log(`Python outdated: ${packages.length || "unavailable"} package(s).`);
    for (const packageInfo of packages) {
      console.log(`  ${packageInfo.name}: ${packageInfo.version} -> ${packageInfo.latest_version}`);
    }
  }

  return { hasDrift: packages.length > 0, commandFailed: outdated.status !== 0 && packages.length === 0 };
}

function report() {
  console.log("TextPlex update and repair cycle: report mode");
  printRuntime();
  printWorktree();
  const npm = reportNpmDrift();
  const audit = reportAudit();
  const python = reportPythonDrift(findPython());

  if (strict && (npm.hasDrift || npm.commandFailed || audit.hasFindings || python.hasDrift || python.commandFailed)) {
    process.exitCode = 1;
  }
}

function requireSupportedNode() {
  if (nodeMajor < 24) {
    throw new Error("Node 24 or newer is required for repair and update modes. Use .nvmrc or the Node 24 Docker image.");
  }
}

function reinstallNodeDependencies() {
  console.log("Reinstalling Node dependencies from package-lock.json with only the repository-approved lifecycle scripts...");
  run(npmCommand, ["ci"]);
}

function repairPython(python) {
  if (!python) {
    console.warn("Python repair skipped; no Python interpreter was found.");
    return;
  }

  console.log("Reinstalling the declared API and processor Python packages...");
  run(python, ["-m", "pip", "install", "-e", "apps/api[dev]", "-e", "packages/processor"]);
}

function verify() {
  console.log("Running maintenance verification gates...");
  run(npmCommand, ["audit", "--omit=dev"]);
  run(npmCommand, ["run", "test:maintenance"]);
  run(npmCommand, ["run", "test:site"]);
  run(npmCommand, ["run", "test:web:reader"]);
  run(npmCommand, ["run", "test:web:phase3"]);
  run(npmCommand, ["run", "lint:web"]);
  run(npmCommand, ["run", "build:web"]);

  const python = findPython();
  if (python) run(python, ["-m", "pytest", "-q"]);
  if (live) run(npmCommand, ["run", "test:web"]);
  run("git", ["diff", "--check"]);
}

function mutate(selectedMode) {
  requireSupportedNode();
  printRuntime();
  printWorktree();

  if (selectedMode === "update") {
    console.log("Applying in-range npm updates to package-lock.json; package manifests are not rewritten.");
    run(npmCommand, ["update", "--package-lock-only", "--ignore-scripts", "--include-workspace-root"]);
  } else {
    console.log("Repairing package-lock.json from the declared manifests...");
    run(npmCommand, ["install", "--package-lock-only", "--ignore-scripts", "--include-workspace-root"]);
  }

  reinstallNodeDependencies();
  repairPython(findPython());
  verify();
  console.log(`TextPlex ${selectedMode} cycle completed successfully.`);
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
} else if (!["report", "repair", "update"].includes(mode)) {
  console.error(`Unknown mode: ${mode}. Use --help for usage.`);
  process.exitCode = 2;
} else {
  try {
    if (mode === "report") report();
    else mutate(mode);
  } catch (error) {
    console.error(`Maintenance cycle failed: ${error.message}`);
    process.exitCode = 1;
  }
}
