import { test, expect } from "@playwright/test";
import { gotoPage, paths } from "./helpers";

test("ui lab uses updated artifact toggles during run", async ({ page }) => {
  await gotoPage(page, paths.dashboard);

  const traceToggle = page.locator("#uiTraceToggle");
  const videoToggle = page.locator("#uiVideoToggle");
  const throttleToggle = page.locator("#uiThrottleToggle");

  await traceToggle.locator("..").click();
  await videoToggle.locator("..").click();
  await throttleToggle.locator("..").click();

  await expect(traceToggle).not.toBeChecked();
  await expect(videoToggle).not.toBeChecked();
  await expect(throttleToggle).toBeChecked();

  await page.locator("#uiRunBtn").click();
  await expect(page.locator("#uiLabSummary")).toContainText("throttle");
  await expect(page.locator("#uiLabSummary")).not.toContainText("trace");

  await page.locator("#uiStopBtn").click();
});
