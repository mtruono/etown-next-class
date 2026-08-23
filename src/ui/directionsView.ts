import type {
  AppConfiguration,
  Destination,
  RouteProviderId,
} from "../domain/types";
import type { DirectionSession } from "../app/appState";
import {
  buildProviderUrl,
  campusSearchUrl,
  liveCampusMapUrl,
  ROUTE_BUILDING_WARNING,
  ROUTE_CAPTURE_EXPLANATION,
  routeProviders,
  toRouteDestination,
} from "../routes/routeService";
import type { RouteOrigin } from "../routes/types";
import { actionButton, element, externalLink, viewShell } from "./elements";

export interface DirectionsActions {
  back(): void;
  retry(): Promise<void>;
  acceptLowAccuracy(): void;
  useFallback(destination: Destination, disclosure: string): void;
  useDestinationOnly(): void;
}

function providerLinkLabel(provider: RouteProviderId): string {
  if (provider === "concept3d") return "Etown Campus Map walking directions";
  if (provider === "apple") return "Apple Maps walking directions";
  return "Google Maps walking directions";
}

function providerLinks(
  configuration: AppConfiguration,
  preferred: RouteProviderId,
  origin: RouteOrigin | null,
  destination: Destination,
  room: string,
  allowedProviders: RouteProviderId[] = ["concept3d", "apple", "google"],
): HTMLElement {
  const routeDestination = toRouteDestination(destination, room);
  const ordered = [
    preferred,
    ...allowedProviders.filter((provider) => provider !== preferred),
  ].filter(
    (provider, index, values) =>
      allowedProviders.includes(provider) && values.indexOf(provider) === index,
  );
  const providerDefinitions = routeProviders(configuration);
  const container = element("div", { className: "route-links" });
  ordered.forEach((providerId, index) => {
    const provider = providerDefinitions[providerId];
    const link = externalLink(
      providerLinkLabel(providerId),
      buildProviderUrl(configuration, providerId, origin, routeDestination),
      index === 0 ? "button button-primary" : "button button-secondary",
    );
    link.setAttribute(
      "aria-label",
      `${provider.label} walking directions to ${destination.displayName}, Room ${room}`,
    );
    container.append(link);
  });
  return container;
}

