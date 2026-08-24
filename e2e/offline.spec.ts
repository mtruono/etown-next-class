import { expect, test } from "@playwright/test";

import { openPublicSchedule } from "./helpers";

test("installed schedule remains readable offline", async ({
  context,
  page,
}) => {
  await openPublicSchedule(page);
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByText("MA251B").first()).toBeVisible();
  await expect(
    page.getByText(/schedule and in-app campus schematic still work/u),
  ).toBeVisible();
  await context.setOffline(false);
});
