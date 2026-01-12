import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys, setRole } from "./helpers";

test("approvals cannot bypass active incidents", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "queued",
    [storageKeys.approvals]: "0",
  });

  await setRole(page, "admin");

  await page.locator("#approveRelease").click();
  await page.locator('[data-incident="terraformDrift"]').click();
  await page.locator("#approveRelease").click();

  await expect(page.locator("#approvalCount")).toHaveText("2/2");
  await expect(page.locator("#releaseStateBadge")).toHaveText("Blocked");
  await expect(page.locator("#policyDrift")).toHaveText("Failing");
});
