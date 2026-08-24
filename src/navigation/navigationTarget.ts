import type {
  AppConfiguration,
  Destination,
  ExpandedMeeting,
} from "../domain/types";

export type NavigationTarget =
  | {
      kind: "class";
      destinationId: string;
      displayLabel: string;
      room: string;
      courseCode: string;
    }
  | {
      kind: "home";
      destinationId: string;
      displayLabel: string;
    };

export function createClassNavigationTarget(
  meeting: ExpandedMeeting,
  destination: Destination,
): NavigationTarget {
  return {
    kind: "class",
    destinationId: destination.id,
    displayLabel: destination.displayName,
    room: meeting.room,
    courseCode: meeting.courseCode,
  };
}

export function createHomeNavigationTarget(
  configuration: AppConfiguration,
): NavigationTarget {
  const destination = configuration.destinations.find(
    ({ id }) => id === configuration.homeFallbackDestinationId,
  );
  if (!destination) throw new Error("The home destination is unavailable.");
  return {
    kind: "home",
    destinationId: destination.id,
    displayLabel: destination.displayName,
  };
}

export function destinationForTarget(
  configuration: AppConfiguration,
  target: NavigationTarget,
): Destination {
  const destination = configuration.destinations.find(
    ({ id }) => id === target.destinationId,
  );
  if (!destination)
    throw new Error("The navigation destination is unavailable.");
  return destination;
}
