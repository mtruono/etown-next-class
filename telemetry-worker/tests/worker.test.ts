import {
  DAILY_ACTIVITY_SQL,
  DASHBOARD_SUMMARY_SQL,
  DEVICE_SUMMARY_SQL,
  LOCATION_CHECKINS_SQL,
  RECENT_EVENTS_SQL,
  handleRequest,
  type DailyActivityRow,
  type D1Database,
  type D1PreparedStatement,
  type DashboardSummary,
  type DeviceSummaryRow,
  type Env,
  type LocationCheckInRow,
  type RecentEventRow,
} from "../src/index";

interface DashboardData {
  summary: DashboardSummary;
  devices: DeviceSummaryRow[];
  recent: RecentEventRow[];
  daily: DailyActivityRow[];
  checkIns: LocationCheckInRow[];
}

class Statement implements D1PreparedStatement {
  values: unknown[] = [];
  constructor(
    readonly query: string,
    private readonly data: DashboardData,
  ) {}
  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }
  run(): Promise<unknown> {
    return Promise.resolve({});
  }
  first<T>(): Promise<T | null> {
    return Promise.resolve(
      (this.query === DASHBOARD_SUMMARY_SQL
        ? this.data.summary
        : null) as T | null,
    );
  }
  all<T>(): Promise<{ results: T[] }> {
    const results =
      this.query === DEVICE_SUMMARY_SQL
        ? this.data.devices
        : this.query === RECENT_EVENTS_SQL
          ? this.data.recent
          : this.query === DAILY_ACTIVITY_SQL
            ? this.data.daily
            : this.query === LOCATION_CHECKINS_SQL
              ? this.data.checkIns
              : [];
    return Promise.resolve({ results: results as T[] });
  }
}

function environment() {
  const statements: Statement[] = [];
  const summary = {
    last_activity: "2026-08-26T20:00:00.000Z",
    events_7d: 8,
    opens_7d: 2,
    opens_30d: 4,
    home_7d: 1,
    home_30d: 2,
    class_7d: 1,
    class_30d: 3,
    concept3d_launches: 2,
    apple_launches: 1,
    google_launches: 1,
    permission_denied: 0,
    location_timeouts: 0,
    location_unavailable: 0,
    active_devices_7d: 1,
    installations: 1,
    checkins_24h: 1,
  } satisfies DashboardSummary;
  const checkIns: LocationCheckInRow[] = [
    {
      device_code: "6BA7B8",
      latitude: 40.1512,
      longitude: -76.6023,
      accuracy_meters: 18,
      created_at: "2026-08-26T20:00:00.000Z",
    },
  ];
  const devices: DeviceSummaryRow[] = [
    {
      installation_hash: "abc123",
      device_code: "6BA7B8",
      has_device_code: 1,
      first_seen: "2026-08-24T14:00:00.000Z",
      last_seen: "2026-08-26T20:00:00.000Z",
      opens: 4,
      active_days: 2,
      class_taps: 3,
      home_taps: 2,
      map_launches: 4,
      gps_denied: 1,
      gps_timeouts: 0,
      gps_unavailable: 0,
      concept3d_launches: 2,
      apple_launches: 1,
      google_launches: 1,
      app_version: "1.3.0",
    },
  ];
  const recent: RecentEventRow[] = [
    {
      device_code: "6BA7B8",
      has_device_code: 1,
      created_at: "2026-08-26T20:00:00.000Z",
      event_name: "location_permission_denied",
      target: "class",
      provider: null,
      app_version: "1.3.0",
    },
  ];
  const daily: DailyActivityRow[] = [
    { day: "2026-08-26", opens: 2, route_taps: 3, map_launches: 2 },
  ];
  const data = { summary, devices, recent, daily, checkIns };
  const DB: D1Database = {
    prepare(query) {
      const statement = new Statement(query, data);
      statements.push(statement);
      return statement;
    },
    batch() {
      return Promise.resolve([]);
    },
  };
  const env: Env = {
    DB,
    INSTALLATION_SALT: "test-salt",
    DASHBOARD_USERNAME: "owner",
    DASHBOARD_PASSWORD: "secret",
  };
  return { env, statements };
}

