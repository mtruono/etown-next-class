import type { AppConfiguration } from "../src/domain/types";
import { buildAppleMapsUrl } from "../src/routes/appleMaps";
import {
  buildConcept3dLiveMapUrl,
  buildConcept3dRouteUrl,
  buildConcept3dSearchUrl,
} from "../src/routes/concept3d";
import { buildGoogleMapsUrl } from "../src/routes/googleMaps";
import { toRouteDestination } from "../src/routes/routeService";
import type { RouteOrigin } from "../src/routes/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkCard(title: string, url: string, details: string[]): string {
  return `<article><h2>${escapeHtml(title)}</h2>${details.map((detail) => `<p>${escapeHtml(detail)}</p>`).join("")}<p class="url">${escapeHtml(url)}</p><p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open link</a></p></article>`;
}

export function buildRouteVerificationPage(
  configuration: AppConfiguration,
  routePairs: Array<[string, string]>,
): string {
  const destinations = new Map(
    configuration.destinations.map((destination) => [
      destination.id,
      destination,
    ]),
  );
  const cards: string[] = [];
  for (const [originId, destinationId] of routePairs) {
    const originDestination = destinations.get(originId);
    const destination = destinations.get(destinationId);
    if (!originDestination || !destination)
      throw new Error("Route pair references an unknown destination");
    const origin: RouteOrigin = {
      latitude: originDestination.latitude,
      longitude: originDestination.longitude,
      name: `${originDestination.displayName}${originId === configuration.homeFallbackDestinationId ? ", approximate" : ""}`,
    };
    const routeDestination = toRouteDestination(destination);
    const details = [
      `Origin: ${originDestination.displayName} (${origin.latitude}, ${origin.longitude})`,
      `Origin confidence: ${originDestination.confidence}; ${originDestination.navigationNote}`,
      `Destination: ${destination.displayName} (${destination.latitude}, ${destination.longitude})`,
      `Destination confidence: ${destination.confidence}; ${destination.navigationNote}`,
    ];
    cards.push(
      linkCard(
        `${originDestination.displayName} to ${destination.displayName} — Campus map`,
        buildConcept3dRouteUrl(
          configuration.campus.concept3dMapId,
          origin,
          routeDestination,
        ),
        details,
      ),
      linkCard(
        `${originDestination.displayName} to ${destination.displayName} — Apple Maps`,
        buildAppleMapsUrl(origin, routeDestination),
        details,
      ),
      linkCard(
        `${originDestination.displayName} to ${destination.displayName} — Google Maps`,
        buildGoogleMapsUrl(origin, routeDestination),
        details,
      ),
    );
  }
  for (const destination of configuration.destinations) {
    cards.push(
      linkCard(
        `${destination.displayName} — Official map search`,
        buildConcept3dSearchUrl(
          configuration.campus.concept3dMapId,
          destination.campusMapSearchKey,
        ),
        [
          `Coordinates: ${destination.latitude}, ${destination.longitude}`,
          `Confidence: ${destination.confidence}; ${destination.navigationNote}`,
        ],
      ),
    );
  }
  cards.push(
    linkCard(
      "Live campus map",
      buildConcept3dLiveMapUrl(configuration.campus.concept3dMapId),
      [
        "Documented mobile blue-dot mode. Route combination is intentionally not attempted.",
      ],
    ),
  );

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private route verification</title><style>body{font:16px system-ui;max-width:900px;margin:auto;padding:2rem;background:#f4f4f4;color:#17202a}article{background:white;padding:1rem;margin:1rem 0;border-radius:.5rem}.url{overflow-wrap:anywhere;font-family:monospace}a{display:inline-block;padding:.75rem;background:#17324d;color:white}</style></head><body><h1>Private route verification</h1><p>Opening a URL does not verify a path, entrance, room, or live blue-dot behavior. All supplied pins are building-level approximations.</p>${cards.join("")}</body></html>`;
}
