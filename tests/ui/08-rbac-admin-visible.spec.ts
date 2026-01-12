import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, setRole, storageKeys } from "./helpers";

test("admin role shows release controls", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "queued",
    [storageKeys.approvals]: "0",
  });

  await setRole(page, "admin");

  await expect(page.locator("#triggerRun")).toBeVisible();
  await expect(page.locator("#approveRelease")).toBeEnabled();
  await expect(page.locator("#pauseRelease")).toBeDisabled();
  await expect(page.locator("#resumeRelease")).toBeEnabled();
});
