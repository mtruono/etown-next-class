import { expandSchedule } from "../domain/scheduleEngine";
import type { AppConfiguration } from "../domain/types";
import { actionButton, element, viewShell } from "./elements";

export interface SettingsActions {
  back(): void;
  showAbout(): void;
}

export function renderSettings(
  root: HTMLElement,
  configuration: AppConfiguration,
  actions: SettingsActions,
): void {
  root.replaceChildren();
  const meetings = expandSchedule(configuration);
  const courseCount = new Set(
    configuration.meetingPatterns.map(({ courseCode }) => courseCode),
  ).size;
  const main = element(
    "main",
    { className: "content-stack" },
    element(
      "section",
      { className: "panel settings-hero" },
      element("p", { className: "status-pill", text: "Ready to use" }),
      element("h2", { text: "Your fall schedule is ready" }),
      element("p", {
        className: "settings-lede",
        text: `${courseCount} courses · ${meetings.length} class meetings · ${configuration.configurationLabel}`,
      }),
      element("p", {
        className: "help-text",
        text: "No login, setup code, or account. Anyone with the link can view the timetable, but no student name, ID, email, or other identity information is included.",
      }),
    ),
    element(
      "section",
      { className: "panel info-card info-card-location" },
      element("h2", { text: "Location" }),
      element("p", {
        text: "Location stays off until Campus guide is tapped.",
      }),
      element("p", {
        className: "help-text",
        text: "That one-time point draws the orientation line. It is not saved, logged, or sent to Etown, Apple Maps, Google Maps, or this app’s server.",
      }),
    ),
    element(
      "section",
      { className: "panel info-card info-card-phone" },
      element("h2", { text: "Put it on the Home Screen" }),
      element("p", {
        text: "It works directly in Safari or Chrome. Adding it to the iPhone Home Screen makes it feel like a regular app.",
      }),
    ),
    actionButton("About, privacy, and map limits", actions.showAbout, {
      className: "button button-secondary",
    }),
    actionButton("Back to schedule", actions.back, {
      className: "button button-quiet",
    }),
  );
  root.append(viewShell("App details", main));
}
