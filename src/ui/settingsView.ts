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
  enableLocationCheckIns(): void;
  pauseLocationCheckIns(): void;
  deleteLocationCheckIns(): void;
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
  locationCheckInsEnabled: boolean,
  locationDeviceCode: string | null,
  actions: SettingsActions,
): void {
  root.replaceChildren();
  const campusSelect = element(
    "select",
    {
      id: "campus-provider",
      attributes: { "aria-describedby": "campus-help" },
    },
    option(
      "concept3d",
      "In-app Etown Campus Map",
      preferences.campus === "concept3d",
    ),
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
        text: "The in-app Etown map is the default on campus. It keeps the route, surrounding buildings, and turn list inside the assistant.",
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
      {
        className: `panel location-consent${locationCheckInsEnabled ? " is-enabled" : ""}`,
      },
      element("p", {
        className: `status-pill${locationCheckInsEnabled ? " sharing" : ""}`,
        text: locationCheckInsEnabled
          ? "LOCATION SHARING ON"
          : "LOCATION SHARING OFF",
      }),
      element("h2", { text: "Location check-ins" }),
      element("p", {
        text: locationCheckInsEnabled
          ? "One GPS point is shared with the app owner when you start class or home directions. There is no background tracking. Each point is deleted within 24 hours."
          : "Off by default. If you choose to turn it on, one GPS point is shared with the app owner only when you start class or home directions.",
      }),
      locationCheckInsEnabled && locationDeviceCode
        ? element("p", {
            className: "device-code",
            text: `This phone: ${locationDeviceCode}`,
          })
        : null,
      locationCheckInsEnabled
        ? actionButton(
            "Pause location check-ins",
            actions.pauseLocationCheckIns,
            {
              className: "button button-secondary",
            },
          )
        : actionButton(
            "Turn on location check-ins",
            actions.enableLocationCheckIns,
            {
              className: "button button-primary",
            },
          ),
      locationCheckInsEnabled
        ? actionButton(
            "Delete stored check-ins",
            actions.deleteLocationCheckIns,
            {
              className: "button button-danger",
            },
          )
        : null,
      element("p", {
        className: "help-text",
        text: "No class, room, destination, route, name, or contact information is attached to a location check-in.",
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
        text: "This first deletes stored location check-ins, then removes map choices, random IDs, and app preferences from this device. The public Fall 2026 schedule stays available.",
      }),
      actionButton("Reset app preferences", actions.forgetAppData, {
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
