import { element, viewShell } from "./elements";

export function renderRecovery(
  root: HTMLElement,
  problem: string | null = null,
): void {
  root.replaceChildren();
  const main = element(
    "main",
    { className: "content-stack recovery-stack" },
    element(
      "section",
      { className: "panel recovery-card" },
      element("p", { className: "assistant-kicker", text: "PRIVATE SETUP" }),
      element("h2", { text: "Open the private link you were sent" }),
      element("p", {
        text: "You only need to tap that link once on this phone. There is no login and nothing to type.",
      }),
      problem
        ? element("p", {
            className: "form-error",
            text: problem,
            attributes: { role: "alert" },
          })
        : null,
      element("p", {
        className: "help-text",
        text: "If the private link was opened on another device, send it to this phone and open it here.",
      }),
    ),
  );
  root.append(viewShell("Etown Campus Assistant", main));
}
