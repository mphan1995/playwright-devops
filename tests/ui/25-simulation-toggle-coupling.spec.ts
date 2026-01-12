import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys, setRole } from "./helpers";

test("simulation badge follows release state", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "queued",
    [storageKeys.approvals]: "0",
  });

  await setRole(page, "admin");

  await page.locator("#approveRelease").click();
  await page.locator("#approveRelease").click();

  await expect(page.locator("#releaseStateBadge")).toHaveText("Running");
  await expect(page.locator("#simBadge")).toHaveText("Simulation: Running");

  await page.locator("#pauseRelease").click();
  await expect(page.locator("#releaseStateBadge")).toHaveText("Paused");
  await expect(page.locator("#simBadge")).toHaveText("Simulation: Paused");
});
