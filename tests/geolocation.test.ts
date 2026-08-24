import { Temporal } from "@js-temporal/polyfill";

import type { ExpandedMeeting } from "../src/domain/types";
import {
  GEOLOCATION_OPTIONS,
  requestCurrentPosition,
} from "../src/location/geolocation";
import {
  assessCapturedLocation,
  eligibleLastBuilding,
} from "../src/location/locationDecision";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

function mockGeolocation(
  implementation: (
    success: PositionCallback,
    error: PositionErrorCallback | null,
    options?: PositionOptions,
  ) => void,
): Geolocation {
  return {
    getCurrentPosition: vi.fn(implementation),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };
}

describe("geolocation", () => {
  it("reports unsupported browsers", async () => {
    await expect(requestCurrentPosition(undefined)).resolves.toMatchObject({
      ok: false,
      code: "unsupported",
    });
  });

  it("uses the required one-shot options and returns a valid position", async () => {
    const geolocation = mockGeolocation((success, _error, options) => {
      expect(options).toEqual(GEOLOCATION_OPTIONS);
      success({
        coords: {
          latitude: 39.951,
          longitude: -75.159,
          accuracy: 25,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 1,
        toJSON: () => ({}),
      });
    });
    await expect(requestCurrentPosition(geolocation)).resolves.toEqual({
      ok: true,
      position: { latitude: 39.951, longitude: -75.159, accuracyMeters: 25 },
    });
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it.each([
    [1, "permission-denied"],
    [2, "position-unavailable"],
    [3, "timeout"],
    [9, "unknown"],
  ])("maps error %s to %s", async (code, expected) => {
    const geolocation = mockGeolocation((_success, error) => {
      error?.({
        code,
        message: "synthetic error",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });
    await expect(requestCurrentPosition(geolocation)).resolves.toMatchObject({
      ok: false,
      code: expected,
    });
  });
});

describe("location decisions", () => {
  it("keeps low-accuracy, off-campus, and near flags independent", () => {
    const configuration = syntheticConfiguration();
    const destination = configuration.destinations[1]!;
    const lowNear = assessCapturedLocation(
      configuration,
      {
        latitude: destination.latitude,
        longitude: destination.longitude,
        accuracyMeters: 121,
      },
      destination,
    );
    expect(lowNear).toMatchObject({
      classification: "low-accuracy",
      lowAccuracy: true,
      offCampus: false,
      nearDestination: true,
    });
    const offCampus = assessCapturedLocation(
      configuration,
      { latitude: 40.2, longitude: -75.16, accuracyMeters: 20 },
      destination,
    );
    expect(offCampus.offCampus).toBe(true);
    expect(offCampus.classification).toBe("off-campus");
  });

  it("uses the documented conservative Etown fallback radius", () => {
    const configuration = syntheticConfiguration();
    configuration.campus.campusCenter = {
      latitude: 40.1503,
      longitude: -76.5917,
    };
    configuration.campus.onCampusRadiusMeters = 550;
    const destination = configuration.destinations[1]!;
    const onCampusPoints = [
      ["central campus", 40.1503, -76.5917],
      ["Founders", 40.14861, -76.58961],
      ["Nicarry", 40.15085, -76.59345],
      ["Steinman", 40.15045, -76.59336],
      ["Esbenshade", 40.15129, -76.59195],
    ] as const;
    for (const [, latitude, longitude] of onCampusPoints) {
      expect(
        assessCapturedLocation(
          configuration,
          { latitude, longitude, accuracyMeters: 25 },
          destination,
        ).classification,
      ).toBe("on-campus");
    }
    expect(
      assessCapturedLocation(
        configuration,
        { latitude: 40.156, longitude: -76.5917, accuracyMeters: 25 },
        destination,
      ).classification,
    ).toBe("off-campus");
    expect(
      assessCapturedLocation(
        configuration,
        { latitude: 40.2, longitude: -76.5917, accuracyMeters: 25 },
        destination,
      ).classification,
    ).toBe("off-campus");
  });

  it("offers last-building fallback only within three hours on the same day", () => {
    const configuration = syntheticConfiguration();
    const end = Temporal.ZonedDateTime.from(
      "2030-01-07T10:00:00-05:00[America/New_York]",
    );
    const meeting = {
      id: "synthetic",
      patternId: "synthetic",
      courseCode: "SYN100X",
      title: "Synthetic",
      campusDate: "2030-01-07",
      startTime: "09:00",
      endTime: "10:00",
      start: end.subtract({ hours: 1 }),
      end,
      destinationId: "sample-science",
      room: "A12",
      modality: "in-person",
    } satisfies ExpandedMeeting;
    expect(
      eligibleLastBuilding(
        meeting,
        end.add({ hours: 3 }),
        configuration.destinations,
      )?.id,
    ).toBe("sample-science");
    expect(
      eligibleLastBuilding(
        meeting,
        end.add({ hours: 3, nanoseconds: 1 }),
        configuration.destinations,
      ),
    ).toBeNull();
    expect(
      eligibleLastBuilding(
        { ...meeting, modality: "virtual" },
        end,
        configuration.destinations,
      ),
    ).toBeNull();
  });
});
