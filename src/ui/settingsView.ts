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
      { className: "panel" },
      element("p", { className: "status-pill", text: "Ready to use" }),
      element("h2", { text: configuration.configurationLabel }),
      element("p", {
        text: `${courseCount} courses and ${meetings.length} class meetings are built into this public link. There is no login, setup code, or account.`,
      }),
      element("p", {
        className: "help-text",
        text: "Because this is the simple public version, anyone with the link can view the timetable. No student name, ID, email address, or other identity information is included.",
      }),
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Location" }),
      element("p", {
        text: "Location is never requested when the app opens. It is requested once only after you tap Campus guide.",
      }),
      element("p", {
        text: "The captured point is used in memory to draw the in-app orientation line. It is not saved, logged, or sent to Etown, Apple Maps, Google Maps, or this app’s server.",
      }),
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Using this like an app" }),
      element("p", {
        text: "The link works directly in Safari or Chrome. Adding it to the iPhone Home Screen is optional and does not change the schedule.",
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
