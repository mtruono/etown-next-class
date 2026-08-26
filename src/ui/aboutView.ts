import { actionButton, element, viewShell } from "./elements";

export function renderAbout(root: HTMLElement, back: () => void): void {
  root.replaceChildren();
  const main = element(
    "main",
    { className: "content-stack" },
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "What is public and what stays private" }),
      element("p", {
        text: "The Fall 2026 class schedule, times, buildings, rooms, calendar exceptions, and Founders B-area destination are built into this public website. There is no setup link, account, password, or student login.",
      }),
      element("p", {
        text: "The website does not include a student name, ID number, email address, phone number, or dorm room number.",
      }),
      element("p", {
        text: "Location is requested only after you tap a navigation button. Location check-ins are a separate option that starts off: if you explicitly enable it, one GPS point and its accuracy are shared with the app owner when directions start and deleted within 24 hours. There is no background tracking.",
      }),
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Location check-in controls" }),
      element("p", {
        text: "Settings always shows whether check-ins are on. You can pause new check-ins or delete all stored check-ins for this phone. A check-in does not include a class, room, destination, route, name, or contact information.",
      }),
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Real walking maps" }),
      element("p", {
        text: "When you appear to be on campus, Etown’s official Concept3D walking map opens inside the assistant with the route, surrounding campus buildings, and turn list. Apple Maps, Google Maps, and a full-screen Etown map remain available as backups.",
      }),
      element("p", {
        text: "The embedded campus map may use location only after you start navigation and interact with its location control. Map providers have their own privacy practices; the assistant uses a no-referrer policy where supported.",
      }),
    ),
    element(
      "section",
      { className: "panel warning-panel" },
      element("h2", { text: "Founders B is not physically verified yet" }),
      element("p", {
        text: "The current destination is labeled honestly as the Founders B area. A real phone walk is still required before calling any entrance or arrival point verified.",
      }),
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Anonymous usage" }),
      element("p", {
        text: "Anonymous usage counts are separate from location check-ins. They never include coordinates, accuracy, schedule details, classes, rooms, a name, a route, or a referrer. You can switch them off in Settings.",
      }),
    ),
    element("p", {
      className: "help-text unofficial-note",
      text: "Unofficial personal campus assistant. Always follow posted signs and campus safety guidance.",
    }),
    actionButton("Back to settings", back, {
      className: "button button-quiet",
    }),
  );
  root.append(viewShell("About and privacy", main));
}
