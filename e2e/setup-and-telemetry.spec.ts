import { expect, test } from "@playwright/test";

import { encodeSetupCode } from "../src/import/setupCode";
import { CONFIGURATION_STORAGE_KEY } from "../src/storage/configurationStore";
import { TELEMETRY_ENABLED_STORAGE_KEY } from "../src/storage/preferenceStore";
import { syntheticConfiguration } from "../tests/fixtures/syntheticConfiguration";
import { installGeolocation, openAssistant } from "./helpers";

test("private setup link imports locally, scrubs the hash, and ordinary link works afterward", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2030-01-07T13:00:00Z") });
  const code = await encodeSetupCode(syntheticConfiguration());
  await page.goto(`/#setup=${encodeURIComponent(code)}`);
  await expect(page).not.toHaveURL(/#setup=/u);
  await expect(
    page.getByRole("heading", { name: "Fictional Field Biology" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => Boolean(localStorage.getItem(key)),
        CONFIGURATION_STORAGE_KEY,
      ),
    )
    .toBe(true);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Fictional Field Biology" }),
  ).toBeVisible();
});

test("invalid setup link shows the private-link recovery screen", async ({
  page,
}) => {
  await page.goto("/#setup=broken");
  await expect(page).not.toHaveURL(/#setup=/u);
  await expect(
    page.getByRole("heading", { name: "Open the private link you were sent" }),
  ).toBeVisible();
  await expect(page.getByText(/could not be verified/u)).toBeVisible();
});

test("configured startup sends app-open telemetry without private details", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/__telemetry", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204, body: "" });
  });
  await openAssistant(page);
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
  await installGeolocation(page);
  await page.route("https://map.concept3d.com/**", (route) => route.abort());
  await openAssistant(page);
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
  await openAssistant(page, undefined, undefined, {
    [TELEMETRY_ENABLED_STORAGE_KEY]: "false",
  });
  await page.waitForTimeout(150);
  expect(requests).toBe(0);
});
