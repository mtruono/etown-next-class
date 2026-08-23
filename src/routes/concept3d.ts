import { assertCoordinate } from "../domain/distance";
import type { RouteDestination, RouteOrigin, RouteProvider } from "./types";

export const ENABLE_EXPERIMENTAL_CONCEPT3D_FLS_ROUTE = false;

function safeLabel(value: string): string {
  return value.replaceAll(";", ",").replaceAll("\r", " ").replaceAll("\n", " ");
}

function destinationLabel(destination: RouteDestination): string {
  return destination.room
    ? `${destination.buildingName}, Room ${destination.room}`
    : destination.buildingName;
}

export function buildConcept3dRouteUrl(
  mapId: string,
  origin: RouteOrigin,
  destination: RouteDestination,
): string {
  if (!/^\d+$/u.test(mapId))
    throw new Error("Concept3D map ID must be numeric.");
  assertCoordinate(origin, "Route origin");
  assertCoordinate(destination, "Route destination");
  if (
    !Number.isFinite(destination.level) ||
    !Number.isInteger(destination.level)
  ) {
    throw new RangeError("Destination level must be a finite integer.");
  }

  return (
    `https://map.concept3d.com/?id=${mapId}#?d/type:walking;ada:false;` +
    `from:${origin.latitude},${origin.longitude},0;` +
    `to:${destination.latitude},${destination.longitude},${destination.level};` +
    `startName:${encodeURIComponent(safeLabel(origin.name))};` +
    `endName:${encodeURIComponent(safeLabel(destinationLabel(destination)))}`
  );
}

export function buildConcept3dSearchUrl(
  mapId: string,
  searchKey: string,
): string {
  if (!/^\d+$/u.test(mapId))
    throw new Error("Concept3D map ID must be numeric.");
  return `https://map.concept3d.com/?id=${mapId}#!s/key=${encodeURIComponent(safeLabel(searchKey))}`;
}

export function buildConcept3dLiveMapUrl(mapId: string): string {
  if (!/^\d+$/u.test(mapId))
    throw new Error("Concept3D map ID must be numeric.");
  return `https://map.concept3d.com/?id=${mapId}#!fls/`;
}

export function createConcept3dProvider(mapId: string): RouteProvider {
  return {
    id: "concept3d",
    label: "Etown Campus Map",
    supportsOffCampusOrigin: false,
    buildUrl(origin, destination) {
      return origin
        ? buildConcept3dRouteUrl(mapId, origin, destination)
        : buildConcept3dSearchUrl(mapId, destination.campusMapSearchKey);
    },
  };
}
