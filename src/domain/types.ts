import type { Temporal } from "@js-temporal/polyfill";

export type Modality = "in-person" | "virtual";
export type Confidence = "low" | "medium" | "high";
export type RouteProviderId = "concept3d" | "apple" | "google";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Destination extends Coordinate {
  id: string;
  displayName: string;
  scheduleCode: string | null;
  level: number;
  coordinateStatus: string;
  confidence: Confidence;
  campusMapSearchKey: string;
  roomRoutingAvailable: boolean;
  navigationNote: string;
}

export interface MeetingPattern {
  id: string;
  courseCode: string;
  title: string;
  isoWeekdays: number[];
  startTime: string;
  endTime: string;
  destinationId: string;
  room: string;
  defaultModality: Modality;
}

export interface NoClassesRule {
  date: string;
  kind: "no-classes";
  label: string;
}

export interface ReplacementWeekdayRule {
  date: string;
  kind: "replacement-weekday";
  useIsoWeekday: number;
  modalityOverride?: Modality;
  label: string;
}

export interface InformationalRule {
  date: string;
  kind: "informational";
  label: string;
}

export type DateRule =
  NoClassesRule | ReplacementWeekdayRule | InformationalRule;

export interface FinalsAndReadingDate {
  date: string;
  kind: "reading-day" | "final-exams";
}

export interface CampusConfiguration {
  id: string;
  name: string;
  timezone: string;
  concept3dMapId: string;
  officialMapUrl: string;
  campusCenter: Coordinate;
  onCampusRadiusMeters: number;
}

export interface TermConfiguration {
  id: string;
  scheduleStart: string;
  regularClassesEnd: string;
  printedScheduleEnd: string;
  finalsMessageStart: string;
  finalsMessageEnd: string;
  calendarVerifiedDate: string;
}

export interface AppConfiguration {
  schemaVersion: 1;
  configurationId: string;
  configurationLabel: string;
  campus: CampusConfiguration;
  term: TermConfiguration;
  homeFallbackDestinationId: string;
  destinations: Destination[];
  meetingPatterns: MeetingPattern[];
  dateRules: DateRule[];
  finalsAndReadingDates: FinalsAndReadingDate[];
}

export interface ExpandedMeeting {
  id: string;
  patternId: string;
  courseCode: string;
  title: string;
  campusDate: string;
  startTime: string;
  endTime: string;
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  destinationId: string;
  room: string;
  modality: Modality;
  replacementLabel?: string;
}

export interface SameBuildingResult {
  isSameBuilding: boolean;
  destinationId: string | null;
  gapMinutes: number | null;
}

export type SchedulePhase =
  | "before-term"
  | "regular-classes"
  | "finals-and-reading"
  | "semester-complete";

export interface ScheduleState {
  phase: SchedulePhase;
  campusNow: Temporal.ZonedDateTime;
  campusDate: string;
  current: ExpandedMeeting | null;
  next: ExpandedMeeting | null;
  previous: ExpandedMeeting | null;
  today: ExpandedMeeting[];
  remainingToday: ExpandedMeeting[];
  noClassesReason: string | null;
  informationalNote: string | null;
  afterLastClassToday: boolean;
}
