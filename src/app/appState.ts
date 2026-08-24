import type { AppConfiguration, ExpandedMeeting } from "../domain/types";
import type { CapturedPosition } from "../location/geolocation";
import type { LocationAssessment } from "../location/locationDecision";
import type { CampusMapOrigin } from "../map/campusMap";

export type ViewName = "home" | "directions" | "settings" | "about";

export interface DirectionSession {
  meeting: ExpandedMeeting;
  requesting: boolean;
  failureMessage: string | null;
  capturedPosition: CapturedPosition | null;
  assessment: LocationAssessment | null;
  acceptedLowAccuracy: boolean;
  fixedOrigin: CampusMapOrigin | null;
  destinationOnly: boolean;
  originDisclosure: string | null;
}

export interface AppState {
  view: ViewName;
  configuration: AppConfiguration;
  directions: DirectionSession | null;
  online: boolean;
  updateAvailable: boolean;
}
