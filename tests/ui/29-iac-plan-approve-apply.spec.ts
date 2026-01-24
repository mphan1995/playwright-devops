import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("iac workflow advances from plan to apply", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.role]: "admin",
  });

  await expect(page.locator("#iacBadge")).toHaveText("Plan Needed");

  await page.locator("#iacPlanBtn").click();
  await expect(page.locator("#iacBadge")).toHaveText("Plan Ready");

  await page.locator("#iacApproveBtn").click();
  await expect(page.locator("#iacBadge")).toHaveText("Approved");

  await page.locator("#iacApplyBtn").click();
  await expect(page.locator("#iacBadge")).toHaveText("Applied");
  await expect(page.locator("#iacChangeCount")).toHaveText("0 changes queued");
  await expect(page.locator("#iacFooter")).not.toHaveText("Last apply: N/A");
});