function eventRequest(body: unknown, origin = "https://mtruono.github.io") {
  return new Request("https://example.workers.dev/event", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function checkInRequest(
  body: unknown,
  path = "/check-in",
  origin = "https://mtruono.github.io",
) {
  return new Request(`https://example.workers.dev${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("telemetry worker", () => {
  it("accepts only the strict event schema and stores a hash", async () => {
    const { env, statements } = environment();
    const response = await handleRequest(
      eventRequest({
        event: "map_launch_attempted",
        target: "home",
        provider: "concept3d",
        app_version: "1.3.0",
        installation_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
        device_code: "6BA7B8",
      }),
      env,
    );
    expect(response.status).toBe(204);
    const insert = statements.find(({ query }) => query.startsWith("INSERT"));
    expect(insert?.values[1]).toMatch(/^[0-9a-f]{64}$/u);
    expect(insert?.values).not.toContain(
      "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    );
    expect(insert?.values[5]).toBe("6BA7B8");
  });

  it("rejects unknown properties and non-production origins", async () => {
    const { env } = environment();
    const base = {
      event: "app_open",
      app_version: "1.1.0",
      installation_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    };
    expect(
      (await handleRequest(eventRequest({ ...base, latitude: 40 }), env))
        .status,
    ).toBe(400);
    expect(
      (
        await handleRequest(
          eventRequest({ ...base, device_code: "not-a-code" }),
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleRequest(eventRequest(base, "https://attacker.example"), env))
        .status,
    ).toBe(403);
  });

  it("stores an expressly consented location check-in under a hash", async () => {
    const { env, statements } = environment();
    const response = await handleRequest(
      checkInRequest({
        consent_version: "location-checkin-v1",
        device_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
        device_code: "6BA7B8",
        latitude: 40.1512,
        longitude: -76.6023,
        accuracy: 18,
      }),
      env,
    );
    expect(response.status).toBe(204);
    const insert = statements.find(({ query }) =>
      query.startsWith("INSERT INTO location_checkins"),
    );
    expect(insert?.values[0]).toMatch(/^[0-9a-f]{64}$/u);
    expect(insert?.values).not.toContain(
      "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    );
    expect(insert?.values.slice(1, 5)).toEqual([
      "6BA7B8",
      40.1512,
      -76.6023,
      18,
    ]);
  });

  it("rejects check-ins without current consent or with extra data", async () => {
    const { env } = environment();
    const base = {
      consent_version: "location-checkin-v1",
      device_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      device_code: "6BA7B8",
      latitude: 40.1512,
      longitude: -76.6023,
      accuracy: 18,
    };
    expect(
      (
        await handleRequest(
          checkInRequest({ ...base, consent_version: "old" }),
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleRequest(checkInRequest({ ...base, course: "ART105A" }), env))
        .status,
    ).toBe(400);
    expect(
      (await handleRequest(checkInRequest({ ...base, latitude: 100 }), env))
        .status,
    ).toBe(400);
  });

  it("deletes every stored check-in for the requesting phone hash", async () => {
    const { env, statements } = environment();
    const response = await handleRequest(
      checkInRequest(
        {
          consent_version: "location-checkin-v1",
          device_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
        },
        "/check-in/delete",
      ),
      env,
    );
    expect(response.status).toBe(204);
    const deletion = statements.find(({ query }) =>
      query.includes("WHERE installation_hash = ?1"),
    );
    expect(deletion?.values[0]).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("protects and renders the dashboard summary", async () => {
    const { env } = environment();
    const denied = await handleRequest(
      new Request("https://example.workers.dev/dashboard"),
      env,
    );
    expect(denied.status).toBe(401);
    const allowed = await handleRequest(
      new Request("https://example.workers.dev/dashboard", {
        headers: { authorization: `Basic ${btoa("owner:secret")}` },
      }),
      env,
    );
    expect(allowed.status).toBe(200);
    const html = await allowed.text();
    expect(html).toContain("Etown App Analytics");
    expect(html).toContain("Phone 6BA7B8");
    expect(html).toContain("GPS permission denied");
    expect(html).toContain("The browser refused location");
    expect(html).toContain("40.151200, -76.602300");
  });

  it("uses one bounded 90-day dashboard summary query", () => {
    expect(DASHBOARD_SUMMARY_SQL).toContain(
      "COUNT(DISTINCT installation_hash)",
    );
    expect(DASHBOARD_SUMMARY_SQL).toContain("-90 days");
  });
});
