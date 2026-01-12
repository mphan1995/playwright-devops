import { test, expect } from "@playwright/test";
import { gotoPage, paths, setRole } from "./helpers";

test("window overrides update the schedule banner", async ({ page }) => {
  await gotoPage(page, paths.dashboard);
  await setRole(page, "admin");

  const toggle = page.locator('[data-window-toggle="deployment"]');
  await toggle.click();
  await expect(toggle).toHaveText("Auto");
  await expect(page.locator("#windowNote")).toContainText("Override active");

  await toggle.click();
  await expect(toggle).toHaveText("Override");
  await expect(page.locator("#windowNote")).toContainText("Auto schedule");
});
