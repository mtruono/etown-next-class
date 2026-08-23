import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

import type { AppConfiguration } from "../domain/types";

const identifier = z.string().trim().min(1).max(160);
const displayString = z.string().trim().min(1).max(500);
const coordinate = z.number().finite();

function isPlainDate(value: string): boolean {
  try {
    return Temporal.PlainDate.from(value).toString() === value;
  } catch {
    return false;
  }
}

function isPlainTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  try {
    return (
      Temporal.PlainTime.from(value).toString({ smallestUnit: "minute" }) ===
      value
    );
  } catch {
    return false;
  }
}

function isTimezone(value: string): boolean {
  try {
    Temporal.Now.zonedDateTimeISO(value);
    return true;
  } catch {
    return false;
  }
}

const plainDate = z
  .string()
  .refine(isPlainDate, "Must be an ISO calendar date");
const plainTime = z
  .string()
  .refine(isPlainTime, "Must be a 24-hour HH:MM time");
const isoWeekday = z.number().int().min(1).max(7);
const modality = z.enum(["in-person", "virtual"]);

const destinationSchema = z
  .object({
    id: identifier,
    displayName: displayString,
    scheduleCode: z.string().trim().min(1).max(40).nullable(),
    latitude: coordinate.min(-90).max(90),
    longitude: coordinate.min(-180).max(180),
    level: z.number().finite().int().min(-20).max(200),
    coordinateStatus: displayString,
    confidence: z.enum(["low", "medium", "high"]),
    campusMapSearchKey: displayString,
    roomRoutingAvailable: z.boolean(),
    navigationNote: displayString,
  })
  .strict();

const meetingPatternSchema = z
  .object({
    id: identifier,
    courseCode: displayString,
    title: displayString,
    isoWeekdays: z.array(isoWeekday).min(1).max(7),
    startTime: plainTime,
    endTime: plainTime,
    destinationId: identifier,
    room: displayString,
    defaultModality: modality,
  })
  .strict()
  .superRefine((pattern, context) => {
    if (Temporal.PlainTime.compare(pattern.endTime, pattern.startTime) <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must follow start time",
      });
    }
    if (new Set(pattern.isoWeekdays).size !== pattern.isoWeekdays.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isoWeekdays"],
        message: "Weekdays must not be duplicated",
      });
    }
  });

const dateRuleSchema = z.discriminatedUnion("kind", [
  z
    .object({
      date: plainDate,
      kind: z.literal("no-classes"),
      label: displayString,
    })
    .strict(),
  z
    .object({
      date: plainDate,
      kind: z.literal("replacement-weekday"),
      useIsoWeekday: isoWeekday,
      modalityOverride: modality.optional(),
      label: displayString,
    })
    .strict(),
  z
    .object({
      date: plainDate,
      kind: z.literal("informational"),
      label: displayString,
    })
    .strict(),
]);

const finalsDateSchema = z
  .object({
    date: plainDate,
    kind: z.enum(["reading-day", "final-exams"]),
  })
  .strict();

const rawConfigurationSchema = z
  .object({
    schemaVersion: z.literal(1),
    configurationId: identifier,
    configurationLabel: displayString,
    campus: z
      .object({
        id: identifier,
        name: displayString,
        timezone: z
          .string()
          .refine(isTimezone, "Must be a valid IANA timezone"),
        concept3dMapId: z.string().regex(/^\d+$/, "Map ID must be numeric"),
        officialMapUrl: z
          .string()
          .url()
          .refine((value) => {
            const url = new URL(value);
            return (
              url.protocol === "https:" && url.hostname === "map.concept3d.com"
            );
          }, "Official map URL must use HTTPS on map.concept3d.com"),
        campusCenter: z
          .object({
            latitude: coordinate.min(-90).max(90),
            longitude: coordinate.min(-180).max(180),
          })
          .strict(),
        onCampusRadiusMeters: z.number().finite().positive().max(100_000),
      })
      .strict(),
    term: z
      .object({
        id: identifier,
        scheduleStart: plainDate,
        regularClassesEnd: plainDate,
        printedScheduleEnd: plainDate,
        finalsMessageStart: plainDate,
        finalsMessageEnd: plainDate,
        calendarVerifiedDate: plainDate,
      })
      .strict(),
    homeFallbackDestinationId: identifier,
    destinations: z.array(destinationSchema).min(1).max(200),
    meetingPatterns: z.array(meetingPatternSchema).min(1).max(500),
    dateRules: z.array(dateRuleSchema).max(500),
    finalsAndReadingDates: z.array(finalsDateSchema).max(100),
  })
  .strict();

export const configurationSchema: z.ZodType<AppConfiguration> =
  rawConfigurationSchema.superRefine((configuration, context) => {
    const term = configuration.term;
    const orderedDates = [
      term.scheduleStart,
      term.regularClassesEnd,
      term.finalsMessageStart,
      term.finalsMessageEnd,
      term.printedScheduleEnd,
    ].map((date) => Temporal.PlainDate.from(date));

    for (let index = 1; index < orderedDates.length; index += 1) {
      const previous = orderedDates[index - 1];
      const current = orderedDates[index];
      if (
        previous &&
        current &&
        Temporal.PlainDate.compare(previous, current) > 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["term"],
          message: "Term boundary dates must be ordered",
        });
        break;
      }
    }

    const destinationIds = configuration.destinations.map(({ id }) => id);
    if (new Set(destinationIds).size !== destinationIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinations"],
        message: "Destination IDs must be unique",
      });
    }

    const patternIds = configuration.meetingPatterns.map(({ id }) => id);
    if (new Set(patternIds).size !== patternIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meetingPatterns"],
        message: "Meeting-pattern IDs must be unique",
      });
    }

    const validDestinations = new Set(destinationIds);
    if (!validDestinations.has(configuration.homeFallbackDestinationId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["homeFallbackDestinationId"],
        message: "Home fallback must reference a configured destination",
      });
    }

    configuration.meetingPatterns.forEach((pattern, index) => {
      if (!validDestinations.has(pattern.destinationId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["meetingPatterns", index, "destinationId"],
          message: "Meeting pattern references an unknown destination",
        });
      }
    });

    const ruleDates = configuration.dateRules.map(({ date }) => date);
    if (new Set(ruleDates).size !== ruleDates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateRules"],
        message: "Only one date rule is allowed per date",
      });
    }

    const finalsDates = configuration.finalsAndReadingDates.map(
      ({ date }) => date,
    );
    if (new Set(finalsDates).size !== finalsDates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["finalsAndReadingDates"],
        message: "Finals and reading dates must be unique",
      });
    }
  });

export function validateConfiguration(input: unknown): AppConfiguration {
  return configurationSchema.parse(input);
}
