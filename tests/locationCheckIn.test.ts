import {
  deviceCode,
  LocationCheckInClient,
  locationEndpointFromTelemetry,
} from "../src/location/locationCheckIn";

describe("consent-based location check-ins", () => {
  it("derives a separate endpoint and a short phone code", () => {
    expect(
      locationEndpointFromTelemetry("https://example.workers.dev/event"),
    ).toBe("https://example.workers.dev/check-in");
    expect(deviceCode("6ba7b810-9dad-41d1-80b4-00c04fd430c8")).toBe("6BA7B8");
  });

  it("sends only the exact check-in allowlist", async () => {
    const bodies: string[] = [];
    const send: typeof fetch = (_input, init) => {
      bodies.push(typeof init?.body === "string" ? init.body : "");
      return Promise.resolve(new Response(null, { status: 204 }));
    };
    const client = new LocationCheckInClient({
      endpoint: "https://example.workers.dev/check-in",
      fetch: send,
    });
    expect(
      await client.share(
        {
          deviceId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
          deviceCode: "6BA7B8",
        },
        { latitude: 40.1512, longitude: -76.6023, accuracyMeters: 18 },
      ),
    ).toBe("shared");
    const payload = JSON.parse(bodies[0] ?? "") as Record<string, unknown>;
    expect(payload).toEqual({
      consent_version: "location-checkin-v1",
      device_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      device_code: "6BA7B8",
      latitude: 40.1512,
      longitude: -76.6023,
      accuracy: 18,
    });
    expect(payload).not.toHaveProperty("target");
    expect(payload).not.toHaveProperty("course");
    expect(payload).not.toHaveProperty("room");
  });

  it("never blocks navigation when sharing fails", async () => {
    const send: typeof fetch = () => Promise.reject(new Error("offline"));
    const client = new LocationCheckInClient({
      endpoint: "https://example.workers.dev/check-in",
      fetch: send,
    });
    expect(
      await client.share(
        {
          deviceId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
          deviceCode: "6BA7B8",
        },
        { latitude: 40.1512, longitude: -76.6023, accuracyMeters: 18 },
      ),
    ).toBe("failed");
  });
});
