import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, setRole, storageKeys } from "./helpers";

test("incident updates policy signals and blocks release", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "running",
    [storageKeys.approvals]: "2",
  });

  await setRole(page, "admin");

  await page.locator('[data-incident="terraformDrift"]').click();
  await expect(page.locator("#policyDrift")).toHaveText("Failing");
  await expect(page.locator("#releaseStateBadge")).toHaveText("Blocked");
  await expect(page.locator("#incidentBadge")).toHaveText("Degraded");
});
