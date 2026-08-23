import { expect, test } from "@playwright/test";

import { syntheticConfiguration } from "../tests/fixtures/syntheticConfiguration";
import {
  importSyntheticSchedule,
  installSyntheticGeolocation,
} from "./helpers";

test("next class is prominent before the fictional term", async ({ page }) => {
  await importSyntheticSchedule(page);
  const nextCard = page.locator(".class-card-primary");
  await expect(nextCard.getByText("Next class")).toBeVisible();
  await expect(nextCard.getByText("BIO201X")).toBeVisible();
  await expect(nextCard.getByText("Example Science Center")).toBeVisible();
  await expect(nextCard.getByText("Room A12")).toBeVisible();
});

test("same-building transition keeps outdoor directions secondary", async ({
  page,
}) => {
  await installSyntheticGeolocation(page);
  await page.clock.install({ time: new Date("2030-01-07T15:30:00Z") });
  const configuration = syntheticConfiguration();
  configuration.meetingPatterns.push({
    id: "chem220x-m",
    courseCode: "CHEM220X",
    title: "Invented Chemistry",
    isoWeekdays: [1],
    startTime: "11:00",
    endTime: "12:00",
    destinationId: "sample-science",
    room: "C21",
    defaultModality: "in-person",
  });
  await importSyntheticSchedule(page, configuration);
  await expect(page.getByText(/both in Example Science Center/u)).toBeVisible();
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

test("virtual replacement occurrence has no walking action", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2030-01-10T17:00:00Z") });
  await importSyntheticSchedule(page);
  await expect(page.getByText(/Virtual Tuesday schedule/u)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Directions to/u }),
  ).toHaveCount(0);
});
