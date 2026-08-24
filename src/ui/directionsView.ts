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
  const label = session.target.displayLabel;
  const roomReminder =
    session.target.kind === "class"
      ? `Classroom reminder: Room ${session.target.room}. Indoor directions are not included.`
      : null;
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
    const embeddedCampusMap =
      session.chosenProvider === "concept3d" && session.launchUrl
        ? element("iframe", {
            className: "embedded-campus-map",
            attributes: {
              src: session.launchUrl,
              title: `Etown walking directions to ${label}`,
              allow: "geolocation; fullscreen",
              loading: "eager",
              referrerpolicy: "no-referrer",
              allowfullscreen: "",
            },
          })
        : null;
    main.append(
      element(
        "section",
        {
          className: embeddedCampusMap
            ? "panel navigation-message in-app-route"
            : "panel navigation-message",
          attributes: { role: "status", "aria-live": "polite" },
        },
        element("p", {
          className: "assistant-kicker",
          text: embeddedCampusMap ? "IN-APP CAMPUS ROUTE" : "ROUTE READY",
        }),
        element("h2", {
          text: embeddedCampusMap
            ? `Walking to ${label}`
            : `Opening ${providerLabel(session.chosenProvider)}…`,
        }),
        embeddedCampusMap,
        roomReminder
          ? element("p", {
              className: "route-room-reminder",
              text: roomReminder,
            })
          : null,
        embeddedCampusMap
          ? element("p", {
              className: "map-purpose",
              text: "The official Etown map stays inside the assistant with the walking path, surrounding buildings, and turn list. Use its location arrow for the live blue dot.",
            })
          : element("p", { text: label }),
        element(
          "details",
          { className: "map-options" },
          element("summary", { text: "Backup map options" }),
          actionButton(
            "Open Etown map full screen",
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
        embeddedCampusMap
          ? element("p", {
              className: "route-verification-note",
              text: "Outdoor campus guidance is provisional until these walks are checked in person. Follow posted signs and use a backup map if the path does not look right.",
            })
          : null,
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
