import type { AppConfiguration, ExpandedMeeting } from "../src/domain/types";

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function utcTimestamp(meetingTime: ExpandedMeeting["start"]): string {
  return meetingTime
    .toInstant()
    .toString({ smallestUnit: "second" })
    .replaceAll("-", "")
    .replaceAll(":", "");
}

function foldLine(line: string): string[] {
  const encoder = new TextEncoder();
  const result: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;

  for (const character of line) {
    const characterBytes = encoder.encode(character).byteLength;
    if (currentBytes + characterBytes > limit) {
      result.push(current);
      current = ` ${character}`;
      currentBytes = 1 + characterBytes;
      limit = 75;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }
  result.push(current);
  return result;
}

export function buildIcs(
  configuration: AppConfiguration,
  meetings: readonly ExpandedMeeting[],
  generatedAt: string,
): string {
  const destinations = new Map(
    configuration.destinations.map((destination) => [
      destination.id,
      destination,
    ]),
  );
  const calendarLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Etown Campus Assistant//Private Calendar 1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(configuration.configurationLabel)}`,
  ];
  const stamp = generatedAt
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/u, "Z");

  for (const meeting of meetings) {
    const destination = destinations.get(meeting.destinationId);
    if (!destination) throw new Error(`Unknown destination for ${meeting.id}`);
    const uid = `${meeting.id}@etown-next-class.local`;
    const location =
      meeting.modality === "virtual"
        ? "Virtual"
        : `${destination.displayName}, Room ${meeting.room}`;
    const description =
      meeting.modality === "virtual"
        ? "Virtual class. No walking directions are needed."
        : "Location coordinates, when included, are approximate building-level points. Confirm the room using building signs.";

    calendarLines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcs(uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcTimestamp(meeting.start)}`,
      `DTEND:${utcTimestamp(meeting.end)}`,
      `SUMMARY:${escapeIcs(`${meeting.courseCode} — ${meeting.title}`)}`,
      `LOCATION:${escapeIcs(location)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
    );
    if (meeting.modality === "in-person") {
      calendarLines.push(
        `GEO:${destination.latitude};${destination.longitude}`,
      );
    }
    calendarLines.push("END:VEVENT");
  }
  calendarLines.push("END:VCALENDAR");

  return `${calendarLines.flatMap(foldLine).join("\r\n")}\r\n`;
}
