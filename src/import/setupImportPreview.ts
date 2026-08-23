import { Temporal } from "@js-temporal/polyfill";

import { expandSchedule } from "../domain/scheduleEngine";
import type { AppConfiguration } from "../domain/types";

export interface ImportPreview {
  termLabel: string;
  courseCount: number;
  meetingCount: number;
  firstRegularDate: string;
  lastRegularDate: string;
  patterns: Array<{
    courseCode: string;
    title: string;
    days: string;
    times: string;
    building: string;
    room: string;
  }>;
  exceptions: string[];
  coordinateWarnings: string[];
}

const weekdayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatTime(time: string): string {
  const value = Temporal.PlainTime.from(time);
  const hour = value.hour % 12 || 12;
  return `${hour}:${String(value.minute).padStart(2, "0")} ${value.hour >= 12 ? "PM" : "AM"}`;
}

export function buildImportPreview(
  configuration: AppConfiguration,
): ImportPreview {
  const meetings = expandSchedule(configuration);
  const destinations = new Map(
    configuration.destinations.map((destination) => [
      destination.id,
      destination,
    ]),
  );
  const courses = new Set(
    configuration.meetingPatterns.map((pattern) => pattern.courseCode),
  );

  return {
    termLabel: configuration.configurationLabel,
    courseCount: courses.size,
    meetingCount: meetings.length,
    firstRegularDate: configuration.term.scheduleStart,
    lastRegularDate: configuration.term.regularClassesEnd,
    patterns: configuration.meetingPatterns.map((pattern) => ({
      courseCode: pattern.courseCode,
      title: pattern.title,
      days: pattern.isoWeekdays
        .map((day) => weekdayLabels[day - 1] ?? `Day ${day}`)
        .join(", "),
      times: `${formatTime(pattern.startTime)}–${formatTime(pattern.endTime)}`,
      building:
        destinations.get(pattern.destinationId)?.displayName ??
        "Unknown building",
      room: pattern.room,
    })),
    exceptions: configuration.dateRules.map(
      (rule) => `${rule.date}: ${rule.label}`,
    ),
    coordinateWarnings: configuration.destinations
      .filter(
        (destination) =>
          destination.confidence !== "high" ||
          !destination.roomRoutingAvailable,
      )
      .map(
        (destination) =>
          `${destination.displayName}: ${destination.navigationNote}`,
      ),
  };
}
