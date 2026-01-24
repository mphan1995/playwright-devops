import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("ui lab run completes and records last run", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.locator("#uiRunBtn").click();
  await expect(page.locator("#uiLabStatus")).toHaveText("Running");
  await expect(page.locator("#uiLabStatus")).toHaveText("Passed", { timeout: 7000 });
  await expect(page.locator("#uiLastRun")).not.toHaveText("Last run: N/A");
});
