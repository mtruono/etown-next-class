import { registerSW } from "virtual:pwa-register";

import { AppController } from "./app/appController";
import { demoSchedule } from "./data/demoSchedule";
import { decodeSetupCode } from "./import/setupCode";
import { takeSetupCodeFromFragment } from "./import/setupImport";
import { createConfigurationStore } from "./storage/configurationStore";
import { createPreferenceStore } from "./storage/preferenceStore";
import { TelemetryClient } from "./telemetry/telemetry";
import { renderRecovery } from "./ui/onboardingView";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root is missing");

let controller: AppController | null = null;

async function start(): Promise<void> {
  const configurationStore = createConfigurationStore(window.localStorage);
  const setupFragment = takeSetupCodeFromFragment(
    window.location,
    window.history,
  );
  let setupImported = false;

  if (setupFragment.hadFragment) {
    if (!setupFragment.code) {
      renderRecovery(
        root!,
        "That private setup link is incomplete. Reopen the full link you were sent.",
      );
      return;
    }
    try {
      configurationStore.save(await decodeSetupCode(setupFragment.code));
      setupImported = true;
    } catch {
      renderRecovery(
        root!,
        "That private setup link could not be verified. Ask for a fresh link and open it again.",
      );
      return;
    }
  }

  const demonstration =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("demo");
  const configuration =
    configurationStore.load() ?? (demonstration ? demoSchedule : null);
  if (!configuration) {
    renderRecovery(root!);
    return;
  }

  const preferences = createPreferenceStore(window.localStorage);
  const telemetry = new TelemetryClient({
    endpoint: import.meta.env.VITE_TELEMETRY_ENDPOINT,
    enabled: preferences.getTelemetryEnabled(),
  });
  if (setupImported) await telemetry.track("setup_imported");
  void telemetry.appOpenOnce();

  controller = new AppController(
    root!,
    undefined,
    configuration,
    undefined,
    telemetry,
    () => renderRecovery(root!),
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

void start();
