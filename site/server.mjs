import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = process.cwd();
const REPO_ROOT = path.resolve(SITE_ROOT, "..");
const RESULTS_DIR = path.join(SITE_ROOT, ".test-results");
const LATEST_RESULTS_PATH = path.join(RESULTS_DIR, "latest.json");
const PORT = Number.parseInt(process.env.PORT || "8200", 10);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const ROUTE_FILES = {
  "/": "index.html",
  "/library": "library-preview.html",
  "/search": "search-preview.html",
  "/study": "study-preview.html",
  "/progress": "progress-preview.html",
  "/activity": "activity-preview.html",
  "/import": "import-preview.html",
  "/settings": "profile-preview.html",
  "/profile": "profile-preview.html",
};

let activeRun = null;

function baseReport() {
  return {
    suite: "site",
    command: "node --test tests/site",
    status: "idle",
    startedAt: null,
    finishedAt: null,
    durationMs: 0,
    exitCode: null,
    summary: {
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      todo: 0,
    },
    failingTests: [],
    passingTests: [],
    stdout: "",
    stderr: "",
  };
}

async function ensureResultsDir() {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
}

async function readLatestReport() {
  try {
    const raw = await fs.readFile(LATEST_RESULTS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return baseReport();
  }
}

async function writeLatestReport(report) {
  await ensureResultsDir();
  await fs.writeFile(LATEST_RESULTS_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function parseTestOutput({ stdout, stderr, exitCode, startedAt, finishedAt }) {
  const report = baseReport();
  report.startedAt = startedAt;
  report.finishedAt = finishedAt;
  report.durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
  report.exitCode = exitCode;
  report.status = exitCode === 0 ? "passed" : "failed";
  report.stdout = stdout.trim();
  report.stderr = stderr.trim();

  const lines = stdout.split(/\r?\n/);
  let currentFailure = null;

  for (const line of lines) {
    const okMatch = line.match(/^ok\s+\d+\s+-\s+(.*)$/);
    if (okMatch) {
      report.summary.tests += 1;
      report.summary.passed += 1;
      report.passingTests.push(okMatch[1].trim());
      currentFailure = null;
      continue;
    }

    const failMatch = line.match(/^not ok\s+\d+\s+-\s+(.*)$/);
    if (failMatch) {
      report.summary.tests += 1;
      report.summary.failed += 1;
      currentFailure = {
        name: failMatch[1].trim(),
        details: [],
      };
      report.failingTests.push(currentFailure);
      continue;
    }

    const summaryMatch = line.match(/^#\s+(tests|pass|fail|skipped|todo)\s+(\d+)/);
    if (summaryMatch) {
      const [, key, value] = summaryMatch;
      report.summary[key] = Number(value);
      continue;
    }

    const durationMatch = line.match(/^#\s+duration_ms\s+(\d+(?:\.\d+)?)/);
    if (durationMatch) {
      report.durationMs = Number(durationMatch[1]);
      continue;
    }

    if (currentFailure && line.trim() && !line.startsWith("#")) {
      currentFailure.details.push(line.trim());
    }
  }

  if (!report.summary.tests) {
    report.summary.tests = report.summary.passed + report.summary.failed + report.summary.skipped + report.summary.todo;
  }

  return report;
}

async function runTests() {
  if (activeRun) {
    return activeRun;
  }

  const startedAt = new Date().toISOString();
  const latest = baseReport();
  latest.status = "running";
  latest.startedAt = startedAt;
  await writeLatestReport(latest);

  activeRun = new Promise((resolve) => {
    const child = spawn(process.execPath, ["--test", "tests/site"], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        NODE_DISABLE_COLORS: "1",
        FORCE_COLOR: "0",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("close", async (code) => {
      const finishedAt = new Date().toISOString();
      const report = parseTestOutput({
        stdout,
        stderr,
        exitCode: code ?? 1,
        startedAt,
        finishedAt,
      });
      await writeLatestReport(report);
      resolve(report);
    });
  }).finally(() => {
    activeRun = null;
  });

  return activeRun;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

async function serveStatic(req, res, pathname) {
  const routeFile = ROUTE_FILES[pathname]
    || (pathname.startsWith("/analysis/") ? "analysis-preview.html" : null)
    || (pathname.startsWith("/reader/") ? "reader-preview.html" : null)
    || (pathname.startsWith("/books/") ? "library-detail-preview.html" : null);
  const relativePath = routeFile ? `/${routeFile}` : pathname;
  const decodedPath = decodeURIComponent(relativePath);
  const safePath = path.normalize(decodedPath).replace(/^([.]{2}[\/\\])+/, "");
  const filePath = path.join(SITE_ROOT, safePath);

  if (!filePath.startsWith(SITE_ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    if (req.method !== "HEAD") {
      res.end(data);
    } else {
      res.end();
    }
  } catch {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ detail: "Not Found" }));
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/__test-results.json") {
    sendJson(res, 200, await readLatestReport());
    return;
  }

  if (req.method === "POST" && pathname === "/__run-tests") {
    const report = await runTests();
    sendJson(res, report.status === "passed" ? 200 : 500, report);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ detail: "Method not allowed" }));
    return;
  }

  await serveStatic(req, res, pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`TextPlex site server listening on http://0.0.0.0:${PORT}\n`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

