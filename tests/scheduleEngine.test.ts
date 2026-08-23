import { Temporal } from "@js-temporal/polyfill";

import {
  expandSchedule,
  getCurrentMeeting,
  getMeetingsForCampusDate,
  getNextMeeting,
  getPreviousMeeting,
  getSameBuildingTransition,
} from "../src/domain/scheduleEngine";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

describe("schedule expansion", () => {
  it("applies no-class and replacement rules without merging the normal weekday", () => {
    const meetings = expandSchedule(syntheticConfiguration());
    expect(getMeetingsForCampusDate(meetings, "2030-01-09")).toHaveLength(0);
    const replacement = getMeetingsForCampusDate(meetings, "2030-01-10");
    expect(replacement).toHaveLength(1);
    expect(replacement[0]).toMatchObject({
      courseCode: "LIT210X",
      modality: "virtual",
    });
    expect(getMeetingsForCampusDate(meetings, "2030-01-14")).toHaveLength(1);
  });

  it("is deterministic and creates stable IDs", () => {
    const first = expandSchedule(syntheticConfiguration());
    const second = expandSchedule(syntheticConfiguration());
    expect(first.map(({ id }) => id)).toEqual(second.map(({ id }) => id));
    expect(first[0]?.id).toBe("bio201x-mw-2030-01-07-0900");
    expect(new Set(first.map(({ id }) => id)).size).toBe(first.length);
  });

  it("implements exact current and next boundaries", () => {
    const meetings = expandSchedule(syntheticConfiguration());
    const before = Temporal.ZonedDateTime.from(
      "2030-01-07T08:59:59.999999999-05:00[America/New_York]",
    );
    const start = Temporal.ZonedDateTime.from(
      "2030-01-07T09:00:00-05:00[America/New_York]",
    );
    const beforeEnd = Temporal.ZonedDateTime.from(
      "2030-01-07T10:14:59.999999999-05:00[America/New_York]",
    );
    const end = Temporal.ZonedDateTime.from(
      "2030-01-07T10:15:00-05:00[America/New_York]",
    );

    expect(getCurrentMeeting(meetings, before)).toBeNull();
    expect(getNextMeeting(meetings, before)?.courseCode).toBe("BIO201X");
    expect(getCurrentMeeting(meetings, start)?.courseCode).toBe("BIO201X");
    expect(getNextMeeting(meetings, start)?.courseCode).not.toBe("BIO201X");
    expect(getCurrentMeeting(meetings, beforeEnd)?.courseCode).toBe("BIO201X");
    expect(getCurrentMeeting(meetings, end)).toBeNull();
    expect(getPreviousMeeting(meetings, end)?.courseCode).toBe("BIO201X");
  });

  it("detects only eligible same-building transitions", () => {
    const meetings = expandSchedule(syntheticConfiguration());
    const first = meetings[0]!;
    const next = {
      ...first,
      id: "later",
      start: first.end.add({ minutes: 180 }),
      end: first.end.add({ minutes: 240 }),
    };
    expect(getSameBuildingTransition(first, next)).toMatchObject({
      isSameBuilding: true,
      gapMinutes: 180,
    });
    expect(
      getSameBuildingTransition(first, {
        ...next,
        start: first.end.add({ minutes: 180, nanoseconds: 1 }),
      }).isSameBuilding,
    ).toBe(false);
    expect(
      getSameBuildingTransition(first, {
        ...next,
        destinationId: "sample-library",
      }).isSameBuilding,
    ).toBe(false);
    expect(
      getSameBuildingTransition(first, { ...next, modality: "virtual" })
        .isSameBuilding,
    ).toBe(false);
  });
});
