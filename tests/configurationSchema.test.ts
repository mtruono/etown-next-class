import { validateConfiguration } from "../src/import/configurationSchema";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

describe("configuration schema", () => {
  it("rejects impossible dates, times, weekdays, and duplicate identifiers", () => {
    const impossibleDate = structuredClone(syntheticConfiguration());
    impossibleDate.term.scheduleStart = "2030-02-30";
    expect(() => validateConfiguration(impossibleDate)).toThrow();

    const badWeekday = structuredClone(syntheticConfiguration());
    badWeekday.meetingPatterns[0]!.isoWeekdays = [0, 8];
    expect(() => validateConfiguration(badWeekday)).toThrow();

    const equalTimes = structuredClone(syntheticConfiguration());
    equalTimes.meetingPatterns[0]!.endTime =
      equalTimes.meetingPatterns[0]!.startTime;
    expect(() => validateConfiguration(equalTimes)).toThrow();

    const duplicateDestination = structuredClone(syntheticConfiguration());
    duplicateDestination.destinations.push({
      ...duplicateDestination.destinations[0]!,
    });
    expect(() => validateConfiguration(duplicateDestination)).toThrow();
  });

  it("rejects invalid home references, coordinate boundaries, and term ordering", () => {
    const unknownHome = structuredClone(syntheticConfiguration());
    unknownHome.homeFallbackDestinationId = "unknown-home";
    expect(() => validateConfiguration(unknownHome)).toThrow();

    const longitude = structuredClone(syntheticConfiguration());
    longitude.destinations[0]!.longitude = -181;
    expect(() => validateConfiguration(longitude)).toThrow();

    const reversedTerm = structuredClone(syntheticConfiguration());
    reversedTerm.term.regularClassesEnd = "2030-01-01";
    expect(() => validateConfiguration(reversedTerm)).toThrow();
  });

  it("rejects unknown properties instead of silently stripping them", () => {
    const unknownField = {
      ...syntheticConfiguration(),
      unexpectedExecutableContent: "ignored only by unsafe parsers",
    };
    expect(() => validateConfiguration(unknownField)).toThrow();
  });
});
