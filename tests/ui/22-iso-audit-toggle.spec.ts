import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("iso audit cycles status and persists", async ({ page }) => {
  await gotoPage(page, paths.services);

  await expect(page.locator("#iso22301Status")).toHaveText("Review");
  await page.locator("#runIsoAudit").click();
  await expect(page.locator("#iso22301Status")).toHaveText("Gap");

  await page.reload();
  await expect(page.locator("#iso22301Status")).toHaveText("Gap");
});
