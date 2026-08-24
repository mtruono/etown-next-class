import { expect, test } from "@playwright/test";

import { installCampusGeolocation, openPublicSchedule } from "./helpers";

test("location is requested only after Campus guide and stays in-app", async ({
  page,
}) => {
  await installCampusGeolocation(page);
  await openPublicSchedule(page);
  expect(
    await page.evaluate(
      () => (window as Window & { __geoCalls?: number }).__geoCalls,
    ),
  ).toBe(0);

  await page
    .getByRole("button", { name: /Campus guide to Nicarry Hall/u })
    .click();
  expect(
    await page.evaluate(
      () => (window as Window & { __geoCalls?: number }).__geoCalls,
    ),
  ).toBe(1);

  await expect(
    page.getByRole("img", { name: /Campus orientation to Nicarry Hall/u }),
  ).toBeVisible();
  await expect(page.getByText("Room 202", { exact: true })).toBeVisible();
  await expect(page.getByText(/straight line/u)).toBeVisible();
  await expect(page.locator("main a[href]")).toHaveCount(0);
  await expect(page).toHaveURL("/");
});

test("denied location provides in-app fallbacks", async ({ page }) => {
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
  await openPublicSchedule(page);
  await page
    .getByRole("button", { name: /Campus guide to Nicarry Hall/u })
    .click();
  await expect(
    page.getByRole("heading", { name: "Location was not available" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview from Founders B" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show only the destination" }),
  ).toBeVisible();
});
