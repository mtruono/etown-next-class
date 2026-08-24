export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  INSTALLATION_SALT: string;
  DASHBOARD_USERNAME: string;
  DASHBOARD_PASSWORD: string;
  ALLOWED_ORIGINS?: string;
}

const PRODUCTION_ORIGIN = "https://mtruono.github.io";
const BODY_LIMIT_BYTES = 1024;
const allowedEvents = new Set([
  "app_open",
  "take_me_to_class_tapped",
  "take_me_home_tapped",
  "map_launch_attempted",
  "location_permission_denied",
  "location_timeout",
  "location_unavailable",
  "telemetry_disabled",
]);
const allowedTargets = new Set(["class", "home"]);
const allowedProviders = new Set(["concept3d", "apple", "google"]);
const allowedKeys = new Set([
  "event",
  "target",
  "provider",
  "app_version",
  "installation_id",
]);
const recentEvents = new Map<string, { windowStart: number; count: number }>();

interface EventPayload {
  event: string;
  target?: string;
  provider?: string;
  app_version: string;
  installation_id: string;
}

export interface DashboardSummary {
  last_app_open: string | null;
  last_home_tap: string | null;
  last_class_tap: string | null;
  opens_7d: number;
  opens_30d: number;
  home_7d: number;
  home_30d: number;
  class_7d: number;
  class_30d: number;
  concept3d_launches: number;
  apple_launches: number;
  google_launches: number;
  permission_denied: number;
  location_timeouts: number;
  location_unavailable: number;
  installations: number;
}

export const DASHBOARD_SUMMARY_SQL = `
SELECT
  MAX(CASE WHEN event_name = 'app_open' THEN created_at END) AS last_app_open,
  MAX(CASE WHEN event_name = 'take_me_home_tapped' THEN created_at END) AS last_home_tap,
  MAX(CASE WHEN event_name = 'take_me_to_class_tapped' THEN created_at END) AS last_class_tap,
  SUM(CASE WHEN event_name = 'app_open' AND created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS opens_7d,
  SUM(CASE WHEN event_name = 'app_open' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS opens_30d,
  SUM(CASE WHEN event_name = 'take_me_home_tapped' AND created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS home_7d,
  SUM(CASE WHEN event_name = 'take_me_home_tapped' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS home_30d,
  SUM(CASE WHEN event_name = 'take_me_to_class_tapped' AND created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS class_7d,
  SUM(CASE WHEN event_name = 'take_me_to_class_tapped' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS class_30d,
  SUM(CASE WHEN event_name = 'map_launch_attempted' AND provider = 'concept3d' THEN 1 ELSE 0 END) AS concept3d_launches,
  SUM(CASE WHEN event_name = 'map_launch_attempted' AND provider = 'apple' THEN 1 ELSE 0 END) AS apple_launches,
  SUM(CASE WHEN event_name = 'map_launch_attempted' AND provider = 'google' THEN 1 ELSE 0 END) AS google_launches,
  SUM(CASE WHEN event_name = 'location_permission_denied' THEN 1 ELSE 0 END) AS permission_denied,
  SUM(CASE WHEN event_name = 'location_timeout' THEN 1 ELSE 0 END) AS location_timeouts,
  SUM(CASE WHEN event_name = 'location_unavailable' THEN 1 ELSE 0 END) AS location_unavailable,
  COUNT(DISTINCT installation_hash) AS installations
FROM events
WHERE created_at >= datetime('now', '-90 days')`;

function allowedOrigins(env: Env): Set<string> {
  return new Set([
    PRODUCTION_ORIGIN,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    ...(env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]);
}

function cors(origin: string): HeadersInit {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function jsonError(
  status: number,
  message: string,
  headers: HeadersInit = {},
): Response {
  return Response.json({ error: message }, { status, headers });
}

function validPayload(input: unknown): input is EventPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const payload = input as Record<string, unknown>;
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) return false;
  if (typeof payload.event !== "string" || !allowedEvents.has(payload.event))
    return false;
  if (
    typeof payload.app_version !== "string" ||
    !/^[0-9A-Za-z._-]{1,32}$/u.test(payload.app_version)
  )
    return false;
  if (
    typeof payload.installation_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      payload.installation_id,
    )
  )
    return false;
  if (
    payload.target !== undefined &&
    (typeof payload.target !== "string" || !allowedTargets.has(payload.target))
  )
    return false;
  if (
    payload.provider !== undefined &&
    (typeof payload.provider !== "string" ||
      !allowedProviders.has(payload.provider))
  )
    return false;
  if (
    payload.event === "map_launch_attempted" &&
    (!payload.target || !payload.provider)
  )
    return false;
  if (payload.event === "take_me_home_tapped" && payload.target !== "home")
    return false;
  if (payload.event === "take_me_to_class_tapped" && payload.target !== "class")
    return false;
  return true;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function equalSecret(actual: string, expected: string): boolean {
  const length = Math.max(actual.length, expected.length);
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function dashboardAuthorized(request: Request, env: Env): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return (
      equalSecret(decoded.slice(0, separator), env.DASHBOARD_USERNAME) &&
      equalSecret(decoded.slice(separator + 1), env.DASHBOARD_PASSWORD)
    );
  } catch {
    return false;
  }
}

