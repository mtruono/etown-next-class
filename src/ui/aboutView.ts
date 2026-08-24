import { actionButton, element, viewShell } from "./elements";

export function renderAbout(root: HTMLElement, back: () => void): void {
  root.replaceChildren();
  const uncertainties = [
    "Founders B uses an approximate B/C building-center point, not a verified B entrance.",
    "Nicarry uses an approximate building-center point.",
    "Steinman uses an approximate building-center point.",
    "Esbenshade is the least certain destination and may use a provisional Masters Center and Esbenshade-area proxy.",
    "Individual classroom locations are not available.",
    "Indoor GPS may be inaccurate.",
    "The app cannot verify construction closures or temporary path changes.",
    "The in-app line shows straight-line orientation, not a verified walking path.",
    "Confirm the room number through building signs.",
    "A wrong precise claim is worse than an honest approximation.",
  ];
  const list = element("ol", { className: "detail-list" });
  uncertainties.forEach((item) => list.append(element("li", { text: item })));

  const main = element(
    "main",
    { className: "content-stack" },
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Privacy" }),
      element("p", {
        text: "This simple version includes the timetable in the public app, so anyone with the link can view it. It includes no student name, ID, email address, or other identity information.",
      }),
      element("p", {
        text: "Live GPS is requested only after a Campus guide action. Captured coordinates are held only in memory while the guide is open. They are not stored, logged, or sent to this app’s server.",
      }),
      element("p", {
        text: "The app draws its own local schematic. It does not send the captured position to Etown, Apple Maps, Google Maps, analytics, or advertising services.",
      }),
    ),
    element(
      "section",
      { className: "panel info-card" },
      element("h2", { text: "A simple campus bearing" }),
      element("p", {
        text: "The offline campus view points toward approximate building centers. It is a quick orientation aid—not turn-by-turn navigation or an indoor map.",
      }),
    ),
    element(
      "details",
      { className: "limits-details" },
      element("summary", { text: "Known map limitations" }),
      list,
    ),
    actionButton("Back", back, { className: "button button-quiet" }),
  );
  root.append(viewShell("About and privacy", main));
}
