import type { RouteProviderId } from "../domain/types";
import type { LocationClassification } from "../location/locationDecision";

export type CampusProviderPreference = "concept3d" | "external";
export type ExternalProviderPreference = "auto" | "apple" | "google";

export interface NavigationPreferences {
  campus: CampusProviderPreference;
  external: ExternalProviderPreference;
}

export function automaticExternalProvider(
  userAgent: string,
): "apple" | "google" {
  return /iPad|iPhone|iPod/iu.test(userAgent) ? "apple" : "google";
}

export function externalProvider(
  preference: ExternalProviderPreference,
  userAgent: string,
): "apple" | "google" {
  return preference === "auto"
    ? automaticExternalProvider(userAgent)
    : preference;
}

export function selectRouteProvider(
  classification: LocationClassification,
  preferences: NavigationPreferences,
  userAgent: string,
): RouteProviderId {
  if (classification === "on-campus" && preferences.campus === "concept3d") {
    return "concept3d";
  }
  return externalProvider(preferences.external, userAgent);
}
