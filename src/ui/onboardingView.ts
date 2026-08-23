import type { AppConfiguration } from "../domain/types";
import { buildImportPreview } from "../import/setupImportPreview";
import { actionButton, element, viewShell } from "./elements";

export interface OnboardingActions {
  importCode(code: string): Promise<void>;
  confirmImport(): void;
  cancelPreview(): void;
  showPrivacy(): void;
  backToSchedule(): void;
}

function previewView(
  configuration: AppConfiguration,
  replacing: boolean,
  actions: OnboardingActions,
): HTMLElement {
  const preview = buildImportPreview(configuration);
  const patternList = element("ul", { className: "detail-list" });
  for (const pattern of preview.patterns) {
    patternList.append(
      element(
        "li",
        {},
        element("strong", { text: `${pattern.courseCode}: ${pattern.title}` }),
        element("span", {
          text: `${pattern.days}, ${pattern.times}. ${pattern.building}, Room ${pattern.room}.`,
        }),
      ),
    );
  }
  const exceptionList = element("ul", { className: "detail-list" });
  preview.exceptions.forEach((item) =>
    exceptionList.append(element("li", { text: item })),
  );
  const warningList = element("ul", { className: "warning-list" });
  preview.coordinateWarnings.forEach((item) =>
    warningList.append(element("li", { text: item })),
  );

  return element(
    "main",
    { className: "content-stack" },
    element(
      "section",
      {
        className: "panel",
        attributes: { "aria-labelledby": "preview-heading" },
      },
      element("p", { className: "status-pill", text: "Ready to review" }),
      element("h2", { id: "preview-heading", text: "Confirm schedule import" }),
      element(
        "dl",
        { className: "summary-grid" },
        element(
          "div",
          {},
          element("dt", { text: "Term" }),
          element("dd", { text: preview.termLabel }),
        ),
        element(
          "div",
          {},
          element("dt", { text: "Courses" }),
          element("dd", { text: String(preview.courseCount) }),
        ),
        element(
          "div",
          {},
          element("dt", { text: "Meetings" }),
          element("dd", { text: String(preview.meetingCount) }),
        ),
        element(
          "div",
          {},
          element("dt", { text: "Regular dates" }),
          element("dd", {
            text: `${preview.firstRegularDate} through ${preview.lastRegularDate}`,
          }),
        ),
      ),
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Courses" }),
      patternList,
    ),
    element(
      "section",
      { className: "panel" },
      element("h2", { text: "Calendar exceptions" }),
      exceptionList,
    ),
    element(
      "section",
      { className: "panel warning-panel" },
      element("h2", { text: "Destination warnings" }),
      warningList,
    ),
    element(
      "div",
      { className: "button-stack" },
      actionButton(
        replacing
          ? "Replace existing schedule"
          : "Save schedule on this device",
        actions.confirmImport,
        { className: "button button-primary" },
      ),
      actionButton("Cancel", actions.cancelPreview, {
        className: "button button-quiet",
      }),
    ),
  );
}

export function renderOnboarding(
  root: HTMLElement,
  options: {
    pendingConfiguration: AppConfiguration | null;
    existingConfiguration: AppConfiguration | null;
    error: string | null;
    notice: string | null;
    actions: OnboardingActions;
  },
): void {
  root.replaceChildren();
  if (options.pendingConfiguration) {
    root.append(
      viewShell(
        "Etown Next Class",
        previewView(
          options.pendingConfiguration,
          options.existingConfiguration !== null,
          options.actions,
        ),
      ),
    );
    return;
  }

  const textarea = element("textarea", {
    id: "setup-code",
    attributes: {
      rows: "7",
      autocapitalize: "off",
      autocomplete: "off",
      spellcheck: "false",
      "aria-describedby": "setup-help setup-error",
    },
  });
  const error = element("p", {
    id: "setup-error",
    className: "form-error",
    text: options.error ?? "",
    attributes: { role: "alert" },
  });
  const form = element(
    "form",
    { className: "panel form-stack" },
    element("label", {
      attributes: { for: "setup-code" },
      text: "Private setup code",
    }),
    textarea,
    element("p", {
      id: "setup-help",
      className: "help-text",
      text: "Paste the complete code beginning with ETOWN1. It is checked and previewed before anything is saved.",
    }),
    error,
    actionButton(
      "Review setup code",
      () => options.actions.importCode(textarea.value),
      {
        className: "button button-primary",
        type: "submit",
      },
    ),
  );
  form.addEventListener("submit", (event) => event.preventDefault());

  const main = element(
    "main",
    { className: "content-stack" },
    options.notice
      ? element("p", {
          className: "notice",
          text: options.notice,
          attributes: { role: "status" },
        })
      : null,
    element(
      "section",
      { className: "hero" },
      element("h2", {
        text: "Know where your next class is, then open a walking map.",
      }),
      element("p", {
        text: "Etown Next Class keeps your imported class schedule on this device. It asks for your location only when you request directions. Your selected map provider receives the start and destination needed to show the route.",
      }),
    ),
    form,
    actionButton("Read privacy details", options.actions.showPrivacy, {
      className: "button button-quiet",
    }),
    options.existingConfiguration
      ? actionButton(
          "Back to current schedule",
          options.actions.backToSchedule,
          {
            className: "button button-secondary",
          },
        )
      : null,
  );
  root.append(
    viewShell("Etown Next Class", main, {
      subtitle: "Private schedule, building-level directions",
    }),
  );
}
