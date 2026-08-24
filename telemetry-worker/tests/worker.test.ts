import {
  DASHBOARD_SUMMARY_SQL,
  handleRequest,
  type D1Database,
  type D1PreparedStatement,
  type DashboardSummary,
  type Env,
} from "../src/index";

class Statement implements D1PreparedStatement {
  values: unknown[] = [];
  constructor(
    readonly query: string,
    private readonly summary: DashboardSummary,
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
  const DB: D1Database = {
    prepare(query) {
      const statement = new Statement(query, summary);
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
    expect(await allowed.text()).toContain("Anonymous installations");
  });

  it("uses one bounded 90-day dashboard summary query", () => {
    expect(DASHBOARD_SUMMARY_SQL).toContain(
      "COUNT(DISTINCT installation_hash)",
    );
    expect(DASHBOARD_SUMMARY_SQL).toContain("-90 days");
  });
});
