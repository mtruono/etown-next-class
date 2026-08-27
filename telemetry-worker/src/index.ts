import { renderDashboard } from "./dashboard";

export {
  DAILY_ACTIVITY_SQL,
  DASHBOARD_SUMMARY_SQL,
  DEVICE_SUMMARY_SQL,
  LOCATION_CHECKINS_SQL,
  RECENT_EVENTS_SQL,
} from "./dashboard";
export type {
  DailyActivityRow,
  DashboardSummary,
  DeviceSummaryRow,
  LocationCheckInRow,
  RecentEventRow,
} from "./dashboard";

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
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
const LOCATION_CONSENT_VERSION = "location-checkin-v1";
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
  "device_code",
]);
const recentEvents = new Map<string, { windowStart: number; count: number }>();

interface EventPayload {
  event: string;
  target?: string;
  provider?: string;
  app_version: string;
  installation_id: string;
  device_code?: string;
}

interface CheckInPayload {
  consent_version: string;
  device_id: string;
  device_code: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface DeleteCheckInsPayload {
  consent_version: string;
  device_id: string;
}

const checkInKeys = new Set([
  "consent_version",
  "device_id",
  "device_code",
  "latitude",
  "longitude",
  "accuracy",
]);
const deleteCheckInKeys = new Set(["consent_version", "device_id"]);

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
    payload.device_code !== undefined &&
    (typeof payload.device_code !== "string" ||
      !/^[0-9A-F]{6}$/u.test(payload.device_code))
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

function validDeviceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  );
}

function validCheckInPayload(input: unknown): input is CheckInPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const payload = input as Record<string, unknown>;
  if (Object.keys(payload).some((key) => !checkInKeys.has(key))) return false;
  return (
    payload.consent_version === LOCATION_CONSENT_VERSION &&
    validDeviceId(payload.device_id) &&
    typeof payload.device_code === "string" &&
    /^[0-9A-F]{6}$/u.test(payload.device_code) &&
    typeof payload.latitude === "number" &&
    Number.isFinite(payload.latitude) &&
    payload.latitude >= -90 &&
    payload.latitude <= 90 &&
    typeof payload.longitude === "number" &&
    Number.isFinite(payload.longitude) &&
    payload.longitude >= -180 &&
    payload.longitude <= 180 &&
    typeof payload.accuracy === "number" &&
    Number.isFinite(payload.accuracy) &&
    payload.accuracy >= 0 &&
    payload.accuracy <= 5000
  );
}

function validDeletePayload(input: unknown): input is DeleteCheckInsPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const payload = input as Record<string, unknown>;
  if (Object.keys(payload).some((key) => !deleteCheckInKeys.has(key)))
    return false;
  return (
    payload.consent_version === LOCATION_CONSENT_VERSION &&
    validDeviceId(payload.device_id)
  );
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
      "INSERT INTO events (event_name, installation_hash, target, provider, app_version, device_code, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    ).bind(
      parsed.event,
      installationHash,
      parsed.target ?? null,
      parsed.provider ?? null,
      parsed.app_version,
      parsed.device_code ?? null,
      createdAt,
    ),
  ]);
  return new Response(null, { status: 204, headers: cors(origin) });
}

async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > BODY_LIMIT_BYTES) throw new ResponseError(413, "Body too large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > BODY_LIMIT_BYTES)
    throw new ResponseError(413, "Body too large");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ResponseError(400, "Invalid JSON");
  }
}

class ResponseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function locationCheckInResponse(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await readJson(request);
  } catch (error) {
    const responseError = error as ResponseError;
    return jsonError(responseError.status, responseError.message, cors(origin));
  }
  if (!validCheckInPayload(parsed))
    return jsonError(400, "Invalid location check-in", cors(origin));
  const installationHash = await sha256(
    `${env.INSTALLATION_SALT}:${parsed.device_id}`,
  );
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM location_checkins WHERE created_at <= datetime('now', '-24 hours')",
    ),
    env.DB.prepare(
      "INSERT INTO location_checkins (installation_hash, device_code, latitude, longitude, accuracy_meters, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    ).bind(
      installationHash,
      parsed.device_code,
      parsed.latitude,
      parsed.longitude,
      parsed.accuracy,
      new Date().toISOString(),
    ),
  ]);
  return new Response(null, { status: 204, headers: cors(origin) });
}

async function deleteCheckInsResponse(
  request: Request,
  env: Env,
  origin: string,
): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await readJson(request);
  } catch (error) {
    const responseError = error as ResponseError;
    return jsonError(responseError.status, responseError.message, cors(origin));
  }
  if (!validDeletePayload(parsed))
    return jsonError(400, "Invalid deletion request", cors(origin));
  const installationHash = await sha256(
    `${env.INSTALLATION_SALT}:${parsed.device_id}`,
  );
  await env.DB.prepare(
    "DELETE FROM location_checkins WHERE installation_hash = ?1",
  )
    .bind(installationHash)
    .run();
  return new Response(null, { status: 204, headers: cors(origin) });
}

async function dashboardResponse(env: Env): Promise<Response> {
  const html = await renderDashboard(env.DB);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none';",
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
  if (url.pathname === "/check-in" || url.pathname === "/check-in/delete") {
    const origin = request.headers.get("origin") ?? "";
    if (!allowedOrigins(env).has(origin))
      return jsonError(403, "Origin not allowed");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "POST")
      return jsonError(405, "Method not allowed", cors(origin));
    return url.pathname === "/check-in"
      ? locationCheckInResponse(request, env, origin)
      : deleteCheckInsResponse(request, env, origin);
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

export async function deleteExpiredCheckIns(env: Env): Promise<void> {
  await env.DB.prepare(
    "DELETE FROM location_checkins WHERE created_at <= datetime('now', '-24 hours')",
  ).run();
}

export default {
  fetch: handleRequest,
  scheduled(_controller: unknown, env: Env): Promise<void> {
    return deleteExpiredCheckIns(env);
  },
};