function escapeHtml(value: string | number | null): string {
  return String(value ?? "Never")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function eventResponse(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > BODY_LIMIT_BYTES)
    return jsonError(413, "Body too large", cors(origin));
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > BODY_LIMIT_BYTES)
    return jsonError(413, "Body too large", cors(origin));
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return jsonError(400, "Invalid JSON", cors(origin));
  }
  if (!validPayload(parsed))
    return jsonError(400, "Invalid event", cors(origin));
  const installationHash = await sha256(
    `${env.INSTALLATION_SALT}:${parsed.installation_id}`,
  );
  const now = Date.now();
  const recent = recentEvents.get(installationHash);
  if (recent && now - recent.windowStart < 60_000) {
    if (recent.count >= 60)
      return jsonError(429, "Too many events", cors(origin));
    recent.count += 1;
  } else {
    recentEvents.set(installationHash, { windowStart: now, count: 1 });
  }
  const createdAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM events WHERE created_at < datetime('now', '-90 days')",
    ),
    env.DB.prepare(
      "INSERT INTO events (event_name, installation_hash, target, provider, app_version, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    ).bind(
      parsed.event,
      installationHash,
      parsed.target ?? null,
      parsed.provider ?? null,
      parsed.app_version,
      createdAt,
    ),
  ]);
  return new Response(null, { status: 204, headers: cors(origin) });
}

async function dashboardResponse(env: Env): Promise<Response> {
  const summary = await env.DB.prepare(
    DASHBOARD_SUMMARY_SQL,
  ).first<DashboardSummary>();
  const value = (key: keyof DashboardSummary): string =>
    escapeHtml(summary?.[key] ?? 0);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><title>Etown Assistant Status</title><style>body{font:16px system-ui;margin:0;background:#f4f6fb;color:#17213b}main{max-width:760px;margin:auto;padding:32px 18px}h1{margin:0 0 8px}.note{color:#667089}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.card{background:white;border-radius:16px;padding:18px;box-shadow:0 8px 24px #17213b12}.card strong{display:block;font-size:1.7rem;color:#173b7a}.wide{grid-column:1/-1}</style></head><body><main><h1>Etown Campus Assistant</h1><p class="note">Anonymous launch attempts only. This dashboard cannot prove route completion or arrival.</p><div class="grid"><section class="card wide"><h2>Last activity</h2><p>App open: ${value("last_app_open")}</p><p>Take me home: ${value("last_home_tap")}</p><p>Class navigation: ${value("last_class_tap")}</p></section><section class="card"><span>Opens · 7 / 30 days</span><strong>${value("opens_7d")} / ${value("opens_30d")}</strong></section><section class="card"><span>Home taps · 7 / 30 days</span><strong>${value("home_7d")} / ${value("home_30d")}</strong></section><section class="card"><span>Class taps · 7 / 30 days</span><strong>${value("class_7d")} / ${value("class_30d")}</strong></section><section class="card"><span>Anonymous installations</span><strong>${value("installations")}</strong></section><section class="card wide"><h2>Map launch attempts</h2><p>Etown: ${value("concept3d_launches")} · Apple: ${value("apple_launches")} · Google: ${value("google_launches")}</p></section><section class="card wide"><h2>Location errors</h2><p>Denied: ${value("permission_denied")} · Timeouts: ${value("location_timeouts")} · Unavailable: ${value("location_unavailable")}</p></section></div></main></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    },
  });
}

export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/event") {
    const origin = request.headers.get("origin") ?? "";
    if (!allowedOrigins(env).has(origin))
      return jsonError(403, "Origin not allowed");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "POST")
      return jsonError(405, "Method not allowed", cors(origin));
    return eventResponse(request, env, origin);
  }
  if (url.pathname === "/dashboard") {
    if (!dashboardAuthorized(request, env)) {
      return new Response("Authentication required", {
        status: 401,
        headers: {
          "www-authenticate": 'Basic realm="Etown Assistant", charset="UTF-8"',
          "cache-control": "no-store",
        },
      });
    }
    return dashboardResponse(env);
  }
  return new Response("Not found", { status: 404 });
}

export default { fetch: handleRequest };
