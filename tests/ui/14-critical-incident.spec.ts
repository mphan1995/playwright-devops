import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, setRole, storageKeys } from "./helpers";

test("critical incident fails release and core state", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "running",
    [storageKeys.approvals]: "2",
  });

  await setRole(page, "admin");

  await page.locator('[data-incident="deploymentTimeout"]').click();
  await expect(page.locator("#incidentBadge")).toHaveText("Critical");
  await expect(page.locator("#releaseStateBadge")).toHaveText("Failed");
  await expect(page.locator("#coreState")).toHaveText("Critical");
});
