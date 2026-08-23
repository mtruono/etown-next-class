import { assertCoordinate } from "../domain/distance";
import type { RouteDestination, RouteOrigin, RouteProvider } from "./types";

export function buildAppleMapsUrl(
  origin: RouteOrigin | null,
  destination: RouteDestination,
): string {
  assertCoordinate(destination, "Route destination");
  if (origin) assertCoordinate(origin, "Route origin");
  const url = new URL("https://maps.apple.com/");
  if (origin)
    url.searchParams.set("saddr", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set(
    "daddr",
    `${destination.latitude},${destination.longitude}`,
  );
  url.searchParams.set("dirflg", "w");
  return url.toString();
}

export const appleMapsProvider: RouteProvider = {
  id: "apple",
  label: "Apple Maps",
  supportsOffCampusOrigin: true,
  buildUrl: buildAppleMapsUrl,
};
