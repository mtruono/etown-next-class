import { actionButton, element, viewShell } from "./elements";

export function renderAbout(root: HTMLElement, back: () => void): void {
  root.replaceChildren();
  const main = element(
    "main",
    { className: "content-stack" },
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Private on this device" }),
      element("p", {
        text: "The private setup link saves the schedule only in this browser, then removes the setup information from the address. There is no account, password, or student login.",
      }),
      element("p", {
        text: "Location is requested only after you tap a navigation button. It is held briefly in memory to choose a map and is never saved by this app or sent to anonymous usage tracking.",
      }),
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Real walking maps" }),
      element("p", {
        text: "When you appear to be on campus, the assistant normally hands the route to Etown’s official Concept3D map. Off campus, it opens Apple Maps or Google Maps with only the destination so that map can use your current location.",
      }),
      element("p", {
        text: "Map providers have their own privacy practices. The assistant uses same-tab handoff and a no-referrer policy where supported.",
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
        text: "If enabled, the app can record anonymous opens and navigation launch attempts. It never includes coordinates, schedule details, classes, rooms, a name, a route, or a referrer. You can switch it off in Settings.",
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
