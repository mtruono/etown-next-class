import type { AppConfiguration } from "../domain/types";
import type {
  CampusProviderPreference,
  ExternalProviderPreference,
  NavigationPreferences,
} from "../navigation/providerSelection";
import { APP_VERSION } from "../telemetry/telemetry";
import { actionButton, element, viewShell } from "./elements";

export interface SettingsActions {
  back(): void;
  showAbout(): void;
  setCampusProvider(provider: CampusProviderPreference): void;
  setExternalProvider(provider: ExternalProviderPreference): void;
  setTelemetryEnabled(enabled: boolean): void;
  forgetAppData(): void;
}

function option(
  value: string,
  label: string,
  selected: boolean,
): HTMLOptionElement {
  return element("option", {
    text: label,
    attributes: { value, ...(selected ? { selected: "" } : {}) },
  });
}

export function renderSettings(
  root: HTMLElement,
  _configuration: AppConfiguration,
  preferences: NavigationPreferences,
  telemetryEnabled: boolean,
  actions: SettingsActions,
): void {
  root.replaceChildren();
  const campusSelect = element(
    "select",
    {
      id: "campus-provider",
      attributes: { "aria-describedby": "campus-help" },
    },
    option("concept3d", "Etown Campus Map", preferences.campus === "concept3d"),
    option(
      "external",
      "Use my external map",
      preferences.campus === "external",
    ),
  );
  campusSelect.addEventListener("change", () =>
    actions.setCampusProvider(campusSelect.value as CampusProviderPreference),
  );

  const externalSelect = element(
    "select",
    {
      id: "external-provider",
      attributes: { "aria-describedby": "external-help" },
    },
    option("auto", "Auto (Apple on iPhone)", preferences.external === "auto"),
    option("apple", "Apple Maps", preferences.external === "apple"),
    option("google", "Google Maps", preferences.external === "google"),
  );
  externalSelect.addEventListener("change", () =>
    actions.setExternalProvider(
      externalSelect.value as ExternalProviderPreference,
    ),
  );

  const telemetryToggle = element("input", {
    id: "telemetry-enabled",
    attributes: {
      type: "checkbox",
      ...(telemetryEnabled ? { checked: "" } : {}),
    },
  });
  telemetryToggle.addEventListener("change", () =>
    actions.setTelemetryEnabled(telemetryToggle.checked),
  );

  const main = element(
    "main",
    { className: "content-stack settings-stack" },
    element(
      "section",
      { className: "panel settings-hero" },
      element("p", { className: "status-pill", text: "Ready to use" }),
      element("h2", { text: "Maps and privacy" }),
      element("p", {
        className: "settings-lede",
        text: "Choose the maps you prefer. The assistant still decides on-campus versus off-campus after you tap navigation.",
      }),
    ),
    element(
      "section",
      { className: "panel settings-form" },
      element("label", {
        text: "Campus navigation",
        attributes: { for: "campus-provider" },
      }),
      campusSelect,
      element("p", {
        id: "campus-help",
        className: "help-text",
        text: "Etown Campus Map is the default when your location is confidently on campus.",
      }),
      element("label", {
        text: "Off-campus map",
        attributes: { for: "external-provider" },
      }),
      externalSelect,
      element("p", {
        id: "external-help",
        className: "help-text",
        text: "Auto uses Apple Maps on iPhone and Google Maps elsewhere.",
      }),
    ),
    element(
      "section",
      { className: "panel toggle-panel" },
      element(
        "div",
        {},
        element("label", {
          text: "Anonymous usage sharing",
          attributes: { for: "telemetry-enabled" },
        }),
        element("p", {
          className: "help-text",
          text: "Records anonymous opens and navigation-button use so the owner can tell whether the tool is useful. It never records your location, schedule, class, room, name, or route.",
        }),
      ),
      telemetryToggle,
    ),
    actionButton("About and privacy", actions.showAbout, {
      className: "button button-secondary",
    }),
    element(
      "details",
      { className: "reset-details" },
      element("summary", { text: "Reset this app" }),
      element("p", {
        className: "help-text",
        text: "This removes the saved schedule, map choices, anonymous installation ID, and app preferences from this device.",
      }),
      actionButton("Forget this schedule and app data", actions.forgetAppData, {
        className: "button button-danger",
      }),
    ),
    element("p", { className: "app-version", text: `Version ${APP_VERSION}` }),
    actionButton("Back to assistant", actions.back, {
      className: "button button-quiet",
    }),
  );
  root.append(viewShell("Settings", main));
}
