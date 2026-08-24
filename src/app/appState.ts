import type { AppConfiguration, RouteProviderId } from "../domain/types";
import type { CapturedPosition } from "../location/geolocation";
import type { LocationAssessment } from "../location/locationDecision";
import type { NavigationTarget } from "../navigation/navigationTarget";

export type ViewName = "home" | "directions" | "settings" | "about";

export interface DirectionSession {
  target: NavigationTarget;
  requesting: boolean;
  failureMessage: string | null;
  capturedPosition: CapturedPosition | null;
  assessment: LocationAssessment | null;
  chosenProvider: RouteProviderId | null;
  launchUrl: string | null;
}

export interface AppState {
  view: ViewName;
  configuration: AppConfiguration;
  directions: DirectionSession | null;
  online: boolean;
  updateAvailable: boolean;
}
