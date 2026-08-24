import type { DirectionSession } from "../app/appState";
import type { AppConfiguration, Destination } from "../domain/types";
import {
  campusGuidance,
  createCampusOrientationMap,
  type CampusMapOrigin,
} from "../map/campusMap";
import { actionButton, element, viewShell } from "./elements";

export interface DirectionsActions {
  back(): void;
  retry(): Promise<void>;
  acceptLowAccuracy(): void;
  useFallback(destination: Destination, disclosure: string): void;
  useDestinationOnly(): void;
}

function roundedDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 5) * 5)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

function orientationPanel(
  configuration: AppConfiguration,
  destination: Destination,
  room: string,
  origin: CampusMapOrigin | null,
  disclosure: string | null,
): HTMLElement {
  const panel = element(
    "section",
    { className: "panel map-panel" },
    element("h2", { text: "Campus orientation" }),
    element("p", {
      className: "map-purpose",
      text: origin
        ? `From ${origin.name} toward ${destination.displayName}, Room ${room}`
        : `${destination.displayName}, Room ${room}`,
    }),
    createCampusOrientationMap(configuration, destination, room, origin),
  );
  if (origin) {
    const guidance = campusGuidance(origin, destination);
    panel.append(
      element("p", {
        className: "orientation-summary",
        text: `About ${roundedDistance(guidance.distanceMeters)} ${guidance.compassDirection} in a straight line.`,
      }),
    );
  }
  if (disclosure) {
    panel.append(element("p", { className: "notice", text: disclosure }));
  }
  panel.append(
    element("p", {
      className: "map-disclaimer",
      text: "This is an original schematic, not a turn-by-turn route. The line is straight-line orientation only and may cross buildings or other obstacles.",
    }),
  );
  return panel;
}

function fallbackPanel(
  lastBuilding: Destination | null,
  homeFallback: Destination,
  actions: DirectionsActions,
): HTMLElement {
  const panel = element(
    "section",
    { className: "panel" },
    element("h2", { text: "Choose a starting point" }),
  );
  if (lastBuilding) {
    panel.append(
      actionButton(
        `Start at last class: ${lastBuilding.displayName}`,
        () =>
          actions.useFallback(
            lastBuilding,
            `This assumes you are still near ${lastBuilding.displayName}. It is not your live location.`,
          ),
        { className: "button button-secondary" },
      ),
    );
  }
  panel.append(
    actionButton(
      "Preview from Founders B",
      () =>
        actions.useFallback(
          homeFallback,
          "Founders B is an approximate B/C building-center fallback, not your live location or a verified doorway.",
        ),
      { className: "button button-secondary" },
    ),
    actionButton("Show only the destination", actions.useDestinationOnly, {
      className: "button button-quiet",
    }),
  );
  return panel;
}

export function renderDirections(
  root: HTMLElement,
  configuration: AppConfiguration,
  session: DirectionSession,
  online: boolean,
  lastBuilding: Destination | null,
  homeFallback: Destination,
  actions: DirectionsActions,
): void {
  root.replaceChildren();
  const destination = configuration.destinations.find(
    (candidate) => candidate.id === session.meeting.destinationId,
  );
  if (!destination) throw new Error("Destination is missing");

  const main = element("main", { className: "content-stack" });
  main.append(
    element(
      "section",
      { className: "route-handoff" },
      element("p", { className: "card-label", text: "Next destination" }),
      element("h2", { className: "building", text: destination.displayName }),
      element("p", { className: "room", text: `Room ${session.meeting.room}` }),
      element("p", { text: session.meeting.courseCode }),
    ),
    element("p", {
      className: "route-warning",
      text: "The marker represents an approximate building area, not a verified entrance or classroom location. Confirm the room using building signs.",
    }),
  );

  if (!online) {
    main.append(
      element("p", {
        className: "offline-banner",
        text: "You are offline. The schedule and campus schematic still work. GPS availability and accuracy depend on the phone.",
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
        element("p", {
          text: "This one-time position stays in this app’s memory and is never saved.",
        }),
      ),
    );
  } else if (session.failureMessage) {
    main.append(
      orientationPanel(
        configuration,
        destination,
        session.meeting.room,
        null,
        null,
      ),
      element(
        "section",
        { className: "panel warning-panel" },
        element("h2", { text: "Location was not available" }),
        element("p", { text: session.failureMessage }),
        actionButton("Try location again", actions.retry, {
          className: "button button-primary",
        }),
      ),
      fallbackPanel(lastBuilding, homeFallback, actions),
    );
  } else if (session.capturedPosition && session.assessment?.offCampus) {
    main.append(
      orientationPanel(
        configuration,
        destination,
        session.meeting.room,
        null,
        null,
      ),
      element(
        "section",
        { className: "panel warning-panel" },
        element("h2", { text: "You appear to be off campus" }),
        element("p", {
          text: "The live point is outside the campus area, so it is not plotted on this close-up schematic. Your position has not been stored or sent to a map provider.",
        }),
        session.assessment.lowAccuracy
          ? element("p", {
              text: `The reported approximate accuracy is ${Math.round(session.capturedPosition.accuracyMeters)} meters.`,
            })
          : null,
        actionButton("Try location again", actions.retry, {
          className: "button button-secondary",
        }),
      ),
      fallbackPanel(lastBuilding, homeFallback, actions),
    );
  } else if (
    session.capturedPosition &&
    session.assessment?.lowAccuracy &&
    !session.acceptedLowAccuracy
  ) {
    main.append(
      orientationPanel(
        configuration,
        destination,
        session.meeting.room,
        null,
        null,
      ),
      element(
        "section",
        { className: "panel warning-panel" },
        element("h2", { text: "Location accuracy is limited" }),
        element("p", {
          text: `Indoor GPS can be imprecise. The reported approximate accuracy is ${Math.round(session.capturedPosition.accuracyMeters)} meters.`,
        }),
        actionButton("Try again", actions.retry, {
          className: "button button-primary",
        }),
        actionButton(
          "Use this approximate location",
          actions.acceptLowAccuracy,
          { className: "button button-secondary" },
        ),
      ),
      fallbackPanel(lastBuilding, homeFallback, actions),
    );
  } else {
    let origin: CampusMapOrigin | null = session.fixedOrigin;
    if (session.capturedPosition) {
      origin = {
        latitude: session.capturedPosition.latitude,
        longitude: session.capturedPosition.longitude,
        name: "You are here",
      };
    }
    if (session.destinationOnly) origin = null;

    if (session.assessment?.nearDestination) {
      main.append(
        element("p", {
          className: "near-banner",
          text: `You appear to be at or near ${destination.displayName}. Your room is ${session.meeting.room}. This is straight-line proximity, not walking distance.`,
        }),
      );
    }
    main.append(
      orientationPanel(
        configuration,
        destination,
        session.meeting.room,
        origin,
        session.originDisclosure,
      ),
    );
    if (session.destinationOnly) {
      main.append(
        actionButton("Use my current location", actions.retry, {
          className: "button button-secondary",
        }),
      );
    }
  }

  main.append(
    element(
      "details",
      {},
      element("summary", { text: "Map and coordinate limits" }),
      element("p", { text: destination.navigationNote }),
      element("p", {
        text: "No entrance, indoor route, floor, stair, hallway, construction closure, or accessible path has been verified by this app.",
      }),
    ),
    actionButton("Back to schedule", actions.back, {
      className: "button button-quiet",
    }),
  );

  root.append(viewShell("Campus guide", main));
}
