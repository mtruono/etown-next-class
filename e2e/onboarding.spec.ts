import { expect, test } from "@playwright/test";

import { encodeSetupCode } from "../src/import/setupCode";
import { syntheticConfiguration } from "../tests/fixtures/syntheticConfiguration";
import { importSyntheticSchedule } from "./helpers";

test("valid setup is previewed, confirmed, and restored after reload", async ({
  page,
}) => {
  await importSyntheticSchedule(page);
  await expect(page.getByText("BIO201X").first()).toBeVisible();
  await expect(page.getByText("Example Science Center").first()).toBeVisible();
  await expect(page.getByText("Room A12").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("BIO201X").first()).toBeVisible();
});

test("invalid code is associated with the import form and stores nothing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Private setup code").fill("ETOWN1.invalid.code");
  await page.getByRole("button", { name: "Review setup code" }).click();
  await expect(page.getByRole("alert")).not.toBeEmpty();
  await expect(page.evaluate(() => localStorage.length)).resolves.toBe(0);
});

test("setup fragment is removed and still requires confirmation", async ({
  page,
}) => {
  const code = await encodeSetupCode(syntheticConfiguration());
  await page.goto(`/#setup=${encodeURIComponent(code)}`);
  await expect(page).not.toHaveURL(/#setup=/u);
  await expect(
    page.getByRole("heading", { name: "Confirm schedule import" }),
  ).toBeVisible();
  await expect(page.evaluate(() => localStorage.length)).resolves.toBe(0);
});
