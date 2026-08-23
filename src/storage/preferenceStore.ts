import type { RouteProviderId } from "../domain/types";

export const PROVIDER_STORAGE_KEY =
  "etown-next-class.preference.route-provider.v1";
const validProviders = new Set<RouteProviderId>([
  "concept3d",
  "apple",
  "google",
]);

export interface PreferenceStore {
  getRouteProvider(): RouteProviderId;
  setRouteProvider(provider: RouteProviderId): void;
}

export function createPreferenceStore(storage: Storage): PreferenceStore {
  return {
    getRouteProvider() {
      const value = storage.getItem(
        PROVIDER_STORAGE_KEY,
      ) as RouteProviderId | null;
      return value && validProviders.has(value) ? value : "concept3d";
    },
    setRouteProvider(provider) {
      if (!validProviders.has(provider))
        throw new Error("Unknown route provider");
      storage.setItem(PROVIDER_STORAGE_KEY, provider);
    },
  };
}