export function renderDirections(
  root: HTMLElement,
  configuration: AppConfiguration,
  session: DirectionSession,
  preferred: RouteProviderId,
  online: boolean,
  lastBuilding: Destination | null,
  homeFallback: Destination,
  actions: DirectionsActions,
): void {
  root.replaceChildren();
  const destination = configuration.destinations.find(
    (candidate) => candidate.id === session.meeting.destinationId,
  );
  if (!destination) throw new Error("Route destination is missing");

  const main = element("main", { className: "content-stack" });
  main.append(
    element(
      "section",
      { className: "route-handoff" },
      element("p", { className: "card-label", text: "Walking directions" }),
      element("h2", { className: "building", text: destination.displayName }),
      element("p", { className: "room", text: `Room ${session.meeting.room}` }),
      element("p", { text: session.meeting.courseCode }),
    ),
    element("p", { className: "route-warning", text: ROUTE_BUILDING_WARNING }),
  );

  if (!online) {
    main.append(
      element("p", {
        className: "offline-banner",
        text: "External walking directions require an internet connection. Your schedule remains available offline.",
        attributes: { role: "status" },
      }),
    );
  }

  if (session.requesting) {
    main.append(
      element(
        "section",
        { className: "panel", attributes: { "aria-live": "polite" } },
        element("h2", { text: "Finding your current location…" }),
        element("p", { text: "This one-time request is not stored." }),
      ),
    );
  } else if (session.failureMessage) {
    main.append(
      element(
        "section",
        { className: "panel" },
        element("h2", { text: "Location was not available" }),
        element("p", { text: session.failureMessage }),
        actionButton("Try location again", actions.retry, {
          className: "button button-primary",
        }),
      ),
    );
  } else if (session.capturedPosition && session.assessment?.offCampus) {
    const origin: RouteOrigin = {
      latitude: session.capturedPosition.latitude,
      longitude: session.capturedPosition.longitude,
      name: "Current Location",
    };
    main.append(
      element(
        "section",
        { className: "panel warning-panel" },
        element("h2", { text: "You appear to be off campus" }),
        element("p", {
          text: "The College map is intended for campus routes. Your current location will not be sent to its wayfinding network unless you choose a campus fallback.",
        }),
        session.assessment.lowAccuracy
          ? element("p", {
              text: `The location is also imprecise, with approximate accuracy of ${Math.round(session.capturedPosition.accuracyMeters)} meters.`,
            })
          : null,
        providerLinks(
          configuration,
          preferred,
          origin,
          destination,
          session.meeting.room,
          ["apple", "google"],
        ),
        actionButton("Try location again", actions.retry, {
          className: "button button-secondary",
        }),
        actionButton("Cancel", actions.back, {
          className: "button button-quiet",
        }),
      ),
    );
  } else if (
    session.capturedPosition &&
    session.assessment?.lowAccuracy &&
    !session.acceptedLowAccuracy
  ) {
    main.append(
      element(
        "section",
        { className: "panel warning-panel" },
        element("h2", { text: "Location accuracy is limited" }),
        element("p", {
          text: `Indoor campus GPS can be imprecise. The reported approximate accuracy is ${Math.round(session.capturedPosition.accuracyMeters)} meters.`,
        }),
        actionButton("Try again", actions.retry, {
          className: "button button-primary",
        }),
        actionButton("Continue with this location", actions.acceptLowAccuracy, {
          className: "button button-secondary",
        }),
      ),
    );
  } else {
    let origin: RouteOrigin | null = session.fixedOrigin;
    if (session.capturedPosition) {
      origin = {
        latitude: session.capturedPosition.latitude,
        longitude: session.capturedPosition.longitude,
        name: "Current Location",
      };
    }
    if (session.destinationOnly) origin = null;

    if (session.assessment?.nearDestination) {
      main.append(
        element("p", {
          className: "near-banner",
          text: `You appear to be at or near ${destination.displayName}. Your room is ${session.meeting.room}. This uses straight-line proximity, not walking-route distance.`,
        }),
      );
    }
    if (session.originDisclosure) {
      main.append(
        element("p", { className: "notice", text: session.originDisclosure }),
      );
    }
    main.append(
      element(
        "section",
        { className: "panel" },
        element("h2", { text: "Choose a map" }),
        element("p", { text: ROUTE_CAPTURE_EXPLANATION }),
        providerLinks(
          configuration,
          preferred,
          origin,
          destination,
          session.meeting.room,
        ),
        element("p", {
          className: "help-text",
          text: "Google may have less complete knowledge of internal campus paths than the College map.",
        }),
      ),
    );
  }

  if (
    !session.requesting &&
    (!session.fixedOrigin ||
      session.failureMessage ||
      session.assessment?.offCampus ||
      (session.assessment?.lowAccuracy && !session.acceptedLowAccuracy))
  ) {
    const fallbacks = element(
      "section",
      { className: "panel" },
      element("h2", { text: "Starting-point fallbacks" }),
    );
    if (lastBuilding) {
      fallbacks.append(
        actionButton(
          `Use last scheduled building: ${lastBuilding.displayName}`,
          () =>
            actions.useFallback(
              lastBuilding,
              `This preview assumes you are still near ${lastBuilding.displayName}. It is not your live location.`,
            ),
          { className: "button button-secondary" },
        ),
      );
    }
    fallbacks.append(
      actionButton(
        "Preview from Founders B",
        () =>
          actions.useFallback(
            homeFallback,
            "Founders B is an approximate B/C building-center fallback, not your live location or a verified doorway.",
          ),
        { className: "button button-secondary" },
      ),
      actionButton(
        "Open destination without a starting point",
        actions.useDestinationOnly,
        {
          className: "button button-quiet",
        },
      ),
    );
    main.append(fallbacks);
  }

  main.append(
    element(
      "section",
      { className: "panel compact-links" },
      element("h2", { text: "Official map options" }),
      externalLink(
        "Open building in official campus map",
        campusSearchUrl(configuration, destination),
      ),
      externalLink("Open live campus map", liveCampusMapUrl(configuration)),
    ),
    element(
      "details",
      {},
      element("summary", { text: "Route and coordinate details" }),
      element("p", { text: destination.navigationNote }),
      element("p", {
        text: "Individual classroom positions, entrances, stairs, and hallways have not been verified. Confirm the room through building signs.",
      }),
    ),
    actionButton("Back to schedule", actions.back, {
      className: "button button-quiet",
    }),
  );

  root.append(viewShell("Directions", main));
}
