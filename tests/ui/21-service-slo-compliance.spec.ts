import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("slo budget burn toggles status and summary", async ({ page }) => {
  await gotoPage(page, paths.services);

  await page.locator("#simulateBudgetBurn").click();
  await expect(page.locator("#sloStatusBadge")).toHaveText("Critical");
  await expect(page.locator("#sloSummary")).toContainText("burn");

  await page.locator("#resetSlo").click();
  await expect(page.locator("#sloStatusBadge")).toHaveText("Healthy");
});
