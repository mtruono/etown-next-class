import type { Page } from "@playwright/test";

import type { AppConfiguration } from "../src/domain/types";
import { CONFIGURATION_STORAGE_KEY } from "../src/storage/configurationStore";
import { syntheticConfiguration } from "../tests/fixtures/syntheticConfiguration";

export async function openAssistant(
  page: Page,
  instant = new Date("2030-01-07T13:00:00Z"),
  configuration: AppConfiguration = syntheticConfiguration(),
  preferences: Record<string, string> = {},
): Promise<void> {
  await page.clock.install({ time: instant });
  await page.addInitScript(
    ({ key, value, storedPreferences }) => {
      localStorage.setItem(key, value);
      for (const [preferenceKey, preferenceValue] of Object.entries(
        storedPreferences,
      )) {
        localStorage.setItem(preferenceKey, preferenceValue);
      }
    },
    {
      key: CONFIGURATION_STORAGE_KEY,
      value: JSON.stringify(configuration),
      storedPreferences: preferences,
    },
  );
  await page.goto("/");
  await page.getByRole("heading", { name: "Etown Campus Assistant" }).waitFor();
}

export async function installGeolocation(
  page: Page,
  position: { latitude: number; longitude: number; accuracy?: number } = {
    latitude: 39.95,
    longitude: -75.16,
  },
): Promise<void> {
  await page.addInitScript((mockPosition) => {
    const testWindow = window as Window & { __geoCalls?: number };
    testWindow.__geoCalls = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          testWindow.__geoCalls = (testWindow.__geoCalls ?? 0) + 1;
          success({
            coords: {
              latitude: mockPosition.latitude,
              longitude: mockPosition.longitude,
              accuracy: mockPosition.accuracy ?? 20,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          });
        },
      },
    });
  }, position);
}

export async function installDeniedGeolocation(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(
          _success: PositionCallback,
          error: PositionErrorCallback,
        ) {
          error({
            code: 1,
            message: "denied",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      },
    });
  });
}
