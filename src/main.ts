import { registerSW } from "virtual:pwa-register";

import { AppController } from "./app/appController";
import { demoSchedule } from "./data/demoSchedule";
import { publicSchedule } from "./data/publicSchedule";
import { createConfigurationStore } from "./storage/configurationStore";
import { createPreferenceStore } from "./storage/preferenceStore";
import { TelemetryClient } from "./telemetry/telemetry";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root is missing");

let controller: AppController | null = null;

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
  void telemetry.appOpenOnce();

  controller = new AppController(
    root!,
    undefined,
    configuration,
    undefined,
    telemetry,
    () => window.location.reload(),
  );
  controller.start();
}

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    controller?.setUpdateAvailable(async () => {
      await updateServiceWorker?.(true);
    });
  },
});

start();
