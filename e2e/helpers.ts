import type { Page } from "@playwright/test";

export async function openPublicSchedule(
  page: Page,
  instant = new Date("2026-08-23T16:00:00Z"),
): Promise<void> {
  await page.clock.install({ time: instant });
  await page.goto("/");
  await page.getByRole("heading", { name: "Etown Next Class" }).waitFor();
}

export async function installCampusGeolocation(page: Page): Promise<void> {
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
              latitude: 40.1503,
              longitude: -76.5917,
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
