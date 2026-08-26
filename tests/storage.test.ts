import {
  CONFIGURATION_STORAGE_KEY,
  createConfigurationStore,
} from "../src/storage/configurationStore";
import {
  createPreferenceStore,
  LOCATION_CHECKIN_CONSENT_STORAGE_KEY,
  LOCATION_CHECKIN_CONSENT_VERSION,
  LOCATION_CHECKIN_DEVICE_ID_STORAGE_KEY,
  LOCATION_CHECKIN_ENABLED_STORAGE_KEY,
  PROVIDER_STORAGE_KEY,
} from "../src/storage/preferenceStore";
import { syntheticConfiguration } from "./fixtures/syntheticConfiguration";

describe("local storage adapters", () => {
  beforeEach(() => localStorage.clear());

  it("stores and restores only the parsed configuration", () => {
    const store = createConfigurationStore(localStorage);
    const configuration = syntheticConfiguration();
    store.save(configuration);
    expect(store.load()).toEqual(configuration);
    expect(localStorage.getItem(CONFIGURATION_STORAGE_KEY)).toBe(
      JSON.stringify(configuration),
    );
    expect(localStorage.getItem(CONFIGURATION_STORAGE_KEY)).not.toContain(
      "ETOWN1.",
    );
  });

  it("returns safely to an unconfigured state for corrupt stored data", () => {
    localStorage.setItem(CONFIGURATION_STORAGE_KEY, "not valid JSON");
    expect(createConfigurationStore(localStorage).load()).toBeNull();
    expect(localStorage.getItem(CONFIGURATION_STORAGE_KEY)).toBeNull();
  });

  it("erases all app-owned keys without touching unrelated origin data", () => {
    const configurationStore = createConfigurationStore(localStorage);
    configurationStore.save(syntheticConfiguration());
    createPreferenceStore(localStorage).setRouteProvider("apple");
    localStorage.setItem("unrelated.application", "keep");
    configurationStore.eraseAllAppData();
    expect(localStorage.getItem(CONFIGURATION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(PROVIDER_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("unrelated.application")).toBe("keep");
  });

  it("defaults an invalid provider to the campus map", () => {
    localStorage.setItem(PROVIDER_STORAGE_KEY, "arbitrary-provider");
    expect(createPreferenceStore(localStorage).getRouteProvider()).toBe(
      "concept3d",
    );
  });

  it("keeps exact-location check-ins off until current explicit consent", () => {
    const store = createPreferenceStore(localStorage);
    expect(store.getLocationCheckInEnabled()).toBe(false);
    localStorage.setItem(LOCATION_CHECKIN_ENABLED_STORAGE_KEY, "true");
    expect(store.getLocationCheckInEnabled()).toBe(false);
    store.setLocationCheckInEnabled(true);
    expect(store.getLocationCheckInEnabled()).toBe(true);
    expect(localStorage.getItem(LOCATION_CHECKIN_CONSENT_STORAGE_KEY)).toBe(
      LOCATION_CHECKIN_CONSENT_VERSION,
    );
    store.setLocationCheckInEnabled(false);
    expect(store.getLocationCheckInEnabled()).toBe(false);
  });

  it("creates a stable, non-personal location-check-in phone ID", () => {
    const store = createPreferenceStore(localStorage);
    const id = store.getOrCreateLocationCheckInDeviceId(
      () => "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    );
    expect(id).toBe("6ba7b810-9dad-41d1-80b4-00c04fd430c8");
    expect(localStorage.getItem(LOCATION_CHECKIN_DEVICE_ID_STORAGE_KEY)).toBe(
      id,
    );
    expect(store.getOrCreateLocationCheckInDeviceId(() => "different")).toBe(
      id,
    );
  });
});
