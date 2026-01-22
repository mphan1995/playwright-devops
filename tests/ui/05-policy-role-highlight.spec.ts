import { test, expect } from "@playwright/test";
import { gotoPage, paths, setRole } from "./helpers";

test("policy table highlights active role", async ({ page }) => {
  await gotoPage(page, paths.permissions);

  await setRole(page, "moderator");
  await expect(page.locator('[data-role-row="moderator"]')).toHaveClass(/active/);
  await expect(page.locator('[data-role-row="admin"]')).not.toHaveClass(/active/);

  await setRole(page, "admin");
  await expect(page.locator('[data-role-row="admin"]')).toHaveClass(/active/);
});
