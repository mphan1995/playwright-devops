import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("pause state persists across reloads", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.role]: "admin",
    [storageKeys.releaseState]: "running",
    [storageKeys.approvals]: "2",
  });

  await page.locator("#pauseRelease").click();
  await expect(page.locator("#releaseStateBadge")).toHaveText("Paused");

  await page.reload();
  await expect(page.locator("#releaseStateBadge")).toHaveText("Paused");
  await expect(page.locator("#runState")).toHaveText("Paused");
});
