import { haversineDistanceMeters } from "../src/domain/distance";

describe("haversine distance", () => {
  it("returns zero for identical points and is symmetric", () => {
    const first = { latitude: 39.95, longitude: -75.16 };
    const second = { latitude: 39.96, longitude: -75.17 };
    expect(haversineDistanceMeters(first, first)).toBe(0);
    expect(haversineDistanceMeters(first, second)).toBeCloseTo(
      haversineDistanceMeters(second, first),
      8,
    );
  });

  it("matches a known one-degree latitude distance", () => {
    expect(
      haversineDistanceMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 0 },
      ),
    ).toBeCloseTo(111_195, -1);
  });

  it("handles the antimeridian and rejects invalid bounds", () => {
    const distance = haversineDistanceMeters(
      { latitude: 0, longitude: 179.9 },
      { latitude: 0, longitude: -179.9 },
    );
    expect(distance).toBeLessThan(23_000);
    expect(() =>
      haversineDistanceMeters(
        { latitude: -91, longitude: 0 },
        { latitude: 0, longitude: 0 },
      ),
    ).toThrow(RangeError);
  });
});
