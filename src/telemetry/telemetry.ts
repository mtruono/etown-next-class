import { APP_STORAGE_PREFIX } from "../storage/configurationStore";

export const APP_VERSION = "1.3.0";
export const INSTALLATION_ID_STORAGE_KEY = `${APP_STORAGE_PREFIX}telemetry.installation-id.v1`;
export const SESSION_OPEN_STORAGE_KEY = `${APP_STORAGE_PREFIX}telemetry.open-sent.v1`;

export const TELEMETRY_EVENT_NAMES = [
  "app_open",
  "take_me_to_class_tapped",
  "take_me_home_tapped",
  "map_launch_attempted",
  "location_permission_denied",
  "location_timeout",
  "location_unavailable",
  "telemetry_disabled",
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];
export type TelemetryTarget = "class" | "home";
export type TelemetryProvider = "concept3d" | "apple" | "google";

export interface TelemetryDimensions {
  target?: TelemetryTarget;
  provider?: TelemetryProvider;
}

export interface TelemetryPayload extends TelemetryDimensions {
  event: TelemetryEventName;
  app_version: string;
  installation_id: string;
  device_code: string;
}

export interface TelemetryIdentity {
  deviceId: string;
  deviceCode: string;
}

export interface TelemetryClientOptions {
  endpoint?: string;
  localStorage?: Storage;
  sessionStorage?: Storage;
  fetch?: typeof fetch;
  randomUUID?: () => string;
  enabled?: boolean;
}

const eventNames = new Set<string>(TELEMETRY_EVENT_NAMES);

export function makeTelemetryPayload(
  event: TelemetryEventName,
  installationId: string,
  dimensions: TelemetryDimensions = {},
): TelemetryPayload {
  if (!eventNames.has(event)) throw new Error("Unknown telemetry event");
  const payload: TelemetryPayload = {
    event,
    app_version: APP_VERSION,
    installation_id: installationId,
    device_code: telemetryDeviceCode(installationId),
  };
  if (dimensions.target) payload.target = dimensions.target;
  if (dimensions.provider) payload.provider = dimensions.provider;
  return payload;
}

export function telemetryDeviceCode(installationId: string): string {
  return installationId.replaceAll("-", "").slice(0, 6).toUpperCase();
}

export class TelemetryClient {
  private readonly endpoint: string;
  private readonly local: Storage;
  private readonly session: Storage;
  private readonly send: typeof fetch;
  private readonly randomUUID: () => string;
  private enabled: boolean;

  constructor(options: TelemetryClientOptions = {}) {
    this.endpoint = options.endpoint?.trim() ?? "";
    this.local = options.localStorage ?? window.localStorage;
    this.session = options.sessionStorage ?? window.sessionStorage;
    this.send = options.fetch ?? window.fetch.bind(window);
    this.randomUUID = options.randomUUID ?? (() => crypto.randomUUID());
    this.enabled = options.enabled ?? true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private installationId(): string {
    const existing = this.local.getItem(INSTALLATION_ID_STORAGE_KEY);
    if (existing && /^[0-9a-f-]{36}$/iu.test(existing)) return existing;
    const created = this.randomUUID();
    this.local.setItem(INSTALLATION_ID_STORAGE_KEY, created);
    return created;
  }

  identity(): TelemetryIdentity {
    const deviceId = this.installationId();
    return { deviceId, deviceCode: telemetryDeviceCode(deviceId) };
  }

  async track(
    event: TelemetryEventName,
    dimensions: TelemetryDimensions = {},
  ): Promise<void> {
    if (!this.enabled || !this.endpoint) return;
    const payload = makeTelemetryPayload(
      event,
      this.identity().deviceId,
      dimensions,
    );
    try {
      await this.send(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
    } catch {
      // Telemetry is deliberately best-effort and never blocks the assistant.
    }
  }

  async appOpenOnce(): Promise<void> {
    if (!this.enabled || this.session.getItem(SESSION_OPEN_STORAGE_KEY)) return;
    this.session.setItem(SESSION_OPEN_STORAGE_KEY, "1");
    await this.track("app_open");
  }

  async setEnabled(enabled: boolean): Promise<void> {
    const disabledEvent =
      !enabled && this.enabled
        ? this.track("telemetry_disabled")
        : Promise.resolve();
    this.enabled = enabled;
    await disabledEvent;
  }
}
