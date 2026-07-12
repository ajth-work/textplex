import { setTimeout as delay } from "node:timers/promises";

const defaultBaseUrls = [
  "http://127.0.0.1:3000",
  "http://192.168.192.231:3000",
];

const baseUrls = parseList(process.env.TEXTPLEX_WEB_BASE_URLS, defaultBaseUrls);
const checks = parseList(process.env.TEXTPLEX_WEB_CHECK_PATHS, [
  "/",
  "/library",
  "/analysis/demo-book",
  "/search",
  "/study",
  "/progress",
  "/activity",
  "/import",
  "/settings",
  "/api/health",
]);
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

function assertHtmlResponse(response, url) {
  if (response.status !== 200) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${url} returned content-type "${contentType}" instead of HTML`);
  }

  return response.text().then((body) => {
    const expectedSnippets = {
      "/": "Read scanned books as structured language data.",
      "/library": "Books ready to read",
      "/analysis/demo-book": "Text analysis summary",
      "/search": "Search across books and vocabulary",
      "/study": "Review queue and study loop",
      "/progress": "Reading and vocabulary progress",
      "/activity": "Reading activity feed",
      "/import": "Paste text or upload a book",
      "/settings": "Profile and app preferences",
    };
    const path = new URL(url).pathname;
    const expectedSnippet = expectedSnippets[path];
    if (expectedSnippet && !body.includes(expectedSnippet)) {
      throw new Error(`${url} did not include expected content: ${expectedSnippet}`);
    }
  });
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
  if (json?.status !== "ok") {
    throw new Error(`${url} returned unexpected payload: ${JSON.stringify(json)}`);
  }
}

for (const baseUrl of baseUrls) {
  for (const path of checks) {
    const url = new URL(path, baseUrl).toString();
    const verifyResponse = path === "/api/health" ? assertHealthResponse : assertHtmlResponse;

    process.stdout.write(`Checking ${url}... `);
    await assertReachable(url, verifyResponse);
    process.stdout.write("ok\n");
  }
}
