import type { DirectionSession } from "../app/appState";
import type { AppConfiguration, RouteProviderId } from "../domain/types";
import { actionButton, element, viewShell } from "./elements";

export interface DirectionsActions {
  back(): void;
  retry(): void;
  launchWith(provider: RouteProviderId): void;
  takeHome(): void;
}

function providerLabel(provider: RouteProviderId | null): string {
  if (provider === "concept3d") return "Etown Campus Map";
  if (provider === "apple") return "Apple Maps";
  if (provider === "google") return "Google Maps";
  return "map";
}

export function renderDirections(
  root: HTMLElement,
  _configuration: AppConfiguration,
  session: DirectionSession,
  online: boolean,
  actions: DirectionsActions,
): void {
  root.replaceChildren();
  const label =
    session.target.kind === "class"
      ? `${session.target.displayLabel}, Room ${session.target.room}`
      : session.target.displayLabel;
  const main = element("main", {
    className: "content-stack navigation-status",
  });

  if (!online) {
    main.append(
      element(
        "section",
        { className: "panel navigation-message" },
        element("p", { className: "assistant-kicker", text: "OFFLINE" }),
        element("h2", { text: "Live navigation needs internet" }),
        element("p", {
          text: "Your schedule is still available. Reconnect, then try the route again.",
        }),
        actionButton("Try again", actions.retry, {
          className: "button button-primary",
        }),
        actionButton("Back", actions.back, {
          className: "button button-quiet",
        }),
      ),
    );
  } else if (session.requesting) {
    main.append(
      element(
        "section",
        {
          className: "panel navigation-message location-loading",
          attributes: { role: "status", "aria-live": "polite" },
        },
        element("p", { className: "assistant-kicker", text: "ONE MOMENT" }),
        element("h2", { text: "Finding your location…" }),
        element("p", { text: `Choosing the best walking map for ${label}.` }),
        actionButton("Back", actions.back, {
          className: "button button-quiet",
        }),
      ),
    );
  } else if (session.failureMessage) {
    main.append(
      element(
        "section",
        { className: "panel navigation-message" },
        element("p", { className: "assistant-kicker", text: "ROUTE HELP" }),
        element("h2", { text: "We couldn’t open your route" }),
        element("p", { text: session.failureMessage }),
        actionButton("Try again", actions.retry, {
          className: "button button-primary",
        }),
        actionButton("Open Google Maps", () => actions.launchWith("google"), {
          className: "button button-secondary",
        }),
        actionButton(
          "Open destination in Etown Campus Map",
          () => actions.launchWith("concept3d"),
          { className: "button button-secondary" },
        ),
        actionButton("Back", actions.back, {
          className: "button button-quiet",
        }),
      ),
    );
  } else {
    main.append(
      element(
        "section",
        {
          className: "panel navigation-message",
          attributes: { role: "status", "aria-live": "polite" },
        },
        element("p", { className: "assistant-kicker", text: "ROUTE READY" }),
        element("h2", {
          text: `Opening ${providerLabel(session.chosenProvider)}…`,
        }),
        element("p", { text: label }),
        element(
          "details",
          { className: "map-options" },
          element("summary", { text: "Other map options" }),
          actionButton(
            "Etown Campus Map",
            () => actions.launchWith("concept3d"),
            { className: "button button-secondary" },
          ),
          actionButton("Apple Maps", () => actions.launchWith("apple"), {
            className: "button button-secondary",
          }),
          actionButton("Google Maps", () => actions.launchWith("google"), {
            className: "button button-secondary",
          }),
        ),
        actionButton("Back to assistant", actions.back, {
          className: "button button-quiet",
        }),
      ),
    );
  }

  if (session.target.kind === "class") {
    main.append(
      actionButton("TAKE ME HOME · Founders B", actions.takeHome, {
        className: "button button-home-inline",
      }),
    );
  }

  root.append(viewShell("Etown Campus Assistant", main));
}
