import { expect, test } from "@playwright/test";

import { importSyntheticSchedule } from "./helpers";

test("installed schedule remains readable offline", async ({
  context,
  page,
}) => {
  await importSyntheticSchedule(page);
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("BIO201X").first()).toBeVisible();
  await expect(
    page.getByText(
      /external walking directions require an internet connection/u,
    ),
  ).toBeVisible();
  await context.setOffline(false);
});
