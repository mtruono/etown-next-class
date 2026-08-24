import { haversineDistanceMeters } from "../domain/distance";
import { minutesBetween } from "../domain/time";
import type {
  AppConfiguration,
  Destination,
  ExpandedMeeting,
} from "../domain/types";
import type { CapturedPosition } from "./geolocation";

export const LOW_ACCURACY_THRESHOLD_METERS = 120;
export const NEAR_DESTINATION_THRESHOLD_METERS = 75;

export type LocationClassification =
  "on-campus" | "off-campus" | "low-accuracy";

export interface LocationAssessment {
  classification: LocationClassification;
  lowAccuracy: boolean;
  offCampus: boolean;
  nearDestination: boolean;
  campusDistanceMeters: number;
  destinationDistanceMeters: number;
}

export function assessCapturedLocation(
  configuration: AppConfiguration,
  position: CapturedPosition,
  destination: Destination,
): LocationAssessment {
  const campusDistanceMeters = haversineDistanceMeters(
    position,
    configuration.campus.campusCenter,
  );
  const destinationDistanceMeters = haversineDistanceMeters(
    position,
    destination,
  );
  const lowAccuracy = position.accuracyMeters > LOW_ACCURACY_THRESHOLD_METERS;
  const offCampus =
    campusDistanceMeters > configuration.campus.onCampusRadiusMeters;
  return {
    classification: lowAccuracy
      ? "low-accuracy"
      : offCampus
        ? "off-campus"
        : "on-campus",
    lowAccuracy,
    offCampus,
    nearDestination:
      destinationDistanceMeters <= NEAR_DESTINATION_THRESHOLD_METERS,
    campusDistanceMeters,
    destinationDistanceMeters,
  };
}

export function eligibleLastBuilding(
  previous: ExpandedMeeting | null,
  campusNow: ExpandedMeeting["end"],
  destinations: readonly Destination[],
): Destination | null {
  if (
    !previous ||
    previous.modality !== "in-person" ||
    previous.campusDate !== campusNow.toPlainDate().toString()
  ) {
    return null;
  }
  const elapsedMinutes = minutesBetween(previous.end, campusNow);
  if (elapsedMinutes < 0 || elapsedMinutes > 180) return null;
  return (
    destinations.find(
      (destination) => destination.id === previous.destinationId,
    ) ?? null
  );
}
