import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, setRole, storageKeys } from "./helpers";

test("approvals advance release to running", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "queued",
    [storageKeys.approvals]: "0",
  });

  await setRole(page, "admin");

  await page.locator("#approveRelease").click();
  await expect(page.locator("#approvalCount")).toHaveText("1/2");

  await page.locator("#approveRelease").click();
  await expect(page.locator("#approvalCount")).toHaveText("2/2");
  await expect(page.locator("#releaseStateBadge")).toHaveText("Running");
  await expect(page.locator("#approveRelease")).toBeDisabled();
});
