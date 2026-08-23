import { expect, test } from "@playwright/test";

import {
  importSyntheticSchedule,
  installSyntheticGeolocation,
} from "./helpers";

test("location is requested only after a route action and links require a second tap", async ({
  page,
}) => {
  await installSyntheticGeolocation(page);
  await importSyntheticSchedule(page);
  expect(
    await page.evaluate(
      () => (window as Window & { __geoCalls?: number }).__geoCalls,
    ),
  ).toBe(0);

  await page
    .getByRole("button", { name: /Directions to Example Science Center/u })
    .click();
  expect(
    await page.evaluate(
      () => (window as Window & { __geoCalls?: number }).__geoCalls,
    ),
  ).toBe(1);

  const campusLink = page.getByRole("link", {
    name: /Etown Campus Map walking directions/u,
  });
  await expect(campusLink).toBeVisible();
  await expect(campusLink).toHaveAttribute("href", /type:walking;ada:false/u);
  await expect(page.getByText("Room A12")).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("denied location provides explicit fallbacks", async ({ page }) => {
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
  await importSyntheticSchedule(page);
  await page
    .getByRole("button", { name: /Directions to Example Science Center/u })
    .click();
  await expect(
    page.getByRole("heading", { name: "Location was not available" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview from Founders B" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open destination without a starting point",
    }),
  ).toBeVisible();
});
