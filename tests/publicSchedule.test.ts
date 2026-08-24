import {
  expandSchedule,
  getMeetingsForCampusWeek,
} from "../src/domain/scheduleEngine";
import { demoSchedule } from "../src/data/demoSchedule";
import { publicSchedule } from "../src/data/publicSchedule";

describe("public Fall 2026 schedule", () => {
  it("contains every published meeting pattern and no student identity", () => {
    expect(publicSchedule.configurationId).toBe("etown-fall-2026-public-v1");
    expect(publicSchedule.meetingPatterns).toHaveLength(5);
    expect(
      publicSchedule.meetingPatterns.map(({ courseCode }) => courseCode),
    ).toEqual(["ART105A", "FYS100D", "FYS100D", "HE105C", "MA251B"]);
    expect(publicSchedule.homeFallbackDestinationId).toBe("founders-b");
    expect(JSON.stringify(publicSchedule)).not.toMatch(
      /Olivia|3896452|@|Campus Box/iu,
    );
  });

  it("expands replacement weekdays and excludes no-class dates", () => {
    const meetings = expandSchedule(publicSchedule);
    expect(
      meetings.filter(({ campusDate }) => campusDate === "2026-09-07"),
    ).toHaveLength(0);
    expect(
      meetings
        .filter(({ campusDate }) => campusDate === "2026-09-08")
        .map(({ courseCode }) => courseCode),
    ).toEqual(["HE105C", "ART105A", "FYS100D"]);
    expect(
      meetings
        .filter(({ campusDate }) => campusDate === "2026-11-25")
        .map(({ modality }) => modality),
    ).toEqual(["virtual"]);
  });
});

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
