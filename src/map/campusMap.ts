import { assertCoordinate, haversineDistanceMeters } from "../domain/distance";
import type {
  AppConfiguration,
  Coordinate,
  Destination,
} from "../domain/types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const VIEWBOX_WIDTH = 360;
const VIEWBOX_HEIGHT = 420;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 326;
const PLOT_TOP = 50;
const PLOT_BOTTOM = 366;

export interface CampusMapOrigin extends Coordinate {
  name: string;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface CampusMapBounds {
  minX: number;
  maxX: number;
  minLatitude: number;
  maxLatitude: number;
  longitudeScale: number;
}

export interface CampusGuidance {
  distanceMeters: number;
  bearingDegrees: number;
  compassDirection: string;
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NAMESPACE, tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  return node;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function bearingDegrees(
  origin: Coordinate,
  destination: Coordinate,
): number {
  assertCoordinate(origin, "Origin");
  assertCoordinate(destination, "Destination");
  const firstLatitude = toRadians(origin.latitude);
  const secondLatitude = toRadians(destination.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(secondLatitude);
  const x =
    Math.cos(firstLatitude) * Math.sin(secondLatitude) -
    Math.sin(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.cos(longitudeDelta);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function compassDirection(degrees: number): string {
  if (!Number.isFinite(degrees)) throw new RangeError("Bearing must be finite");
  const directions = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
  ];
  const normalized = ((degrees % 360) + 360) % 360;
  return directions[Math.round(normalized / 45) % directions.length]!;
}

export function campusGuidance(
  origin: Coordinate,
  destination: Coordinate,
): CampusGuidance {
  const bearing = bearingDegrees(origin, destination);
  return {
    distanceMeters: haversineDistanceMeters(origin, destination),
    bearingDegrees: bearing,
    compassDirection: compassDirection(bearing),
  };
}

export function mapBounds(
  coordinates: readonly Coordinate[],
  centerLatitude: number,
): CampusMapBounds {
  if (!coordinates.length)
    throw new Error("At least one map point is required");
  coordinates.forEach((coordinate) => assertCoordinate(coordinate));
  const longitudeScale = Math.cos(toRadians(centerLatitude));
  const xValues = coordinates.map(
    ({ longitude }) => longitude * longitudeScale,
  );
  const latitudes = coordinates.map(({ latitude }) => latitude);
  const rawMinX = Math.min(...xValues);
  const rawMaxX = Math.max(...xValues);
  const rawMinLatitude = Math.min(...latitudes);
  const rawMaxLatitude = Math.max(...latitudes);
  const xPadding = Math.max((rawMaxX - rawMinX) * 0.16, 0.00018);
  const latitudePadding = Math.max(
    (rawMaxLatitude - rawMinLatitude) * 0.16,
    0.00018,
  );
  return {
    minX: rawMinX - xPadding,
    maxX: rawMaxX + xPadding,
    minLatitude: rawMinLatitude - latitudePadding,
    maxLatitude: rawMaxLatitude + latitudePadding,
    longitudeScale,
  };
}

export function projectCoordinate(
  coordinate: Coordinate,
  bounds: CampusMapBounds,
): MapPoint {
  assertCoordinate(coordinate);
  const xValue = coordinate.longitude * bounds.longitudeScale;
  const xRatio = (xValue - bounds.minX) / (bounds.maxX - bounds.minX);
  const yRatio =
    (bounds.maxLatitude - coordinate.latitude) /
    (bounds.maxLatitude - bounds.minLatitude);
  return {
    x: PLOT_LEFT + xRatio * (PLOT_RIGHT - PLOT_LEFT),
    y: PLOT_TOP + yRatio * (PLOT_BOTTOM - PLOT_TOP),
  };
}

function labelOffset(destination: Destination, index: number): MapPoint {
  const knownOffsets: Record<string, MapPoint> = {
    "founders-b": { x: -8, y: 27 },
    nicarry: { x: -82, y: -18 },
    steinman: { x: 18, y: 28 },
    esbenshade: { x: 16, y: -18 },
  };
  return (
    knownOffsets[destination.id] ?? {
      x: index % 2 === 0 ? 15 : -76,
      y: index % 3 === 0 ? -16 : 25,
    }
  );
}

function buildingMarker(
  destination: Destination,
  point: MapPoint,
  index: number,
  isDestination: boolean,
): SVGGElement {
  const group = svgElement("g", {
    class: isDestination
      ? "map-building map-building-destination"
      : "map-building",
    "aria-label": `${destination.displayName}${isDestination ? ", destination" : ""}`,
  });
  if (isDestination) {
    group.append(
      svgElement("circle", {
        class: "map-destination-ring",
        cx: String(point.x),
        cy: String(point.y),
        r: "15",
      }),
    );
  }
  group.append(
    svgElement("rect", {
      x: String(point.x - 7),
      y: String(point.y - 7),
      width: "14",
      height: "14",
      rx: "3",
    }),
  );
  const offset = labelOffset(destination, index);
  const text = svgElement("text", {
    x: String(point.x + offset.x),
    y: String(point.y + offset.y),
  });
  text.textContent = destination.displayName;
  group.append(text);
  return group;
}

export function createCampusOrientationMap(
  configuration: AppConfiguration,
  destination: Destination,
  room: string,
  origin: CampusMapOrigin | null,
): SVGSVGElement {
  const plottedCoordinates: Coordinate[] = [
    configuration.campus.campusCenter,
    ...configuration.destinations,
  ];
  if (origin) plottedCoordinates.push(origin);
  const bounds = mapBounds(
    plottedCoordinates,
    configuration.campus.campusCenter.latitude,
  );
  const svg = svgElement("svg", {
    class: "campus-map",
    viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
    role: "img",
    "aria-labelledby": "campus-map-title campus-map-description",
  });
  const title = svgElement("title", { id: "campus-map-title" });
  title.textContent = `Campus orientation to ${destination.displayName}, Room ${room}`;
  const description = svgElement("desc", { id: "campus-map-description" });
  description.textContent = origin
    ? `A schematic map with an approximate straight-line guide from ${origin.name} to the ${destination.displayName} building area. It is not a verified walking route.`
    : `A schematic map highlighting the approximate ${destination.displayName} building area. It does not show a verified walking route.`;
  svg.append(title, description);

  const background = svgElement("g", { class: "map-background" });
  background.append(
    svgElement("rect", {
      x: "12",
      y: "12",
      width: "336",
      height: "396",
      rx: "24",
    }),
  );
  for (const x of [76, 148, 220, 292]) {
    background.append(
      svgElement("line", {
        x1: String(x),
        y1: "34",
        x2: String(x),
        y2: "386",
      }),
    );
  }
  for (const y of [100, 180, 260, 340]) {
    background.append(
      svgElement("line", {
        x1: "28",
        y1: String(y),
        x2: "332",
        y2: String(y),
      }),
    );
  }
  const north = svgElement("g", { class: "north-arrow" });
  const northLabel = svgElement("text", { x: "312", y: "42" });
  northLabel.textContent = "N";
  north.append(
    svgElement("path", {
      d: "M318 68 L318 48 M318 48 L312 57 M318 48 L324 57",
    }),
    northLabel,
  );
  background.append(north);
  svg.append(background);

  const destinationPoint = projectCoordinate(destination, bounds);
  if (origin) {
    const originPoint = projectCoordinate(origin, bounds);
    const guide = svgElement("g", { class: "map-guide" });
    guide.append(
      svgElement("line", {
        x1: String(originPoint.x),
        y1: String(originPoint.y),
        x2: String(destinationPoint.x),
        y2: String(destinationPoint.y),
      }),
      svgElement("circle", {
        class: "map-origin-halo",
        cx: String(originPoint.x),
        cy: String(originPoint.y),
        r: "12",
      }),
      svgElement("circle", {
        class: "map-origin-dot",
        cx: String(originPoint.x),
        cy: String(originPoint.y),
        r: "6",
      }),
    );
    const originLabel = svgElement("text", {
      class: "map-origin-label",
      x: String(Math.min(originPoint.x + 12, 270)),
      y: String(Math.max(originPoint.y - 13, 34)),
    });
    originLabel.textContent = origin.name;
    guide.append(originLabel);
    svg.append(guide);
  }

  const buildings = svgElement("g", { class: "map-buildings" });
  configuration.destinations.forEach((candidate, index) => {
    buildings.append(
      buildingMarker(
        candidate,
        projectCoordinate(candidate, bounds),
        index,
        candidate.id === destination.id,
      ),
    );
  });
  svg.append(buildings);
  return svg;
}
