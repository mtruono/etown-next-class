export interface DashboardPreparedStatement {
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface DashboardDatabase {
  prepare(query: string): DashboardPreparedStatement;
}

export interface DashboardSummary {
  last_activity: string | null;
  events_7d: number;
  opens_7d: number;
  opens_30d: number;
  class_7d: number;
  class_30d: number;
  home_7d: number;
  home_30d: number;
  active_devices_7d: number;
  installations: number;
  concept3d_launches: number;
  apple_launches: number;
  google_launches: number;
  permission_denied: number;
  location_timeouts: number;
  location_unavailable: number;
  checkins_24h: number;
}

export interface DeviceSummaryRow {
  installation_hash: string;
  device_code: string;
  has_device_code: number;
  first_seen: string;
  last_seen: string;
  opens: number;
  active_days: number;
  class_taps: number;
  home_taps: number;
  map_launches: number;
  gps_denied: number;
  gps_timeouts: number;
  gps_unavailable: number;
  concept3d_launches: number;
  apple_launches: number;
  google_launches: number;
  app_version: string;
}

export interface RecentEventRow {
  device_code: string;
  has_device_code: number;
  created_at: string;
  event_name: string;
  target: string | null;
  provider: string | null;
  app_version: string;
}

export interface DailyActivityRow {
  day: string;
  opens: number;
  route_taps: number;
  map_launches: number;
}

export interface LocationCheckInRow {
  device_code: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  created_at: string;
}

export const DASHBOARD_SUMMARY_SQL = `
SELECT
  MAX(created_at) AS last_activity,
  SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS events_7d,
  SUM(CASE WHEN event_name = 'app_open' AND created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS opens_7d,
  SUM(CASE WHEN event_name = 'app_open' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS opens_30d,
  SUM(CASE WHEN event_name = 'take_me_to_class_tapped' AND created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS class_7d,
  SUM(CASE WHEN event_name = 'take_me_to_class_tapped' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS class_30d,
  SUM(CASE WHEN event_name = 'take_me_home_tapped' AND created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS home_7d,
  SUM(CASE WHEN event_name = 'take_me_home_tapped' AND created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS home_30d,
  COUNT(DISTINCT CASE WHEN created_at >= datetime('now', '-7 days') THEN installation_hash END) AS active_devices_7d,
  COUNT(DISTINCT installation_hash) AS installations,
  SUM(CASE WHEN event_name = 'map_launch_attempted' AND provider = 'concept3d' THEN 1 ELSE 0 END) AS concept3d_launches,
  SUM(CASE WHEN event_name = 'map_launch_attempted' AND provider = 'apple' THEN 1 ELSE 0 END) AS apple_launches,
  SUM(CASE WHEN event_name = 'map_launch_attempted' AND provider = 'google' THEN 1 ELSE 0 END) AS google_launches,
  SUM(CASE WHEN event_name = 'location_permission_denied' THEN 1 ELSE 0 END) AS permission_denied,
  SUM(CASE WHEN event_name = 'location_timeout' THEN 1 ELSE 0 END) AS location_timeouts,
  SUM(CASE WHEN event_name = 'location_unavailable' THEN 1 ELSE 0 END) AS location_unavailable,
  (SELECT COUNT(*) FROM location_checkins WHERE created_at > datetime('now', '-24 hours')) AS checkins_24h
FROM events
WHERE created_at >= datetime('now', '-90 days')`;

export const DEVICE_SUMMARY_SQL = `
SELECT
  installation_hash,
  COALESCE(MAX(device_code), UPPER(SUBSTR(installation_hash, 1, 6))) AS device_code,
  CASE WHEN MAX(device_code) IS NULL THEN 0 ELSE 1 END AS has_device_code,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen,
  SUM(event_name = 'app_open') AS opens,
  COUNT(DISTINCT DATE(created_at)) AS active_days,
  SUM(event_name = 'take_me_to_class_tapped') AS class_taps,
  SUM(event_name = 'take_me_home_tapped') AS home_taps,
  SUM(event_name = 'map_launch_attempted') AS map_launches,
  SUM(event_name = 'location_permission_denied') AS gps_denied,
  SUM(event_name = 'location_timeout') AS gps_timeouts,
  SUM(event_name = 'location_unavailable') AS gps_unavailable,
  SUM(event_name = 'map_launch_attempted' AND provider = 'concept3d') AS concept3d_launches,
  SUM(event_name = 'map_launch_attempted' AND provider = 'apple') AS apple_launches,
  SUM(event_name = 'map_launch_attempted' AND provider = 'google') AS google_launches,
  MAX(app_version) AS app_version
FROM events
WHERE created_at >= datetime('now', '-90 days')
GROUP BY installation_hash
ORDER BY last_seen DESC
LIMIT 50`;

export const RECENT_EVENTS_SQL = `
WITH device_codes AS (
  SELECT
    installation_hash,
    COALESCE(MAX(device_code), UPPER(SUBSTR(installation_hash, 1, 6))) AS device_code,
    CASE WHEN MAX(device_code) IS NULL THEN 0 ELSE 1 END AS has_device_code
  FROM events
  WHERE created_at >= datetime('now', '-90 days')
  GROUP BY installation_hash
)
SELECT
  device_codes.device_code,
  device_codes.has_device_code,
  events.created_at,
  events.event_name,
  events.target,
  events.provider,
  events.app_version
FROM events
JOIN device_codes USING (installation_hash)
WHERE events.created_at >= datetime('now', '-90 days')
ORDER BY events.created_at DESC
LIMIT 100`;

export const DAILY_ACTIVITY_SQL = `
SELECT
  DATE(created_at) AS day,
  SUM(event_name = 'app_open') AS opens,
  SUM(event_name IN ('take_me_to_class_tapped', 'take_me_home_tapped')) AS route_taps,
  SUM(event_name = 'map_launch_attempted') AS map_launches
FROM events
WHERE created_at >= datetime('now', '-13 days', 'start of day')
GROUP BY DATE(created_at)
ORDER BY day`;

export const LOCATION_CHECKINS_SQL = `
SELECT device_code, latitude, longitude, accuracy_meters, created_at
FROM location_checkins
WHERE created_at > datetime('now', '-24 hours')
ORDER BY created_at DESC
LIMIT 50`;

function escapeHtml(value: string | number | null): string {
  return String(value ?? "Never")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function numberValue(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function easternTime(value: string | null): string {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function shortDay(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function eventDescription(row: RecentEventRow): {
  label: string;
  detail: string;
  tone: string;
} {
  if (row.event_name === "app_open")
    return {
      label: "Opened the app",
      detail: `Version ${row.app_version}`,
      tone: "open",
    };
  if (row.event_name === "take_me_to_class_tapped")
    return {
      label: "Tapped Take me to class",
      detail: "Requested class directions",
      tone: "route",
    };
  if (row.event_name === "take_me_home_tapped")
    return {
      label: "Tapped Take me home",
      detail: "Requested home directions",
      tone: "home",
    };
  if (row.event_name === "map_launch_attempted") {
    const provider =
      row.provider === "concept3d"
        ? "Etown campus map"
        : row.provider === "apple"
          ? "Apple Maps"
          : row.provider === "google"
            ? "Google Maps"
            : "Map";
    return {
      label: `Opened ${provider}`,
      detail: row.target === "home" ? "Home route" : "Class route",
      tone: "map",
    };
  }
  if (row.event_name === "location_permission_denied")
    return {
      label: "GPS permission denied",
      detail: `The browser refused location for a ${row.target ?? "navigation"} request`,
      tone: "error",
    };
  if (row.event_name === "location_timeout")
    return {
      label: "GPS request timed out",
      detail: "The phone did not return a location in time",
      tone: "error",
    };
  if (row.event_name === "location_unavailable")
    return {
      label: "GPS unavailable",
      detail: "The phone could not provide a valid location",
      tone: "error",
    };
  return {
    label: "Anonymous usage sharing turned off",
    detail: `Version ${row.app_version}`,
    tone: "muted",
  };
}

function deviceName(code: string, matched: number): string {
  return matched
    ? `Phone ${escapeHtml(code)}`
    : `Unmatched ${escapeHtml(code)}`;
}

function renderTrend(rows: DailyActivityRow[]): string {
  if (!rows.length)
    return '<p class="empty">No activity during the last 14 days.</p>';
  const maximum = Math.max(
    1,
    ...rows.flatMap((row) => [row.opens, row.route_taps, row.map_launches]),
  );
  return `<div class="trend" role="img" aria-label="Daily app opens, route taps, and map launches during the last 14 days">${rows
    .map((row) => {
      const bar = (value: number, className: string, label: string) =>
        `<span class="bar ${className}" style="height:${Math.max(3, Math.round((value / maximum) * 100))}%" title="${escapeHtml(label)}: ${escapeHtml(value)}"></span>`;
      return `<div class="day"><div class="bars">${bar(row.opens, "opens", "App opens")}${bar(row.route_taps, "routes", "Route taps")}${bar(row.map_launches, "maps", "Map launches")}</div><span>${escapeHtml(shortDay(row.day))}</span></div>`;
    })
    .join(
      "",
    )}</div><div class="legend"><span><i class="opens"></i>App opens</span><span><i class="routes"></i>Route taps</span><span><i class="maps"></i>Map launches</span></div>`;
}

function renderDevices(rows: DeviceSummaryRow[]): string {
  if (!rows.length)
    return '<p class="empty">No phone activity recorded yet.</p>';
  return `<div class="devices">${rows
    .map((row) => {
      const matched = Boolean(row.has_device_code);
      const gpsProblems =
        numberValue(row.gps_denied) +
        numberValue(row.gps_timeouts) +
        numberValue(row.gps_unavailable);
      return `<article class="device-card"><header><div><p class="eyebrow">${matched ? "MATCHABLE PHONE" : "OLDER UNMATCHED INSTALLATION"}</p><h3>${deviceName(row.device_code, row.has_device_code)}</h3></div><span class="version">v${escapeHtml(row.app_version)}</span></header><p class="last-seen">Last activity <strong>${escapeHtml(easternTime(row.last_seen))}</strong></p><div class="mini-grid"><div><strong>${escapeHtml(row.opens)}</strong><span>opens</span></div><div><strong>${escapeHtml(row.class_taps)}</strong><span>class taps</span></div><div><strong>${escapeHtml(row.home_taps)}</strong><span>home taps</span></div><div><strong>${escapeHtml(row.map_launches)}</strong><span>map launches</span></div></div><details><summary>Full phone history</summary><dl><div><dt>First seen</dt><dd>${escapeHtml(easternTime(row.first_seen))}</dd></div><div><dt>Active days</dt><dd>${escapeHtml(row.active_days)}</dd></div><div><dt>Etown / Apple / Google</dt><dd>${escapeHtml(row.concept3d_launches)} / ${escapeHtml(row.apple_launches)} / ${escapeHtml(row.google_launches)}</dd></div><div><dt>GPS permission denied</dt><dd>${escapeHtml(row.gps_denied)}</dd></div><div><dt>GPS timeout / unavailable</dt><dd>${escapeHtml(row.gps_timeouts)} / ${escapeHtml(row.gps_unavailable)}</dd></div></dl>${gpsProblems ? '<p class="warning">This phone had GPS trouble. Directions may still have opened in a backup map.</p>' : ""}</details>${matched ? '<p class="match-help">Match this code to Settings → Location check-ins on the phone.</p>' : '<p class="match-help">Open the updated app on this phone once; its real six-character code will then label this entire history.</p>'}</article>`;
    })
    .join("")}</div>`;
}

function renderRecentEvents(rows: RecentEventRow[]): string {
  if (!rows.length) return '<p class="empty">No recent activity.</p>';
  return `<ol class="timeline">${rows
    .map((row) => {
      const description = eventDescription(row);
      return `<li><span class="event-dot ${description.tone}"></span><div><strong>${escapeHtml(description.label)}</strong><span>${escapeHtml(description.detail)}</span></div><div class="event-meta"><strong>${deviceName(row.device_code, row.has_device_code)}</strong><time datetime="${escapeHtml(row.created_at)}">${escapeHtml(easternTime(row.created_at))}</time></div></li>`;
    })
    .join("")}</ol>`;
}

function renderCheckIns(rows: LocationCheckInRow[]): string {
  if (!rows.length)
    return '<div class="empty location-empty"><strong>No location check-ins yet</strong><span>The phone user must turn on Location check-ins in Settings and then start class or home directions. Existing anonymous usage cannot be converted into past GPS history.</span></div>';
  return `<div class="checkins">${rows
    .map((row) => {
      const latitude = Number(row.latitude).toFixed(6);
      const longitude = Number(row.longitude).toFixed(6);
      const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
      return `<article class="checkin"><div><p class="eyebrow">PHONE ${escapeHtml(row.device_code)}</p><strong>${escapeHtml(easternTime(row.created_at))}</strong><p>${escapeHtml(latitude)}, ${escapeHtml(longitude)} · accuracy about ${escapeHtml(Math.round(row.accuracy_meters))} m</p></div><a href="${mapUrl}" rel="noreferrer" target="_blank">View point</a></article>`;
    })
    .join("")}</div>`;
}

export async function renderDashboard(db: DashboardDatabase): Promise<string> {
  await db
    .prepare(
      "DELETE FROM location_checkins WHERE created_at <= datetime('now', '-24 hours')",
    )
    .run();
  const [summary, devices, recent, daily, checkIns] = await Promise.all([
    db.prepare(DASHBOARD_SUMMARY_SQL).first<DashboardSummary>(),
    db.prepare(DEVICE_SUMMARY_SQL).all<DeviceSummaryRow>(),
    db.prepare(RECENT_EVENTS_SQL).all<RecentEventRow>(),
    db.prepare(DAILY_ACTIVITY_SQL).all<DailyActivityRow>(),
    db.prepare(LOCATION_CHECKINS_SQL).all<LocationCheckInRow>(),
  ]);
  const metric = (key: keyof DashboardSummary): number =>
    numberValue(summary?.[key] as number | null | undefined);
  const routeTaps7d = metric("class_7d") + metric("home_7d");
  const generatedAt = easternTime(new Date().toISOString());
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"><title>Etown App Analytics</title><style>
:root{color-scheme:light;--navy:#142343;--blue:#2366d1;--sky:#eaf2ff;--mint:#dff6e8;--green:#23724d;--amber:#fff1d8;--red:#a33b2d;--muted:#657087;--line:#dce2ed;--page:#f3f6fb;--card:#fff}*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--navy);font:15px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1080px;margin:auto;padding:28px 16px 60px}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(2rem,6vw,3.3rem);letter-spacing:-.055em;line-height:1}h2{font-size:1.25rem;margin-bottom:6px}h3{font-size:1.2rem;margin-bottom:0}.top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}.top p{color:var(--muted);max-width:670px}.refresh{display:inline-block;border-radius:999px;padding:10px 16px;background:var(--navy);color:white;text-decoration:none;font-weight:800;white-space:nowrap}.freshness{font-size:.78rem}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.metric,.panel,.device-card{background:var(--card);border:1px solid #e5e9f1;border-radius:18px;box-shadow:0 8px 24px #1423430b}.metric{padding:18px}.metric span{display:block;color:var(--muted);font-weight:700}.metric strong{display:block;margin:4px 0;font-size:2rem;line-height:1;color:var(--blue)}.metric small{color:var(--muted)}.panel{padding:20px;margin-top:14px}.panel-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}.panel-head p{margin:0;color:var(--muted);max-width:720px}.location-panel{border:2px solid var(--green)}.empty{padding:22px;border-radius:14px;background:#f7f9fc;color:var(--muted);text-align:center}.location-empty{display:grid;gap:5px;background:#f1fbf5;color:#32664c}.trend{display:flex;gap:8px;height:190px;align-items:flex-end;border-bottom:1px solid var(--line);padding:10px 2px 0}.day{display:flex;min-width:0;flex:1;height:100%;flex-direction:column;justify-content:flex-end;align-items:center}.bars{display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%;height:150px}.bar{display:block;width:min(8px,27%);min-height:3px;border-radius:4px 4px 0 0}.opens{background:#2366d1}.routes{background:#ef9b22}.maps{background:#36a06a}.day>span{height:28px;margin-top:5px;color:var(--muted);font-size:.66rem;white-space:nowrap}.legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;color:var(--muted);font-size:.8rem}.legend span{display:flex;gap:6px;align-items:center}.legend i{display:block;width:9px;height:9px;border-radius:2px}.devices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.device-card{padding:18px}.device-card header{display:flex;justify-content:space-between;gap:12px}.eyebrow{margin-bottom:3px;color:var(--blue);font-size:.68rem;font-weight:900;letter-spacing:.09em}.version{height:max-content;border-radius:999px;padding:4px 8px;background:var(--sky);color:var(--blue);font-size:.72rem;font-weight:800}.last-seen{margin:10px 0;color:var(--muted)}.last-seen strong{display:block;color:var(--navy)}.mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0}.mini-grid div{padding:9px 5px;border-radius:10px;background:#f5f7fb;text-align:center}.mini-grid strong,.mini-grid span{display:block}.mini-grid strong{font-size:1.1rem}.mini-grid span{color:var(--muted);font-size:.68rem}details{border-top:1px solid var(--line);padding-top:10px}summary{cursor:pointer;color:var(--blue);font-weight:800}dl{margin:12px 0}dl div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #edf0f5;padding:6px 0}dt{color:var(--muted)}dd{margin:0;text-align:right;font-weight:700}.warning{border-radius:10px;padding:9px;background:var(--amber);color:#744812;font-size:.8rem}.match-help{margin:12px 0 0;color:var(--muted);font-size:.76rem}.timeline{list-style:none;margin:0;padding:0}.timeline li{display:grid;grid-template-columns:12px minmax(180px,1fr) minmax(210px,auto);gap:10px;align-items:center;border-top:1px solid var(--line);padding:12px 0}.timeline li:first-child{border-top:0}.timeline span,.event-meta time{display:block;color:var(--muted);font-size:.78rem}.event-meta{text-align:right}.event-dot{width:10px;height:10px;border-radius:50%}.event-dot.open{background:#2366d1}.event-dot.route,.event-dot.home{background:#ef9b22}.event-dot.map{background:#36a06a}.event-dot.error{background:#ca5948}.event-dot.muted{background:#8992a5}.checkin{display:flex;justify-content:space-between;gap:16px;align-items:center;border-top:1px solid var(--line);padding:14px 0}.checkin:first-child{border-top:0}.checkin p{margin:3px 0;color:var(--muted)}.checkin a{border-radius:10px;padding:9px 12px;background:var(--green);color:white;text-decoration:none;font-weight:800}.mix{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mix-card{border-radius:14px;padding:16px;background:#f7f9fc}.mix-card p{margin:6px 0 0;color:var(--muted)}.caveat{margin-top:18px;border-left:4px solid var(--blue);padding:12px 15px;background:var(--sky);color:#33486e}.caveat strong{display:block}.footnote{margin-top:16px;color:var(--muted);font-size:.76rem}
@media(max-width:760px){.top{display:block}.refresh{margin-bottom:12px}.cards{grid-template-columns:repeat(2,1fr)}.devices,.mix{grid-template-columns:1fr}.timeline li{grid-template-columns:12px 1fr}.event-meta{grid-column:2;text-align:left}.trend{overflow-x:auto}.day{min-width:42px}}@media(max-width:420px){.cards{grid-template-columns:1fr}.metric strong{font-size:1.7rem}.mini-grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><main><header class="top"><div><p class="eyebrow">PRIVATE OWNER VIEW</p><h1>Etown App Analytics</h1><p>See each anonymous phone’s history, what happened, and whether an opted-in location check-in arrived. Times below are shown in Eastern time.</p><p class="freshness">Updated ${escapeHtml(generatedAt)} · source window: last 90 days</p></div><a class="refresh" href="/dashboard">Refresh data</a></header>
<section class="cards" aria-label="Key metrics"><article class="metric"><span>Active phones</span><strong>${escapeHtml(metric("active_devices_7d"))}</strong><small>last 7 days</small></article><article class="metric"><span>App opens</span><strong>${escapeHtml(metric("opens_7d"))}</strong><small>${escapeHtml(metric("opens_30d"))} in 30 days</small></article><article class="metric"><span>Direction taps</span><strong>${escapeHtml(routeTaps7d)}</strong><small>${escapeHtml(metric("class_7d"))} class · ${escapeHtml(metric("home_7d"))} home</small></article><article class="metric"><span>GPS check-ins</span><strong>${escapeHtml(metric("checkins_24h"))}</strong><small>last 24 hours</small></article></section>
<section class="panel location-panel"><div class="panel-head"><div><p class="eyebrow">EXACT LOCATION · OPT-IN ONLY</p><h2>Location check-ins</h2><p>One point appears only when the phone user enables sharing and starts directions. Each point is deleted at 24 hours.</p></div></div>${renderCheckIns(checkIns.results)}</section>
<section class="panel"><div class="panel-head"><div><p class="eyebrow">TREND</p><h2>Daily activity · last 14 days</h2><p>Opens show reach; route taps show intent; map launches show the handoff or in-app map was prepared.</p></div></div>${renderTrend(daily.results)}</section>
<section class="panel"><div class="panel-head"><div><p class="eyebrow">PHONE-BY-PHONE</p><h2>Device history</h2><p>Use the six-character code in the app’s Settings screen to recognize a phone. Test phones remain visible because the old data did not identify them as tests.</p></div></div>${renderDevices(devices.results)}</section>
<section class="panel"><div class="panel-head"><div><p class="eyebrow">WHAT HAPPENED</p><h2>Recent activity</h2><p>The latest 100 anonymous events, translated into plain English.</p></div></div>${renderRecentEvents(recent.results)}</section>
<section class="panel"><div class="panel-head"><div><p class="eyebrow">ROUTING AND GPS</p><h2>Map choices and location troubleshooting</h2></div></div><div class="mix"><article class="mix-card"><strong>Map launches · last 90 days</strong><p>Etown campus map: ${escapeHtml(metric("concept3d_launches"))}<br>Apple Maps: ${escapeHtml(metric("apple_launches"))}<br>Google Maps: ${escapeHtml(metric("google_launches"))}</p></article><article class="mix-card"><strong>GPS request problems · last 90 days</strong><p>GPS permission denied: ${escapeHtml(metric("permission_denied"))}<br>GPS timed out: ${escapeHtml(metric("location_timeouts"))}<br>GPS unavailable: ${escapeHtml(metric("location_unavailable"))}</p></article></div></section>
<aside class="caveat"><strong>What this can and cannot prove</strong>“Opened” and “tapped” are recorded actions. A map launch does not prove the person followed the route or arrived. Old anonymous installations cannot be called your daughter’s phone until that phone opens the updated app and you match its code. Existing usage cannot be turned into past GPS history.</aside><p class="footnote">Anonymous usage and exact-location check-ins remain separate data streams. No student name, course, room, destination, route, email, or phone number is stored with either stream.</p></main></body></html>`;
}
