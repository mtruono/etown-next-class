import { expect, test } from "@playwright/test";

import { TELEMETRY_ENABLED_STORAGE_KEY } from "../src/storage/preferenceStore";
import { installGeolocation, openAssistant } from "./helpers";

test("ordinary public link opens the complete Fall 2026 schedule", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-08-24T13:00:00Z") });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "MA Probability and Statistics" }),
  ).toBeVisible();
  const primaryCard = page.locator(".assistant-card");
  await expect(primaryCard.getByText("Nicarry Hall")).toBeVisible();
  await expect(primaryCard.getByText("Room 202")).toBeVisible();
  await page.getByText("This week").click();
  await expect(page.getByText("CE Drawing I").first()).toBeVisible();
  await expect(
    page.getByText("Introduction to Health and Well-Being").first(),
  ).toBeVisible();
  await expect(
    page.getByText("FYS Journey Into Your First Year").first(),
  ).toBeVisible();
});

test("legacy setup fragments are discarded and do not gate the public schedule", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-08-24T13:00:00Z") });
  await page.goto("/#setup=broken");
  await expect(page).not.toHaveURL(/#setup=/u);
  await expect(
    page.getByRole("heading", { name: "MA Probability and Statistics" }),
  ).toBeVisible();
});

test("configured startup sends app-open telemetry without private details", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/__telemetry", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204, body: "" });
  });
  await openAssistant(page, undefined, undefined, undefined, true);
  await expect
    .poll(() => bodies.some((body) => body.includes("app_open")))
    .toBe(true);
  expect(bodies.join(" ")).not.toContain("Fictional Field Biology");
  expect(bodies.join(" ")).not.toContain("A12");
});

test("Take me home sends only allowlisted telemetry dimensions", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/__telemetry", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204, body: "" });
  });
  const appOpenFinished = page.waitForResponse(
    (response) =>
      response.url().endsWith("/__telemetry") &&
      (response.request().postData() ?? "").includes("app_open"),
  );
  await installGeolocation(page);
  await page.route("https://map.concept3d.com/**", (route) => route.abort());
  await openAssistant(page, undefined, undefined, undefined, true);
  await appOpenFinished;
  await page.getByRole("button", { name: /Take me home to/u }).click();
  await expect
    .poll(() => bodies.some((body) => body.includes("take_me_home_tapped")))
    .toBe(true);
  const tap = JSON.parse(
    bodies.find((body) => body.includes("take_me_home_tapped"))!,
  ) as Record<string, unknown>;
  expect(tap).toMatchObject({ event: "take_me_home_tapped", target: "home" });
  expect(tap).not.toHaveProperty("destinationId");
  expect(tap).not.toHaveProperty("latitude");
});

test("telemetry-disabled mode sends no events", async ({ page }) => {
  let requests = 0;
  await page.route("**/__telemetry", async (route) => {
    requests += 1;
    await route.fulfill({ status: 204, body: "" });
  });
  await openAssistant(
    page,
    undefined,
    undefined,
    {
      [TELEMETRY_ENABLED_STORAGE_KEY]: "false",
    },
    true,
  );
  await page.waitForTimeout(150);
  expect(requests).toBe(0);
});
