import { Temporal } from "@js-temporal/polyfill";

import { getScheduleState } from "../src/domain/scheduleState";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

describe("schedule state", () => {
  const stateAt = (value: string) =>
    getScheduleState(
      syntheticConfiguration(),
      Temporal.ZonedDateTime.from(value),
    );

  it("shows the first meeting before the term", () => {
    const state = stateAt("2030-01-06T12:00:00-05:00[America/New_York]");
    expect(state.phase).toBe("before-term");
    expect(state.next?.courseCode).toBe("BIO201X");
  });

  it("uses campus time even when now has another timezone", () => {
    const instant = Temporal.Instant.from("2030-01-07T14:00:00Z");
    const state = getScheduleState(syntheticConfiguration(), instant);
    expect(state.campusNow.timeZoneId).toBe("America/New_York");
    expect(state.current?.courseCode).toBe("BIO201X");
  });

  it("exposes no-class reasons and informational notes correctly", () => {
    expect(
      stateAt("2030-01-09T10:00:00-05:00[America/New_York]").noClassesReason,
    ).toBe("Fictional closure");
    expect(
      stateAt("2030-01-14T08:00:00-05:00[America/New_York]").informationalNote,
    ).toBe("Normal classes continue");
  });

  it("suppresses fabricated next meetings in finals and after the semester", () => {
    const finals = stateAt("2030-01-20T10:00:00-05:00[America/New_York]");
    expect(finals.phase).toBe("finals-and-reading");
    expect(finals.next).toBeNull();
    const complete = stateAt("2030-01-26T10:00:00-05:00[America/New_York]");
    expect(complete.phase).toBe("semester-complete");
    expect(complete.next).toBeNull();
  });

  it("preserves listed campus times across daylight-saving offsets", () => {
    const configuration = syntheticConfiguration();
    configuration.term.regularClassesEnd = "2030-04-01";
    configuration.term.finalsMessageStart = "2030-04-02";
    configuration.term.finalsMessageEnd = "2030-04-03";
    configuration.term.printedScheduleEnd = "2030-04-03";
    const winter = getScheduleState(
      configuration,
      Temporal.Instant.from("2030-01-07T14:00:00Z"),
    );
    const spring = getScheduleState(
      configuration,
      Temporal.Instant.from("2030-03-11T13:00:00Z"),
    );
    expect(winter.current?.start.hour).toBe(9);
    expect(spring.current?.start.hour).toBe(9);
    expect(winter.current?.start.offset).toBe("-05:00");
    expect(spring.current?.start.offset).toBe("-04:00");
  });
});
