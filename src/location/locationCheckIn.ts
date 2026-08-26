import type { CapturedPosition } from "./geolocation";
import { LOCATION_CHECKIN_CONSENT_VERSION } from "../storage/preferenceStore";

export interface LocationCheckInClientOptions {
  endpoint?: string;
  fetch?: typeof fetch;
}

export interface LocationCheckInIdentity {
  deviceId: string;
  deviceCode: string;
}

export type LocationCheckInResult = "shared" | "failed";

export function locationEndpointFromTelemetry(endpoint?: string): string {
  const value = endpoint?.trim() ?? "";
  return value.endsWith("/event") ? `${value.slice(0, -6)}/check-in` : "";
}

export function deviceCode(deviceId: string): string {
  return deviceId.replaceAll("-", "").slice(0, 6).toUpperCase();
}

export class LocationCheckInClient {
  private readonly endpoint: string;
  private readonly send: typeof fetch;

  constructor(options: LocationCheckInClientOptions = {}) {
    this.endpoint = options.endpoint?.trim() ?? "";
    this.send = options.fetch ?? window.fetch.bind(window);
  }

  async share(
    identity: LocationCheckInIdentity,
    position: CapturedPosition,
  ): Promise<LocationCheckInResult> {
    if (!this.endpoint) return "failed";
    try {
      const response = await this.send(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consent_version: LOCATION_CHECKIN_CONSENT_VERSION,
          device_id: identity.deviceId,
          device_code: identity.deviceCode,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracyMeters,
        }),
        keepalive: true,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      return response.ok ? "shared" : "failed";
    } catch {
      return "failed";
    }
  }

  async deleteAll(identity: LocationCheckInIdentity): Promise<boolean> {
    if (!this.endpoint) return false;
    try {
      const response = await this.send(`${this.endpoint}/delete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consent_version: LOCATION_CHECKIN_CONSENT_VERSION,
          device_id: identity.deviceId,
        }),
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
