import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("user role hides privileged controls", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.role]: "user",
  });

  await expect(page.locator("#triggerRun")).toBeHidden();
  await expect(page.locator("#pauseRelease")).toBeHidden();
  await expect(page.locator("#approveRelease")).toBeHidden();
  await expect(page.locator("#rejectRelease")).toBeHidden();
  await expect(page.locator("#rollbackRelease")).toBeHidden();
  await expect(page.locator("#resumeRelease")).toBeHidden();
});
