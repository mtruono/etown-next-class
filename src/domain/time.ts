import { Temporal } from "@js-temporal/polyfill";

export function campusZonedDateTime(
  date: string | Temporal.PlainDate,
  time: string | Temporal.PlainTime,
  timezone: string,
): Temporal.ZonedDateTime {
  const plainDate =
    typeof date === "string" ? Temporal.PlainDate.from(date) : date;
  const plainTime =
    typeof time === "string" ? Temporal.PlainTime.from(time) : time;
  return plainDate.toPlainDateTime(plainTime).toZonedDateTime(timezone);
}

export function nowInCampusTimezone(
  now: Temporal.Instant | Temporal.ZonedDateTime,
  timezone: string,
): Temporal.ZonedDateTime {
  if (now instanceof Temporal.Instant) return now.toZonedDateTimeISO(timezone);
  return now.withTimeZone(timezone);
}

export function compareZoned(
  first: Temporal.ZonedDateTime,
  second: Temporal.ZonedDateTime,
): number {
  return Temporal.ZonedDateTime.compare(first, second);
}

export function formatCampusTime(value: Temporal.ZonedDateTime): string {
  return value.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCampusDate(value: Temporal.ZonedDateTime): string {
  return value.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: Temporal.ZonedDateTime): string {
  return value.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function minutesBetween(
  first: Temporal.ZonedDateTime,
  second: Temporal.ZonedDateTime,
): number {
  return (
    Number(second.epochNanoseconds - first.epochNanoseconds) / 60_000_000_000
  );
}
