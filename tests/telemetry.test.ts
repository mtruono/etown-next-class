import {
  makeTelemetryPayload,
  TelemetryClient,
  TELEMETRY_EVENT_NAMES,
} from "../src/telemetry/telemetry";

describe("anonymous telemetry", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("uses an explicit event allowlist and a fixed payload shape", () => {
    expect(TELEMETRY_EVENT_NAMES).toContain("take_me_home_tapped");
    const payload = makeTelemetryPayload(
      "map_launch_attempted",
      "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      { target: "home", provider: "concept3d" },
    );
    expect(Object.keys(payload).sort()).toEqual([
      "app_version",
      "event",
      "installation_id",
      "provider",
      "target",
    ]);
    for (const forbidden of [
      "latitude",
      "longitude",
      "accuracy",
      "destinationId",
      "building",
      "course",
      "room",
      "name",
      "url",
      "referrer",
    ]) {
      expect(JSON.stringify(payload)).not.toContain(forbidden);
    }
  });

  it("is a safe no-op without an endpoint or when disabled", async () => {
    const send = vi.fn<typeof fetch>();
    const withoutEndpoint = new TelemetryClient({ fetch: send, enabled: true });
    await withoutEndpoint.track("app_open");
    const disabled = new TelemetryClient({
      endpoint: "https://example.workers.dev/event",
      fetch: send,
      enabled: false,
    });
    await disabled.track("take_me_home_tapped", { target: "home" });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends app_open once per browser session", async () => {
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new TelemetryClient({
      endpoint: "https://example.workers.dev/event",
      fetch: send,
      randomUUID: () => "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    });
    await client.appOpenOnce();
    await client.appOpenOnce();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("stops subsequent events after sharing is disabled", async () => {
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new TelemetryClient({
      endpoint: "https://example.workers.dev/event",
      fetch: send,
      randomUUID: () => "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    });
    await client.setEnabled(false);
    await client.track("app_open");
    expect(send).toHaveBeenCalledTimes(1);
    const body = send.mock.calls[0]?.[1]?.body;
    if (typeof body !== "string") throw new Error("Expected a JSON body");
    expect(body).toContain("telemetry_disabled");
  });
});
