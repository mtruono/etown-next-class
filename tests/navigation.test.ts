import { Temporal } from "@js-temporal/polyfill";

import type { ExpandedMeeting } from "../src/domain/types";
import {
  createClassNavigationTarget,
  createHomeNavigationTarget,
} from "../src/navigation/navigationTarget";
import {
  automaticExternalProvider,
  selectRouteProvider,
} from "../src/navigation/providerSelection";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

const meeting: ExpandedMeeting = {
  id: "fictional",
  patternId: "fictional",
  courseCode: "BIO201X",
  title: "Fictional Field Biology",
  campusDate: "2030-01-07",
  startTime: "09:00",
  endTime: "10:15",
  start: Temporal.ZonedDateTime.from(
    "2030-01-07T09:00:00-05:00[America/New_York]",
  ),
  end: Temporal.ZonedDateTime.from(
    "2030-01-07T10:15:00-05:00[America/New_York]",
  ),
  destinationId: "sample-science",
  room: "A12",
  modality: "in-person",
};

describe("navigation targets and providers", () => {
  it("creates class and home targets from configuration", () => {
    const configuration = syntheticConfiguration();
    expect(
      createClassNavigationTarget(meeting, configuration.destinations[1]!),
    ).toEqual({
      kind: "class",
      destinationId: "sample-science",
      displayLabel: "Example Science Center",
      room: "A12",
      courseCode: "BIO201X",
    });
    expect(createHomeNavigationTarget(configuration)).toEqual({
      kind: "home",
      destinationId: configuration.homeFallbackDestinationId,
      displayLabel: "Example Residence",
    });
  });

  it("selects Apple on iOS and Google on Android or other platforms", () => {
    expect(
      automaticExternalProvider("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)"),
    ).toBe("apple");
    expect(automaticExternalProvider("Mozilla/5.0 (Linux; Android 15)")).toBe(
      "google",
    );
    expect(automaticExternalProvider("Mozilla/5.0 (Windows NT 10.0)")).toBe(
      "google",
    );
  });

  it("honors campus and external overrides", () => {
    expect(
      selectRouteProvider(
        "on-campus",
        { campus: "concept3d", external: "auto" },
        "iPhone",
      ),
    ).toBe("concept3d");
    expect(
      selectRouteProvider(
        "on-campus",
        { campus: "external", external: "google" },
        "iPhone",
      ),
    ).toBe("google");
    expect(
      selectRouteProvider(
        "off-campus",
        { campus: "concept3d", external: "apple" },
        "Android",
      ),
    ).toBe("apple");
    expect(
      selectRouteProvider(
        "low-accuracy",
        { campus: "concept3d", external: "google" },
        "iPhone",
      ),
    ).toBe("google");
  });
});
