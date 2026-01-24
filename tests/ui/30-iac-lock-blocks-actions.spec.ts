import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("iac workspace lock disables actions", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.role]: "admin",
  });

  const lockToggle = page.locator("#iacLockToggle");
  const planBtn = page.locator("#iacPlanBtn");

  await expect(planBtn).toBeEnabled();
  await lockToggle.locator("..").click();
  await expect(lockToggle).toBeChecked();
  await expect(page.locator("#iacWorkspace")).toContainText("Locked");
  await expect(planBtn).toBeDisabled();

  await lockToggle.locator("..").click();
  await expect(lockToggle).not.toBeChecked();
  await expect(planBtn).toBeEnabled();
});
