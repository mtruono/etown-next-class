import { expect, test } from "@playwright/test";

import { installCampusGeolocation, openPublicSchedule } from "./helpers";

test("next class is prominent before the term", async ({ page }) => {
  await openPublicSchedule(page);
  const nextCard = page.locator(".class-card-primary");
  await expect(nextCard.getByText("Next class")).toBeVisible();
  await expect(nextCard.getByText("MA251B")).toBeVisible();
  await expect(
    nextCard.getByText("Nicarry Hall", { exact: true }),
  ).toBeVisible();
  await expect(nextCard.getByText("Room 202", { exact: true })).toBeVisible();
});

test("same-building transition keeps the campus guide secondary", async ({
  page,
}) => {
  await installCampusGeolocation(page);
  await openPublicSchedule(page, new Date("2026-08-26T15:55:00Z"));
  await expect(page.getByText(/both in Nicarry Hall/u)).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { __geoCalls?: number }).__geoCalls,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "I’m somewhere else, use my location" })
    .click();
  expect(
    await page.evaluate(
      () => (window as Window & { __geoCalls?: number }).__geoCalls,
    ),
  ).toBe(1);
});

test("virtual replacement occurrence has no campus-guide action", async ({
  page,
}) => {
  await openPublicSchedule(page, new Date("2026-11-25T17:00:00Z"));
  await expect(page.getByText(/Virtual Friday schedule/u)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Campus guide to/u }),
  ).toHaveCount(0);
});
