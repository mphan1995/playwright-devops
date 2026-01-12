import { test, expect } from "@playwright/test";
import { gotoPageWithStorage, paths, storageKeys } from "./helpers";

test("pipeline steps reflect running index", async ({ page }) => {
  await gotoPageWithStorage(page, paths.dashboard, {
    [storageKeys.releaseState]: "running",
    [storageKeys.step]: "2",
  });

  await expect(page.locator('.step[data-step="0"]')).toHaveAttribute("data-status", "success");
  await expect(page.locator('.step[data-step="2"]')).toHaveAttribute("data-status", "running");
  await expect(page.locator('.step[data-step="3"]')).toHaveAttribute("data-status", "queued");
});
