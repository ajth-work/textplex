import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const routeManifest = JSON.parse(
  readFileSync(new URL("../config/route-smoke.json", import.meta.url), "utf8"),
);
const defaultSiteUrls = [
  "http://127.0.0.1:3000",
];

const defaultApiHealthUrls = [
  "http://127.0.0.1:8201/health",
  "http://192.168.192.231:8201/health",
];

const siteUrls = parseList(process.env.TEXTPLEX_WEB_BASE_URLS, defaultSiteUrls);
const apiHealthUrls = parseList(process.env.TEXTPLEX_API_HEALTH_URLS, defaultApiHealthUrls);
const configuredSiteChecks = process.env.TEXTPLEX_WEB_CHECK_PATHS
  ? parseList(process.env.TEXTPLEX_WEB_CHECK_PATHS, [])
  : null;
const attempts = Number(process.env.TEXTPLEX_WEB_CHECK_ATTEMPTS ?? "12");
const retryDelayMs = Number(process.env.TEXTPLEX_WEB_CHECK_DELAY_MS ?? "500");
const requestTimeoutMs = Number(process.env.TEXTPLEX_WEB_REQUEST_TIMEOUT_MS ?? "2500");

function parseList(rawValue, fallback) {
  if (!rawValue || !rawValue.trim()) {
    return fallback;
  }

  return rawValue
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function routesForBase(baseUrl) {
  const profile = new URL(baseUrl).port === "8200" ? "legacy" : "canonical";
  return routeManifest[profile];
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(url, {
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function assertReachable(url, verifyResponse) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);
      await verifyResponse(response, url);
      return;
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await delay(retryDelayMs);
      }
    }
  }

  throw new Error(`Unable to reach ${url} after ${attempts} attempts. Last error: ${lastError?.message ?? lastError}`);
}

async function assertHtmlResponse(response, url) {
  if (response.status !== 200) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${url} returned content-type "${contentType}" instead of HTML`);
  }

  const body = await response.text();
  const path = new URL(url).pathname;
  const expectedSnippet = routesForBase(url)
    .find((route) => route.path === path)
    ?.expected;
  if (expectedSnippet && !body.includes(expectedSnippet)) {
    throw new Error(`${url} did not include expected content: ${expectedSnippet}`);
  }
}

async function assertHealthResponse(response, url) {
  if (response.status !== 200) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`${url} returned content-type "${contentType}" instead of JSON`);
  }

  const json = await response.json();
  if (!["ok", "ready"].includes(json?.status)) {
    throw new Error(`${url} returned unexpected payload: ${JSON.stringify(json)}`);
  }

  if (new URL(url).pathname === "/ready" && Object.values(json.checks ?? {}).some((value) => value !== true)) {
    throw new Error(`${url} reported an unhealthy readiness check: ${JSON.stringify(json)}`);
  }
}

for (const baseUrl of siteUrls) {
  const routes = configuredSiteChecks
    ? configuredSiteChecks.map((path) => ({ path }))
    : routesForBase(baseUrl);
  for (const route of routes) {
    const url = new URL(route.path, baseUrl).toString();
    process.stdout.write(`Checking ${url}... `);
    await assertReachable(url, assertHtmlResponse);
    process.stdout.write("ok\n");
  }
}

if (process.env.TEXTPLEX_SKIP_API_HEALTH !== "1") {
  for (const healthUrl of apiHealthUrls) {
    process.stdout.write(`Checking ${healthUrl}... `);
    await assertReachable(healthUrl, assertHealthResponse);
    process.stdout.write("ok\n");
  }
}
