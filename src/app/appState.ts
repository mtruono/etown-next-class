import type {
  AppConfiguration,
  ExpandedMeeting,
  RouteProviderId,
} from "../domain/types";
import type { CapturedPosition } from "../location/geolocation";
import type { LocationAssessment } from "../location/locationDecision";
import type { RouteOrigin } from "../routes/types";

export type ViewName =
  "onboarding" | "home" | "directions" | "settings" | "about";

export interface DirectionSession {
  meeting: ExpandedMeeting;
  requesting: boolean;
  failureMessage: string | null;
  capturedPosition: CapturedPosition | null;
  assessment: LocationAssessment | null;
  acceptedLowAccuracy: boolean;
  fixedOrigin: RouteOrigin | null;
  destinationOnly: boolean;
  originDisclosure: string | null;
}

export interface AppState {
  view: ViewName;
  configuration: AppConfiguration | null;
  pendingConfiguration: AppConfiguration | null;
  importError: string | null;
  importNotice: string | null;
  provider: RouteProviderId;
  directions: DirectionSession | null;
  exportedSetupCode: string | null;
  online: boolean;
  updateAvailable: boolean;
}
