import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { Temporal } from "@js-temporal/polyfill";

import {
  expandSchedule,
  getMeetingsForCampusDate,
  getSameBuildingTransition,
} from "../src/domain/scheduleEngine";
import { getScheduleState } from "../src/domain/scheduleState";
import type { AppConfiguration, ExpandedMeeting } from "../src/domain/types";
import { buildIcs } from "./make-ics";
import { loadPrivateInputs, type PrivateExpectations } from "./private-inputs";

function countBy<T>(
  values: readonly T[],
  key: (value: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const group = key(value);
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function assertMeetingFields(
  meeting: ExpandedMeeting | undefined,
  expected: Record<string, string>,
): void {
  assert.ok(meeting, "Expected occurrence is missing");
  for (const [key, expectedValue] of Object.entries(expected)) {
    assert.equal(
      String(meeting[key as keyof ExpandedMeeting]),
      expectedValue,
      `Unexpected ${key} on ${meeting.id}`,
    );
  }
}

export function verifyPrivateSchedule(
  configuration: AppConfiguration,
  expectations: PrivateExpectations,
): ExpandedMeeting[] {
  const meetings = expandSchedule(configuration);
  assert.equal(
    meetings.length,
    expectations.total,
    "Unexpected total occurrence count",
  );
  assert.deepEqual(
    countBy(meetings, (meeting) => meeting.courseCode),
    Object.fromEntries(
      Object.entries(expectations.countsByCourse).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
    "Unexpected counts by course",
  );
  assert.deepEqual(
    countBy(meetings, (meeting) => meeting.modality),
    Object.fromEntries(
      Object.entries(expectations.countsByModality).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
    "Unexpected counts by modality",
  );
  assertMeetingFields(meetings[0], expectations.firstOccurrence);
  assertMeetingFields(meetings.at(-1), expectations.lastOccurrence);

  for (const expected of expectations.dateCases) {
    const onDate = getMeetingsForCampusDate(meetings, expected.date);
    assert.equal(
      onDate.length,
      expected.meetingCount,
      `Unexpected meeting count on ${expected.date}`,
    );
    if (expected.courseCodes) {
      assert.deepEqual(
        onDate.map((meeting) => meeting.courseCode),
        expected.courseCodes,
        `Unexpected courses on ${expected.date}`,
      );
    }
    if (expected.modalities) {
      assert.deepEqual(
        onDate.map((meeting) => meeting.modality),
        expected.modalities,
        `Unexpected modalities on ${expected.date}`,
      );
    }
    if (expected.noClassesReason) {
      const noon = Temporal.PlainDate.from(expected.date)
        .toPlainDateTime("12:00")
        .toZonedDateTime(configuration.campus.timezone);
      assert.equal(
        getScheduleState(configuration, noon).noClassesReason,
        expected.noClassesReason,
        `Unexpected no-class reason on ${expected.date}`,
      );
    }
  }

  for (const expected of expectations.stateCases) {
    const state = getScheduleState(
      configuration,
      Temporal.ZonedDateTime.from(expected.now),
    );
    if ("currentCourse" in expected) {
      assert.equal(
        state.current?.courseCode ?? null,
        expected.currentCourse ?? null,
        expected.now,
      );
    }
    if (expected.currentRoom) {
      assert.equal(state.current?.room, expected.currentRoom, expected.now);
    }
    if ("nextCourse" in expected) {
      assert.equal(
        state.next?.courseCode ?? null,
        expected.nextCourse ?? null,
        expected.now,
      );
    }
    if (expected.nextDate)
      assert.equal(state.next?.campusDate, expected.nextDate, expected.now);
    if (expected.nextTime)
      assert.equal(state.next?.startTime, expected.nextTime, expected.now);
    if (expected.nextRoom)
      assert.equal(state.next?.room, expected.nextRoom, expected.now);
    if (expected.phase) assert.equal(state.phase, expected.phase, expected.now);
    if (expected.sameBuilding !== undefined) {
      assert.equal(
        getSameBuildingTransition(state.previous, state.next).isSameBuilding,
        expected.sameBuilding,
        expected.now,
      );
    }
  }

  for (const expected of expectations.dstCases) {
    const meeting = meetings.find(
      (candidate) =>
        candidate.campusDate === expected.meetingDate &&
        candidate.courseCode === expected.courseCode,
    );
    assert.ok(meeting, `DST occurrence is missing on ${expected.meetingDate}`);
    assert.equal(meeting.startTime, expected.localStart);
    assert.equal(
      meeting.start.toInstant().toZonedDateTimeISO("UTC").hour,
      expected.utcHour,
    );
  }

  const virtual = meetings.filter((meeting) => meeting.modality === "virtual");
  assert.equal(
    virtual.length,
    1,
    "There must be exactly one virtual occurrence",
  );
  assertMeetingFields(virtual[0], {
    campusDate: expectations.virtualOccurrence.date,
    courseCode: expectations.virtualOccurrence.courseCode,
    startTime: expectations.virtualOccurrence.startTime,
    endTime: expectations.virtualOccurrence.endTime,
    replacementLabel: expectations.virtualOccurrence.replacementLabel,
  });

  const finalsStart = Temporal.PlainDate.from(
    configuration.term.finalsMessageStart,
  );
  const finalsEnd = Temporal.PlainDate.from(
    configuration.term.finalsMessageEnd,
  );
  for (
    let date = finalsStart;
    Temporal.PlainDate.compare(date, finalsEnd) <= 0;
    date = date.add({ days: 1 })
  ) {
    assert.equal(
      getMeetingsForCampusDate(meetings, date).length,
      0,
      `Meeting invented on ${date.toString()}`,
    );
    const state = getScheduleState(
      configuration,
      date
        .toPlainDateTime("09:00")
        .toZonedDateTime(configuration.campus.timezone),
    );
    assert.equal(state.phase, "finals-and-reading");
    assert.equal(state.next, null);
  }

  assert.equal(
    new Set(meetings.map((meeting) => meeting.id)).size,
    meetings.length,
  );
  return meetings;
}

export function verifyPrivateIcs(
  configuration: AppConfiguration,
  meetings: readonly ExpandedMeeting[],
): void {
  const ics = buildIcs(configuration, meetings, "2000-01-01T00:00:00.000Z");
  const unfolded = ics.replaceAll("\r\n ", "");
  const eventCount = (unfolded.match(/BEGIN:VEVENT\r\n/gu) ?? []).length;
  assert.equal(
    eventCount,
    meetings.length,
    "ICS event count differs from expanded schedule",
  );
  assert.equal(
    (unfolded.match(/DTSTART:\d{8}T\d{6}Z\r\n/gu) ?? []).length,
    meetings.length,
  );
  assert.equal(
    (unfolded.match(/DTEND:\d{8}T\d{6}Z\r\n/gu) ?? []).length,
    meetings.length,
  );
  assert.equal((unfolded.match(/LOCATION:Virtual\r\n/gu) ?? []).length, 1);
  assert.ok(!unfolded.includes("RRULE"), "ICS must use explicit events");
  assert.ok(!unfolded.includes("VALARM"), "ICS must not create alarms");
  assert.ok(
    unfolded.includes(`X-WR-CALNAME:${configuration.configurationLabel}\r\n`),
  );

  const uids = unfolded
    .split("\r\n")
    .filter((line) => line.startsWith("UID:"))
    .map((line) => line.slice(4));
  assert.equal(uids.length, meetings.length);
  assert.equal(new Set(uids).size, meetings.length, "ICS UIDs must be unique");

  const withoutCrLf = ics.replaceAll("\r\n", "");
  assert.ok(
    !withoutCrLf.includes("\n") && !withoutCrLf.includes("\r"),
    "ICS contains bare line endings",
  );
  for (const line of ics.split("\r\n").slice(0, -1)) {
    assert.ok(
      new TextEncoder().encode(line).byteLength <= 75,
      "ICS line exceeds 75 UTF-8 octets",
    );
  }
}

async function main(): Promise<void> {
  const { configuration, expectations } = await loadPrivateInputs();
  const meetings = verifyPrivateSchedule(configuration, expectations);
  verifyPrivateIcs(configuration, meetings);
  process.stdout.write(
    `Private schedule verified: ${meetings.length} occurrences.\n`,
  );
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
