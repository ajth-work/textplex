const apiBaseUrl = process.env.TEXTPLEX_HOSTED_API_BASE_URL?.replace(/\/$/, "");
const authToken = process.env.TEXTPLEX_HOSTED_AUTH_TOKEN;
const secondAuthToken = process.env.TEXTPLEX_HOSTED_AUTH_TOKEN_B;
const webBaseUrl = process.env.TEXTPLEX_HOSTED_WEB_BASE_URL?.replace(/\/$/, "");

if (!apiBaseUrl || !authToken) {
  throw new Error("TEXTPLEX_HOSTED_API_BASE_URL and TEXTPLEX_HOSTED_AUTH_TOKEN are required for hosted evidence.");
}

async function request(baseUrl, path, { token, method = "GET", body } = {}) {
  const headers = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function expectStatus(baseUrl, path, expectedStatus, options = {}) {
  const result = await request(baseUrl, path, options);
  if (result.response.status !== expectedStatus) {
    throw new Error(`${path} returned ${result.response.status}; expected ${expectedStatus}.`);
  }
  return result.payload;
}

const health = await expectStatus(apiBaseUrl, "/health", 200);
if (health?.status !== "ok") throw new Error("Hosted /health did not report status=ok.");

const readiness = await expectStatus(apiBaseUrl, "/ready", 200);
if (readiness?.status !== "ready" || Object.values(readiness.checks ?? {}).some((value) => value !== true)) {
  throw new Error("Hosted /ready did not report ready with all checks passing.");
}

await expectStatus(apiBaseUrl, "/profile/hosted", 401);
const me = await expectStatus(apiBaseUrl, "/auth/me", 200, { token: authToken });
const profile = await expectStatus(apiBaseUrl, "/profile/hosted", 200, { token: authToken });
if (profile?.user?.id !== me?.id) throw new Error("Hosted profile is not owned by the authenticated user.");

const sync = await expectStatus(apiBaseUrl, "/learning/sync", 200, { token: authToken, method: "POST" });
if (!["synced", "pending"].includes(sync?.status)) throw new Error("Hosted learner sync returned an unknown status.");

const entitlements = await expectStatus(apiBaseUrl, "/themes/entitlements", 200, { token: authToken });
if (!Array.isArray(entitlements?.theme_ids)) throw new Error("Hosted entitlements did not return theme_ids.");

if (secondAuthToken) {
  const secondMe = await expectStatus(apiBaseUrl, "/auth/me", 200, { token: secondAuthToken });
  await expectStatus(apiBaseUrl, "/profile/hosted", 200, { token: secondAuthToken });
  if (!secondMe?.id || secondMe.id === me?.id) throw new Error("Hosted multi-user evidence requires two distinct accounts.");
  console.log(`Hosted multi-user evidence passed for distinct accounts ${me.id} and ${secondMe.id}.`);
} else {
  console.log("Hosted multi-user evidence skipped: TEXTPLEX_HOSTED_AUTH_TOKEN_B is not configured.");
}

if (webBaseUrl) {
  for (const path of ["/", "/home", "/library", "/reader/demo-book/1", "/profile"]) {
    await expectStatus(webBaseUrl, path, 200);
  }
  console.log("Hosted deployment route evidence passed.");
} else {
  console.log("Hosted deployment route evidence skipped: TEXTPLEX_HOSTED_WEB_BASE_URL is not configured.");
}

console.log("Hosted authentication, Supabase profile, learner sync, entitlements, and readiness evidence passed.");
