import { expect, test } from "@playwright/test";

import { EXTERNAL_PROVIDER_STORAGE_KEY } from "../src/storage/preferenceStore";
import { syntheticConfiguration } from "../tests/fixtures/syntheticConfiguration";
import {
  installDeniedGeolocation,
  installGeolocation,
  openAssistant,
} from "./helpers";

test("next class and both navigation actions fit in the first phone viewport", async ({
  page,
}) => {
  await openAssistant(page);
  await expect(
    page.getByRole("heading", { name: "Fictional Field Biology" }),
  ).toBeVisible();
  const classButton = page.getByRole("button", {
    name: /Take me to Example Science/u,
  });
  const homeButton = page.getByRole("button", { name: /Take me home to/u });
  await expect(classButton).toBeVisible();
  await expect(homeButton).toBeVisible();
  const positions = await Promise.all([
    classButton.boundingBox(),
    homeButton.boundingBox(),
    page.evaluate(() => window.innerHeight),
  ]);
  expect(positions[0]!.y + positions[0]!.height).toBeLessThanOrEqual(
    positions[2],
  );
  expect(positions[1]!.y + positions[1]!.height).toBeLessThanOrEqual(
    positions[2],
  );
});

test("Take me home remains available during class, after class, and on no-class days", async ({
  page,
}) => {
  for (const instant of [
    new Date("2030-01-07T14:30:00Z"),
    new Date("2030-01-07T22:00:00Z"),
    new Date("2030-01-09T17:00:00Z"),
  ]) {
    await openAssistant(page, instant);
    await expect(
      page.getByRole("button", { name: /Take me home to/u }),
    ).toBeVisible();
    await page.evaluate(() => localStorage.clear());
  }
});

test("on-campus home navigation opens a real Concept3D walking route", async ({
  page,
}) => {
  await installGeolocation(page);
  await page.route("https://map.concept3d.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Map handoff</title>",
    }),
  );
  await openAssistant(page);
  const navigation = page.waitForURL(/map\.concept3d\.com/u);
  await page.getByRole("button", { name: /Take me home to/u }).click();
  await navigation;
  const url = decodeURIComponent(page.url());
  expect(url).toContain("type:walking");
  expect(url).toContain("Example Residence");
});

test("off-campus home navigation opens the selected external map without origin", async ({
  page,
}) => {
  await installGeolocation(page, { latitude: 40.2, longitude: -75.16 });
  await page.route("https://www.google.com/maps/**", (route) => route.abort());
  await openAssistant(page, undefined, undefined, {
    [EXTERNAL_PROVIDER_STORAGE_KEY]: "google",
  });
  const request = page.waitForRequest((candidate) =>
    candidate.url().startsWith("https://www.google.com/maps/"),
  );
  await page.getByRole("button", { name: /Take me home to/u }).click();
  const url = new URL((await request).url());
  expect(url.searchParams.has("origin")).toBe(false);
  expect(url.searchParams.get("travelmode")).toBe("walking");
});

test("denied location still hands class navigation to an actionable external map", async ({
  page,
}) => {
  await installDeniedGeolocation(page);
  await page.route("https://www.google.com/maps/**", (route) => route.abort());
  await openAssistant(page, undefined, undefined, {
    [EXTERNAL_PROVIDER_STORAGE_KEY]: "google",
  });
  const request = page.waitForRequest((candidate) =>
    candidate.url().startsWith("https://www.google.com/maps/"),
  );
  await page
    .getByRole("button", { name: /Take me to Example Science/u })
    .click();
  const url = new URL((await request).url());
  expect(url.searchParams.has("origin")).toBe(false);
  expect(url.searchParams.get("destination")).toBeTruthy();
});

test("class navigation uses the correct configured destination", async ({
  page,
}) => {
  await installGeolocation(page);
  await page.route("https://map.concept3d.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Map handoff</title>",
    }),
  );
  await openAssistant(page);
  const navigation = page.waitForURL(/map\.concept3d\.com/u);
  await page
    .getByRole("button", { name: /Take me to Example Science/u })
    .click();
  await navigation;
  expect(decodeURIComponent(page.url())).toContain("Room A12");
});

test("same-building transition keeps a small elsewhere action", async ({
  page,
}) => {
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
  await openAssistant(page, new Date("2030-01-07T15:30:00Z"), configuration);
  await expect(page.getByText(/Stay in Example Science Center/u)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I’m somewhere else" }),
  ).toBeVisible();
});

test("daily and weekly schedules start collapsed and open accessibly", async ({
  page,
}) => {
  await openAssistant(page);
  const today = page.getByText("Today’s schedule", { exact: true });
  const week = page.getByText("This week", { exact: true });
  await expect(page.locator("details.schedule-disclosure[open]")).toHaveCount(
    0,
  );
  await today.click();
  await expect(
    page.locator("details.schedule-disclosure").first(),
  ).toHaveAttribute("open", "");
  await week.click();
  await expect(
    page.locator("details.schedule-disclosure").nth(1),
  ).toHaveAttribute("open", "");
});
