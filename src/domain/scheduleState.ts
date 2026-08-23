import { Temporal } from "@js-temporal/polyfill";

import {
  expandSchedule,
  getCurrentMeeting,
  getMeetingsForCampusDate,
  getNextMeeting,
  getPreviousMeeting,
} from "./scheduleEngine";
import { compareZoned, nowInCampusTimezone } from "./time";
import type { AppConfiguration, SchedulePhase, ScheduleState } from "./types";

function phaseForDate(
  configuration: AppConfiguration,
  date: Temporal.PlainDate,
): SchedulePhase {
  const start = Temporal.PlainDate.from(configuration.term.scheduleStart);
  const regularEnd = Temporal.PlainDate.from(
    configuration.term.regularClassesEnd,
  );
  const finalsStart = Temporal.PlainDate.from(
    configuration.term.finalsMessageStart,
  );
  const finalsEnd = Temporal.PlainDate.from(
    configuration.term.finalsMessageEnd,
  );

  if (Temporal.PlainDate.compare(date, start) < 0) return "before-term";
  if (Temporal.PlainDate.compare(date, regularEnd) <= 0)
    return "regular-classes";
  if (
    Temporal.PlainDate.compare(date, finalsStart) >= 0 &&
    Temporal.PlainDate.compare(date, finalsEnd) <= 0
  ) {
    return "finals-and-reading";
  }
  return "semester-complete";
}

export function getScheduleState(
  configuration: AppConfiguration,
  now: Temporal.Instant | Temporal.ZonedDateTime,
): ScheduleState {
  const campusNow = nowInCampusTimezone(now, configuration.campus.timezone);
  const campusDateValue = campusNow.toPlainDate();
  const campusDate = campusDateValue.toString();
  const phase = phaseForDate(configuration, campusDateValue);
  const meetings = expandSchedule(configuration);

  if (phase === "finals-and-reading" || phase === "semester-complete") {
    return {
      phase,
      campusNow,
      campusDate,
      current: null,
      next: null,
      previous: getPreviousMeeting(meetings, campusNow),
      today: [],
      remainingToday: [],
      noClassesReason: null,
      informationalNote: null,
      afterLastClassToday: false,
    };
  }

  const today = getMeetingsForCampusDate(meetings, campusDateValue);
  const current = getCurrentMeeting(meetings, campusNow);
  const next = getNextMeeting(meetings, campusNow);
  const previous = getPreviousMeeting(meetings, campusNow);
  const dateRule = configuration.dateRules.find(
    (rule) => rule.date === campusDate,
  );
  const remainingToday = today.filter(
    (meeting) => compareZoned(meeting.end, campusNow) > 0,
  );
  const afterLastClassToday =
    phase === "regular-classes" &&
    today.length > 0 &&
    remainingToday.length === 0 &&
    current === null;

  return {
    phase,
    campusNow,
    campusDate,
    current,
    next,
    previous,
    today,
    remainingToday,
    noClassesReason: dateRule?.kind === "no-classes" ? dateRule.label : null,
    informationalNote:
      dateRule?.kind === "informational" ? dateRule.label : null,
    afterLastClassToday,
  };
}
