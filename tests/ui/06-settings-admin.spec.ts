import { test, expect } from "@playwright/test";
import { gotoPage, paths, setRole } from "./helpers";

test("settings admin controls gated by role", async ({ page }) => {
  await gotoPage(page, paths.settings);

  const emergencyCard = page.locator(".setting-card", { hasText: "Emergency Override" });
  await expect(emergencyCard).toBeHidden();

  await setRole(page, "admin");
  await expect(emergencyCard).toBeVisible();
});
