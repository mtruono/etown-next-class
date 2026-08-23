import type { AppConfiguration, RouteProviderId } from "../domain/types";
import { actionButton, element, viewShell } from "./elements";

export interface SettingsActions {
  back(): void;
  setProvider(provider: RouteProviderId): void;
  exportCode(): Promise<void>;
  replaceSchedule(): void;
  eraseSchedule(): void;
  showAbout(): void;
}

export function renderSettings(
  root: HTMLElement,
  configuration: AppConfiguration,
  provider: RouteProviderId,
  exportedSetupCode: string | null,
  actions: SettingsActions,
): void {
  root.replaceChildren();
  const fieldset = element(
    "fieldset",
    { className: "provider-options" },
    element("legend", { text: "Preferred walking-map provider" }),
  );
  const providers: Array<[RouteProviderId, string, string]> = [
    [
      "concept3d",
      "Etown Campus Map",
      "Best first choice for internal campus paths.",
    ],
    ["apple", "Apple Maps", "Uses Apple’s walking directions."],
    ["google", "Google Maps", "Cross-platform walking directions."],
  ];
  for (const [id, label, description] of providers) {
    const input = element("input", {
      id: `provider-${id}`,
      attributes: { type: "radio", name: "route-provider", value: id },
    });
    input.checked = provider === id;
    input.addEventListener("change", () => actions.setProvider(id));
    fieldset.append(
      element(
        "div",
        { className: "radio-row" },
        input,
        element(
          "label",
          { attributes: { for: input.id } },
          element("strong", { text: label }),
          element("span", { text: description }),
        ),
      ),
    );
  }

  const main = element(
    "main",
    { className: "content-stack" },
    element("section", { className: "panel" }, fieldset),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Schedule on this device" }),
      element("p", { text: configuration.configurationLabel }),
      actionButton("Export setup code", actions.exportCode, {
        className: "button button-secondary",
      }),
      exportedSetupCode
        ? element(
            "div",
            { className: "form-stack" },
            element("label", {
              attributes: { for: "exported-code" },
              text: "Exported setup code",
            }),
            element("textarea", {
              id: "exported-code",
              text: exportedSetupCode,
              attributes: { readonly: "", rows: "6", spellcheck: "false" },
            }),
            element("p", {
              className: "help-text",
              text: "This code contains the schedule and is checksum-protected, not encrypted. Keep it private.",
            }),
          )
        : null,
      actionButton("Import or replace schedule", actions.replaceSchedule, {
        className: "button button-secondary",
      }),
      actionButton("Erase schedule from this device", actions.eraseSchedule, {
        className: "button button-danger",
      }),
    ),
    actionButton("About, privacy, and limitations", actions.showAbout, {
      className: "button button-quiet",
    }),
    actionButton("Back to schedule", actions.back, {
      className: "button button-quiet",
    }),
  );
  root.append(viewShell("Settings", main));
}
