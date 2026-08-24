import { Temporal } from "@js-temporal/polyfill";

import type {
  AppConfiguration,
  ExpandedMeeting,
  SameBuildingResult,
} from "./types";
import { campusZonedDateTime, compareZoned, minutesBetween } from "./time";

function stableMeetingId(
  patternId: string,
  campusDate: string,
  startTime: string,
): string {
  return `${patternId}-${campusDate}-${startTime.replace(":", "")}`;
}

export function expandSchedule(
  configuration: AppConfiguration,
): ExpandedMeeting[] {
  const startDate = Temporal.PlainDate.from(configuration.term.scheduleStart);
  const endDate = Temporal.PlainDate.from(configuration.term.regularClassesEnd);
  const rules = new Map(
    configuration.dateRules.map((rule) => [rule.date, rule]),
  );
  const meetings: ExpandedMeeting[] = [];

  for (
    let date = startDate;
    Temporal.PlainDate.compare(date, endDate) <= 0;
    date = date.add({ days: 1 })
  ) {
    const campusDate = date.toString();
    const rule = rules.get(campusDate);
    if (rule?.kind === "no-classes") continue;

    const effectiveWeekday =
      rule?.kind === "replacement-weekday"
        ? rule.useIsoWeekday
        : date.dayOfWeek;
    const patterns = configuration.meetingPatterns.filter((pattern) =>
      pattern.isoWeekdays.includes(effectiveWeekday),
    );

    for (const pattern of patterns) {
      const start = campusZonedDateTime(
        date,
        pattern.startTime,
        configuration.campus.timezone,
      );
      const end = campusZonedDateTime(
        date,
        pattern.endTime,
        configuration.campus.timezone,
      );
      meetings.push({
        id: stableMeetingId(pattern.id, campusDate, pattern.startTime),
        patternId: pattern.id,
        courseCode: pattern.courseCode,
        title: pattern.title,
        campusDate,
        startTime: pattern.startTime,
        endTime: pattern.endTime,
        start,
        end,
        destinationId: pattern.destinationId,
        room: pattern.room,
        modality:
          rule?.kind === "replacement-weekday" && rule.modalityOverride
            ? rule.modalityOverride
            : pattern.defaultModality,
        replacementLabel:
          rule?.kind === "replacement-weekday" ? rule.label : undefined,
      });
    }
  }

  meetings.sort((first, second) => {
    const byStart = compareZoned(first.start, second.start);
    if (byStart !== 0) return byStart;
    const byEnd = compareZoned(first.end, second.end);
    if (byEnd !== 0) return byEnd;
    return first.id.localeCompare(second.id);
  });

  const ids = new Set<string>();
  for (const meeting of meetings) {
    if (ids.has(meeting.id))
      throw new Error(`Duplicate expanded meeting ID: ${meeting.id}`);
    ids.add(meeting.id);
  }

  return meetings;
}

export function getCurrentMeeting(
  meetings: readonly ExpandedMeeting[],
  now: Temporal.ZonedDateTime,
): ExpandedMeeting | null {
  return (
    meetings.find(
      (meeting) =>
        compareZoned(now, meeting.start) >= 0 &&
        compareZoned(now, meeting.end) < 0,
    ) ?? null
  );
}

export function getNextMeeting(
  meetings: readonly ExpandedMeeting[],
  now: Temporal.ZonedDateTime,
): ExpandedMeeting | null {
  return (
    meetings.find((meeting) => compareZoned(meeting.start, now) > 0) ?? null
  );
}

export function getPreviousMeeting(
  meetings: readonly ExpandedMeeting[],
  now: Temporal.ZonedDateTime,
): ExpandedMeeting | null {
  let previous: ExpandedMeeting | null = null;
  for (const meeting of meetings) {
    if (compareZoned(meeting.end, now) <= 0) previous = meeting;
    else if (compareZoned(meeting.start, now) > 0) break;
  }
  return previous;
}

export function getMeetingsForCampusDate(
  meetings: readonly ExpandedMeeting[],
  date: string | Temporal.PlainDate,
): ExpandedMeeting[] {
  const campusDate =
    typeof date === "string"
      ? Temporal.PlainDate.from(date).toString()
      : date.toString();
  return meetings.filter((meeting) => meeting.campusDate === campusDate);
}

export function getMeetingsForCampusWeek(
  meetings: readonly ExpandedMeeting[],
  date: string | Temporal.PlainDate,
): ExpandedMeeting[] {
  const anchor =
    typeof date === "string" ? Temporal.PlainDate.from(date) : date;
  const monday = anchor.subtract({ days: anchor.dayOfWeek - 1 });
  const sunday = monday.add({ days: 6 });
  const start = monday.toString();
  const end = sunday.toString();
  return meetings.filter(
    (meeting) => meeting.campusDate >= start && meeting.campusDate <= end,
  );
}

export function getSameBuildingTransition(
  previous: ExpandedMeeting | null,
  next: ExpandedMeeting | null,
): SameBuildingResult {
  if (
    !previous ||
    !next ||
    previous.modality !== "in-person" ||
    next.modality !== "in-person" ||
    previous.campusDate !== next.campusDate ||
    previous.destinationId !== next.destinationId
  ) {
    return { isSameBuilding: false, destinationId: null, gapMinutes: null };
  }

  const gapMinutes = minutesBetween(previous.end, next.start);
  if (gapMinutes < 0 || gapMinutes > 180) {
    return { isSameBuilding: false, destinationId: null, gapMinutes };
  }

  return {
    isSameBuilding: true,
    destinationId: next.destinationId,
    gapMinutes,
  };
}
