import type { Page } from "@playwright/test";

import type { AppConfiguration } from "../src/domain/types";
import { encodeSetupCode } from "../src/import/setupCode";
import { syntheticConfiguration } from "../tests/fixtures/syntheticConfiguration";

export async function importSyntheticSchedule(
  page: Page,
  configuration: AppConfiguration = syntheticConfiguration(),
): Promise<void> {
  const code = await encodeSetupCode(configuration);
  await page.goto("/");
  await page.getByLabel("Private setup code").fill(code);
  await page.getByRole("button", { name: "Review setup code" }).click();
  await page
    .getByRole("button", { name: "Save schedule on this device" })
    .click();
  await page.getByRole("heading", { name: "Etown Next Class" }).waitFor();
}

export async function installSyntheticGeolocation(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const testWindow = window as Window & { __geoCalls?: number };
    testWindow.__geoCalls = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          testWindow.__geoCalls = (testWindow.__geoCalls ?? 0) + 1;
          success({
            coords: {
              latitude: 39.95,
              longitude: -75.16,
              accuracy: 20,
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
  });
}
