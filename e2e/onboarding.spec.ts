import { expect, test } from "@playwright/test";

import { openPublicSchedule } from "./helpers";

test("public link opens the schedule immediately with no setup screen", async ({
  page,
}) => {
  await openPublicSchedule(page);
  await expect(page.getByText("MA251B").first()).toBeVisible();
  await expect(page.getByText("Nicarry Hall").first()).toBeVisible();
  await expect(page.getByText("Room 202").first()).toBeVisible();
  await expect(page.getByLabel("Private setup code")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /setup code/iu })).toHaveCount(
    0,
  );
});

test("obsolete fragments are removed and never rendered", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-08-23T16:00:00Z") });
  await page.goto("/#setup=obsolete-private-value");
  await expect(page).not.toHaveURL(/#setup=/u);
  await expect(page.getByText("obsolete-private-value")).toHaveCount(0);
  await expect(page.getByText("MA251B").first()).toBeVisible();
});
