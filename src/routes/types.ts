import type { RouteProviderId } from "../domain/types";

export interface RouteOrigin {
  latitude: number;
  longitude: number;
  name: string;
}

export interface RouteDestination {
  latitude: number;
  longitude: number;
  level: number;
  buildingName: string;
  room?: string;
  campusMapSearchKey: string;
}

export interface RouteProvider {
  id: RouteProviderId;
  label: string;
  supportsOffCampusOrigin: boolean;
  buildUrl(origin: RouteOrigin | null, destination: RouteDestination): string;
}
