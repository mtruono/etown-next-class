import {
  DASHBOARD_SUMMARY_SQL,
  handleRequest,
  type D1Database,
  type D1PreparedStatement,
  type DashboardSummary,
  type Env,
  type LocationCheckInRow,
} from "../src/index";

class Statement implements D1PreparedStatement {
  values: unknown[] = [];
  constructor(
    readonly query: string,
    private readonly summary: DashboardSummary,
    private readonly checkIns: LocationCheckInRow[],
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
      (this.query === DASHBOARD_SUMMARY_SQL ? this.summary : null) as T | null,
    );
  }
  all<T>(): Promise<{ results: T[] }> {
    return Promise.resolve({ results: this.checkIns as T[] });
  }
}

function environment() {
  const statements: Statement[] = [];
  const summary = {
    last_app_open: null,
    last_home_tap: null,
    last_class_tap: null,
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
    installations: 1,
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
  const DB: D1Database = {
    prepare(query) {
      const statement = new Statement(query, summary, checkIns);
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
        app_version: "1.1.0",
        installation_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      }),
      env,
    );
    expect(response.status).toBe(204);
    const insert = statements.find(({ query }) => query.startsWith("INSERT"));
    expect(insert?.values[1]).toMatch(/^[0-9a-f]{64}$/u);
    expect(insert?.values).not.toContain(
      "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    );
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
    expect(html).toContain("Anonymous installations");
    expect(html).toContain("Phone 6BA7B8");
    expect(html).toContain("40.151200, -76.602300");
  });

  it("uses one bounded 90-day dashboard summary query", () => {
    expect(DASHBOARD_SUMMARY_SQL).toContain(
      "COUNT(DISTINCT installation_hash)",
    );
    expect(DASHBOARD_SUMMARY_SQL).toContain("-90 days");
  });
});
