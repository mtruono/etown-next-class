import {
  bearingDegrees,
  campusGuidance,
  compassDirection,
  createCampusOrientationMap,
  mapBounds,
  projectCoordinate,
} from "../src/map/campusMap";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

describe("in-app campus orientation map", () => {
  it("calculates deterministic bearings and compass labels", () => {
    const origin = { latitude: 40, longitude: -76 };
    expect(
      bearingDegrees(origin, { latitude: 41, longitude: -76 }),
    ).toBeCloseTo(0, 6);
    expect(
      bearingDegrees(origin, { latitude: 40, longitude: -75 }),
    ).toBeCloseTo(89.68, 1);
    expect(compassDirection(0)).toBe("north");
    expect(compassDirection(90)).toBe("east");
    expect(compassDirection(225)).toBe("southwest");
  });

  it("projects every coordinate inside the plot area", () => {
    const coordinates = [
      { latitude: 40.1, longitude: -76.2 },
      { latitude: 40.2, longitude: -76.1 },
      { latitude: 40.15, longitude: -76.15 },
    ];
    const bounds = mapBounds(coordinates, 40.15);
    for (const coordinate of coordinates) {
      const point = projectCoordinate(coordinate, bounds);
      expect(point.x).toBeGreaterThanOrEqual(34);
      expect(point.x).toBeLessThanOrEqual(326);
      expect(point.y).toBeGreaterThanOrEqual(50);
      expect(point.y).toBeLessThanOrEqual(366);
    }
  });

  it("reports straight-line distance without calling it a route", () => {
    const guidance = campusGuidance(
      { latitude: 40.1503, longitude: -76.5917 },
      { latitude: 40.15085, longitude: -76.59345 },
    );
    expect(guidance.distanceMeters).toBeGreaterThan(100);
    expect(guidance.distanceMeters).toBeLessThan(200);
    expect(guidance.compassDirection).toBe("west");
  });

  it("creates an accessible local SVG with no links or remote imagery", () => {
    const configuration = syntheticConfiguration();
    const destination = configuration.destinations[1]!;
    const map = createCampusOrientationMap(configuration, destination, "A12", {
      latitude: 39.95,
      longitude: -75.16,
      name: "You are here",
    });
    expect(map.getAttribute("role")).toBe("img");
    expect(map.querySelector("title")?.textContent).toContain("Room A12");
    expect(map.querySelector("desc")?.textContent).toContain(
      "not a verified walking route",
    );
    expect(map.querySelector("image")).toBeNull();
    expect(map.querySelector("a")).toBeNull();
    expect(map.textContent).toContain("Example Science Center");
  });
});
