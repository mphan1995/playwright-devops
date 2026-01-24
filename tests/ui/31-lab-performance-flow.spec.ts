import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("performance lab supports start and stop flow", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.locator("#perfStartBtn").click();
  await expect(page.locator("#perfLabStatus")).toHaveText("Running");
  await expect(page.locator("#testLabBadge")).toHaveText("Running");

  await page.locator("#perfStopBtn").click();
  await expect(page.locator("#perfLabStatus")).toHaveText("Stopped");
  await expect(page.locator("#perfStopBtn")).toBeDisabled();
});
