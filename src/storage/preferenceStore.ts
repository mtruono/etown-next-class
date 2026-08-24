import type {
  CampusProviderPreference,
  ExternalProviderPreference,
  NavigationPreferences,
} from "../navigation/providerSelection";

export const CAMPUS_PROVIDER_STORAGE_KEY =
  "etown-next-class.preference.campus-provider.v1";
export const EXTERNAL_PROVIDER_STORAGE_KEY =
  "etown-next-class.preference.external-provider.v1";
export const PROVIDER_STORAGE_KEY = CAMPUS_PROVIDER_STORAGE_KEY;
export const TELEMETRY_ENABLED_STORAGE_KEY =
  "etown-next-class.preference.telemetry-enabled.v1";
const campusProviders = new Set<CampusProviderPreference>([
  "concept3d",
  "external",
]);
const externalProviders = new Set<ExternalProviderPreference>([
  "auto",
  "apple",
  "google",
]);

export interface PreferenceStore {
  getNavigationPreferences(): NavigationPreferences;
  setCampusProvider(provider: CampusProviderPreference): void;
  setExternalProvider(provider: ExternalProviderPreference): void;
  getTelemetryEnabled(): boolean;
  setTelemetryEnabled(enabled: boolean): void;
  getRouteProvider(): "concept3d" | "apple" | "google";
  setRouteProvider(provider: "concept3d" | "apple" | "google"): void;
}

export function createPreferenceStore(storage: Storage): PreferenceStore {
  return {
    getNavigationPreferences() {
      const campus = storage.getItem(
        CAMPUS_PROVIDER_STORAGE_KEY,
      ) as CampusProviderPreference | null;
      const external = storage.getItem(
        EXTERNAL_PROVIDER_STORAGE_KEY,
      ) as ExternalProviderPreference | null;
      return {
        campus: campus && campusProviders.has(campus) ? campus : "concept3d",
        external:
          external && externalProviders.has(external) ? external : "auto",
      };
    },
    setCampusProvider(provider) {
      if (!campusProviders.has(provider))
        throw new Error("Unknown campus provider");
      storage.setItem(CAMPUS_PROVIDER_STORAGE_KEY, provider);
    },
    setExternalProvider(provider) {
      if (!externalProviders.has(provider))
        throw new Error("Unknown external provider");
      storage.setItem(EXTERNAL_PROVIDER_STORAGE_KEY, provider);
    },
    getTelemetryEnabled() {
      return storage.getItem(TELEMETRY_ENABLED_STORAGE_KEY) !== "false";
    },
    setTelemetryEnabled(enabled) {
      storage.setItem(TELEMETRY_ENABLED_STORAGE_KEY, String(enabled));
    },
    getRouteProvider() {
      const preferences = this.getNavigationPreferences();
      return preferences.campus === "concept3d"
        ? "concept3d"
        : preferences.external === "apple"
          ? "apple"
          : "google";
    },
    setRouteProvider(provider) {
      if (provider === "concept3d") {
        this.setCampusProvider("concept3d");
      } else {
        this.setCampusProvider("external");
        this.setExternalProvider(provider);
      }
    },
  };
}
