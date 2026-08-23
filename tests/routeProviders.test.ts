import { appleMapsProvider, buildAppleMapsUrl } from "../src/routes/appleMaps";
import {
  buildConcept3dLiveMapUrl,
  buildConcept3dRouteUrl,
  buildConcept3dSearchUrl,
  createConcept3dProvider,
  ENABLE_EXPERIMENTAL_CONCEPT3D_FLS_ROUTE,
} from "../src/routes/concept3d";
import {
  buildGoogleMapsUrl,
  googleMapsProvider,
} from "../src/routes/googleMaps";
import type { RouteDestination, RouteOrigin } from "../src/routes/types";

const origin: RouteOrigin = {
  latitude: 39.95,
  longitude: -75.16,
  name: "Start;inject:value",
};
const destination: RouteDestination = {
  latitude: 39.951,
  longitude: -75.159,
  level: 2,
  buildingName: "Science;Center",
  room: "A 12",
  campusMapSearchKey: "Science Center",
};

describe("route providers", () => {
  it("builds an exact safe Concept3D walking route", () => {
    const url = buildConcept3dRouteUrl("999", origin, destination);
    expect(url).toContain(
      "https://map.concept3d.com/?id=999#?d/type:walking;ada:false;",
    );
    expect(url).toContain("from:39.95,-75.16,0;");
    expect(url).toContain("to:39.951,-75.159,2;");
    expect(url).toContain("startName:Start%2Cinject%3Avalue;");
    expect(url).toContain("endName:Science%2CCenter%2C%20Room%20A%2012");
    expect(url).not.toContain(";inject:");
  });

  it("keeps documented search and live map syntax separate", () => {
    expect(buildConcept3dSearchUrl("999", "Science Hall")).toBe(
      "https://map.concept3d.com/?id=999#!s/key=Science%20Hall",
    );
    expect(buildConcept3dLiveMapUrl("999")).toBe(
      "https://map.concept3d.com/?id=999#!fls/",
    );
    expect(ENABLE_EXPERIMENTAL_CONCEPT3D_FLS_ROUTE).toBe(false);
    expect(
      createConcept3dProvider("999").buildUrl(null, destination),
    ).toContain("#!s/key=");
    expect(createConcept3dProvider("999").supportsOffCampusOrigin).toBe(false);
    expect(appleMapsProvider.supportsOffCampusOrigin).toBe(true);
    expect(googleMapsProvider.supportsOffCampusOrigin).toBe(true);
  });

  it("builds Google walking URLs with and without origins", () => {
    const withOrigin = new URL(buildGoogleMapsUrl(origin, destination));
    expect(withOrigin.searchParams.get("api")).toBe("1");
    expect(withOrigin.searchParams.get("origin")).toBe("39.95,-75.16");
    expect(withOrigin.searchParams.get("destination")).toBe("39.951,-75.159");
    expect(withOrigin.searchParams.get("travelmode")).toBe("walking");
    expect(withOrigin.searchParams.get("dir_action")).toBe("navigate");
    expect(
      new URL(buildGoogleMapsUrl(null, destination)).searchParams.has("origin"),
    ).toBe(false);
  });

  it("builds Apple walking URLs with and without origins", () => {
    const withOrigin = new URL(buildAppleMapsUrl(origin, destination));
    expect(withOrigin.searchParams.get("saddr")).toBe("39.95,-75.16");
    expect(withOrigin.searchParams.get("daddr")).toBe("39.951,-75.159");
    expect(withOrigin.searchParams.get("dirflg")).toBe("w");
    expect(
      new URL(buildAppleMapsUrl(null, destination)).searchParams.has("saddr"),
    ).toBe(false);
  });

  it("rejects non-finite and out-of-range coordinates", () => {
    expect(() =>
      buildAppleMapsUrl({ ...origin, latitude: Number.NaN }, destination),
    ).toThrow(RangeError);
    expect(() =>
      buildGoogleMapsUrl(origin, { ...destination, longitude: 181 }),
    ).toThrow(RangeError);
    expect(() =>
      buildConcept3dRouteUrl("999", { ...origin, latitude: 91 }, destination),
    ).toThrow(RangeError);
  });
});
