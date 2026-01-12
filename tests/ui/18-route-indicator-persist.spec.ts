import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("route health count tracks multiple broken routes", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  await page.waitForFunction(() => (window as any).devopsApp?.setRouteBroken);
  await page.evaluate(() => {
    const app = (window as any).devopsApp;
    app.setRouteBroken("services", true);
    app.setRouteBroken("users", true);
  });

  await expect(page.locator("#routeSummary")).toHaveText("2 broken routes");
  await expect(page.locator("#navBrokenCount")).toHaveText("2 broken routes");
});
