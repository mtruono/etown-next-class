import { publicSchedule } from "../src/data/publicSchedule";
import {
  expandSchedule,
  getMeetingsForCampusDate,
} from "../src/domain/scheduleEngine";

describe("built-in public Fall 2026 schedule", () => {
  const meetings = expandSchedule(publicSchedule);

  it("contains the expected 140 deterministic meetings", () => {
    const byCourse = Object.fromEntries(
      ["ART105A", "HE105C", "FYS100D", "MA251B"].map((courseCode) => [
        courseCode,
        meetings.filter((meeting) => meeting.courseCode === courseCode).length,
      ]),
    );
    expect(byCourse).toEqual({
      ART105A: 28,
      HE105C: 28,
      FYS100D: 42,
      MA251B: 42,
    });
    expect(meetings).toHaveLength(140);
    expect(
      meetings.filter((meeting) => meeting.modality === "in-person"),
    ).toHaveLength(139);
    expect(
      meetings.filter((meeting) => meeting.modality === "virtual"),
    ).toHaveLength(1);
  });

  it("uses the virtual Friday replacement schedule on November 25", () => {
    const day = getMeetingsForCampusDate(meetings, "2026-11-25");
    expect(day).toHaveLength(1);
    expect(day[0]).toMatchObject({
      courseCode: "MA251B",
      startTime: "12:30",
      endTime: "13:50",
      modality: "virtual",
      replacementLabel: "Virtual Friday schedule",
    });
  });

  it("never invents regular meetings after December 4", () => {
    expect(
      meetings.filter((meeting) => meeting.campusDate > "2026-12-04"),
    ).toHaveLength(0);
  });
});
