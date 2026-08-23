import { assertCoordinate } from "../domain/distance";
import type { RouteDestination, RouteOrigin, RouteProvider } from "./types";

export function buildGoogleMapsUrl(
  origin: RouteOrigin | null,
  destination: RouteDestination,
): string {
  assertCoordinate(destination, "Route destination");
  if (origin) assertCoordinate(origin, "Route origin");
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  if (origin)
    url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set(
    "destination",
    `${destination.latitude},${destination.longitude}`,
  );
  url.searchParams.set("travelmode", "walking");
  url.searchParams.set("dir_action", "navigate");
  return url.toString();
}

export const googleMapsProvider: RouteProvider = {
  id: "google",
  label: "Google Maps",
  supportsOffCampusOrigin: true,
  buildUrl: buildGoogleMapsUrl,
};
