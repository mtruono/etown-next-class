import type {
  AppConfiguration,
  Destination,
  RouteProviderId,
} from "../domain/types";
import { appleMapsProvider } from "./appleMaps";
import {
  buildConcept3dLiveMapUrl,
  buildConcept3dSearchUrl,
  createConcept3dProvider,
} from "./concept3d";
import { googleMapsProvider } from "./googleMaps";
import type { RouteDestination, RouteOrigin, RouteProvider } from "./types";

export const ROUTE_BUILDING_WARNING =
  "The campus-map pin represents the building area, not the classroom or a verified entrance.";

export const ROUTE_CAPTURE_EXPLANATION =
  "The route starts from the location captured when you tapped. In the campus map, allow location and use its location control to display the live blue dot. Automatic rerouting is not guaranteed.";

export function toRouteDestination(
  destination: Destination,
  room?: string,
): RouteDestination {
  return {
    latitude: destination.latitude,
    longitude: destination.longitude,
    level: destination.level,
    buildingName: destination.displayName,
    room,
    campusMapSearchKey: destination.campusMapSearchKey,
  };
}

export function routeProviders(
  configuration: AppConfiguration,
): Record<RouteProviderId, RouteProvider> {
  return {
    concept3d: createConcept3dProvider(configuration.campus.concept3dMapId),
    apple: appleMapsProvider,
    google: googleMapsProvider,
  };
}

export function buildProviderUrl(
  configuration: AppConfiguration,
  providerId: RouteProviderId,
  origin: RouteOrigin | null,
  destination: RouteDestination,
): string {
  return routeProviders(configuration)[providerId].buildUrl(
    origin,
    destination,
  );
}

export function campusSearchUrl(
  configuration: AppConfiguration,
  destination: Destination,
): string {
  return buildConcept3dSearchUrl(
    configuration.campus.concept3dMapId,
    destination.campusMapSearchKey,
  );
}

export function liveCampusMapUrl(configuration: AppConfiguration): string {
  return buildConcept3dLiveMapUrl(configuration.campus.concept3dMapId);
}
