import { expect, Page } from "@playwright/test";

export const paths = {
  dashboard: "pages/index.html",
  services: "pages/services.html",
  users: "pages/users.html",
  permissions: "pages/permissions.html",
  settings: "pages/settings.html",
};

export const storageKeys = {
  role: "devops-role",
  sim: "devops-sim",
  routeHealth: "devops-route-health",
  releaseState: "devops-release-state",
  approvals: "devops-approvals",
  incidents: "devops-incidents",
  windows: "devops-windows",
  runId: "devops-run",
  commit: "devops-commit",
  step: "devops-step",
  servicesFail: "devops-services-fail",
  iso: "devops-iso",
  residency: "devops-residency",
  slo: "devops-slo",
};

export function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return "User";
}

export async function waitForApp(page: Page) {
  await page.waitForSelector(".sidebar-nav");
  await page.waitForSelector("#pageTitle");
  await page.waitForFunction(() => Boolean(window.devopsApp) && document.documentElement.dataset.role);
}

export async function gotoPage(page: Page, path: string) {
  await page.goto(path);
  await waitForApp(page);
}

export async function gotoPageWithStorage(page: Page, path: string, storage: Record<string, string>) {
  await page.goto(path);
  await page.evaluate((entries) => {
    localStorage.clear();
    if (!entries) return;
    Object.entries(entries).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }, storage);
  await page.reload();
  await waitForApp(page);
}

export async function setRole(page: Page, role: "admin" | "moderator" | "user") {
  await page.waitForFunction(() => Boolean(window.devopsApp?.setRole));
  await page.evaluate((targetRole) => {
    window.devopsApp.setRole(targetRole);
  }, role);
  await page.waitForFunction((targetRole) => document.documentElement.dataset.role === targetRole, role);
  await expect(page.locator("#roleBadge")).toHaveText(roleLabel(role));
}
