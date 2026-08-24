import {
  expandSchedule,
  getMeetingsForCampusWeek,
} from "../src/domain/scheduleEngine";
import { demoSchedule } from "../src/data/demoSchedule";

describe("fictional demonstration schedule", () => {
  it("stays fictional and expands deterministically", () => {
    const meetings = expandSchedule(demoSchedule);
    expect(meetings.length).toBeGreaterThan(0);
    expect(meetings.every(({ courseCode }) => courseCode.endsWith("X"))).toBe(
      true,
    );
    expect(demoSchedule.configurationId).toContain("fictional");
  });

  it("provides a complete ordinary week for local demonstrations", () => {
    const week = getMeetingsForCampusWeek(
      expandSchedule(demoSchedule),
      "2030-08-26",
    );
    expect(week.map(({ courseCode }) => courseCode)).toEqual([
      "BIO201X",
      "LIT210X",
      "BIO201X",
    ]);
  });
});
