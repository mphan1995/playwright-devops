import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("observability signals include extended metrics", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await expect(page.locator("#apdexValue")).toHaveText(/0\.\d{2}/);
  await expect(page.locator("#saturationValue")).toHaveText(/\d+%/);
  await expect(page.locator("#cacheHitValue")).toHaveText(/\d+%/);
});
