import { assertCoordinate } from "../domain/distance";
import type { Coordinate } from "../domain/types";

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 30_000,
};

export type GeolocationFailureCode =
  | "unsupported"
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "unknown";

export interface CapturedPosition extends Coordinate {
  accuracyMeters: number;
}

export type GeolocationResult =
  | { ok: true; position: CapturedPosition }
  | { ok: false; code: GeolocationFailureCode; message: string };

function failureFromError(error: GeolocationPositionError): GeolocationResult {
  if (error.code === error.PERMISSION_DENIED) {
    return {
      ok: false,
      code: "permission-denied",
      message:
        "Location permission was denied. Choose an explicit starting-point fallback.",
    };
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return {
      ok: false,
      code: "position-unavailable",
      message:
        "Your current position is unavailable. Choose an explicit starting-point fallback.",
    };
  }
  if (error.code === error.TIMEOUT) {
    return {
      ok: false,
      code: "timeout",
      message:
        "The location request timed out. Try again or choose a starting-point fallback.",
    };
  }
  return {
    ok: false,
    code: "unknown",
    message:
      "The location request failed. Try again or choose a starting-point fallback.",
  };
}

export function requestCurrentPosition(
  geolocation: Geolocation | undefined = navigator.geolocation,
): Promise<GeolocationResult> {
  if (!geolocation) {
    return Promise.resolve({
      ok: false,
      code: "unsupported",
      message: "This browser does not support location requests.",
    });
  }

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (result) => {
        const position: CapturedPosition = {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracyMeters: result.coords.accuracy,
        };
        try {
          assertCoordinate(position, "Captured position");
          if (
            !Number.isFinite(position.accuracyMeters) ||
            position.accuracyMeters < 0
          ) {
            throw new RangeError("Invalid accuracy");
          }
          resolve({ ok: true, position });
        } catch {
          resolve({
            ok: false,
            code: "position-unavailable",
            message:
              "The browser returned an invalid position. Choose a starting-point fallback.",
          });
        }
      },
      (error) => resolve(failureFromError(error)),
      GEOLOCATION_OPTIONS,
    );
  });
}
