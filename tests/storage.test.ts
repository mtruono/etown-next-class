import {
  CONFIGURATION_STORAGE_KEY,
  createConfigurationStore,
} from "../src/storage/configurationStore";
import {
  createPreferenceStore,
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
});
