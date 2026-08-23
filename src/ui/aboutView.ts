import { actionButton, element, externalLink, viewShell } from "./elements";

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
    "The official campus map or selected map provider determines the displayed path.",
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
        text: "Your imported schedule is stored only in this browser on this device. The raw setup code is not retained after import.",
      }),
      element("p", {
        text: "Live GPS is requested only after a directions action. Captured live coordinates are held only in memory long enough to create route choices. They are not stored, logged, or sent to this app’s server.",
      }),
      element("p", {
        text: "When you tap an external route link, that map provider receives the selected start and destination coordinates. Setup-code checks detect corruption or changes; the code is not encrypted.",
      }),
    ),
    element(
      "section",
      { className: "panel warning-panel" },
      element("h2", { text: "Known location limits" }),
      list,
    ),
    element(
      "section",
      { className: "panel compact-links" },
      element("h2", { text: "Official references" }),
      externalLink(
        "Elizabethtown College campus map",
        "https://www.etown.edu/map/",
      ),
      externalLink(
        "Elizabethtown College academic calendar",
        "https://www.etown.edu/offices/registration-records/academic-calendar-2026-27.aspx",
      ),
    ),
    actionButton("Back", back, { className: "button button-quiet" }),
  );
  root.append(viewShell("About and privacy", main));
}
