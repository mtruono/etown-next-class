import { registerSW } from "virtual:pwa-register";

import { AppController } from "./app/appController";
import { demoSchedule } from "./data/demoSchedule";
import { publicSchedule } from "./data/publicSchedule";
import {
  LocationCheckInClient,
  locationEndpointFromTelemetry,
} from "./location/locationCheckIn";
import { createConfigurationStore } from "./storage/configurationStore";
import { createPreferenceStore } from "./storage/preferenceStore";
import { TelemetryClient } from "./telemetry/telemetry";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root is missing");

function start(): void {
  const configurationStore = createConfigurationStore(window.localStorage);
  const demonstration = new URLSearchParams(window.location.search).has("demo");
  if (window.location.hash.startsWith("#setup=")) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
  const configuration = demonstration
    ? (configurationStore.load() ?? demoSchedule)
    : publicSchedule;

  const preferences = createPreferenceStore(window.localStorage);
  const telemetry = new TelemetryClient({
    endpoint: import.meta.env.VITE_TELEMETRY_ENDPOINT,
    enabled: preferences.getTelemetryEnabled(),
  });
  const locationCheckIns = new LocationCheckInClient({
    endpoint:
      import.meta.env.VITE_LOCATION_CHECKIN_ENDPOINT ??
      locationEndpointFromTelemetry(import.meta.env.VITE_TELEMETRY_ENDPOINT),
  });
  void telemetry.appOpenOnce();

  const controller = new AppController(
    root!,
    undefined,
    configuration,
    undefined,
    telemetry,
    locationCheckIns,
    () => window.location.reload(),
  );
  controller.start();
}

if (!new URLSearchParams(window.location.search).has("no-sw")) {
  registerSW({ immediate: true });
}

start();
