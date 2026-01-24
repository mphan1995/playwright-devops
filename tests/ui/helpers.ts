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
  perfRegression: "devops-perf-regression",
  iso: "devops-iso",
  residency: "devops-residency",
  slo: "devops-slo",
  kube: "devops-kube",
  iac: "devops-iac",
  labs: "devops-labs",
  metricsSession: "devops-metrics-session",
};

export const defaultKubeState = {
  controlPlaneDegraded: false,
  upgradePlanned: false,
  autoscaler: true,
  pdb: true,
  hpaReplicas: 6,
  pools: {
    core: { desired: 6, ready: 6, cpu: 58, memory: 62, mode: "On-demand" },
    edge: { desired: 4, ready: 4, cpu: 44, memory: 48, mode: "Spot" },
    batch: { desired: 3, ready: 3, cpu: 38, memory: 40, mode: "Spot" },
  },
};

export const defaultIacState = {
  stage: "idle",
  locked: false,
  lastApplied: null,
};

export function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return "User";
}

export async function waitForApp(page: Page) {
  await page.waitForFunction(() => document.body?.dataset.componentsLoaded === "true");
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
