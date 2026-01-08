const ROLE_KEY = "devops-role";
const SIM_KEY = "devops-sim";
const LAST_ROUTE_KEY = "devops-last-route";

const roles = ["admin", "operator", "user"];
const roleLabels = {
  admin: "Admin",
  operator: "Operator",
  user: "User",
};

const pageLabels = {
  dashboard: "Dashboard",
  services: "Service Health",
  users: "Users",
  permissions: "Policies",
  settings: "Settings",
};

let currentRole = "user";

function getStoredRole() {
  const stored = localStorage.getItem(ROLE_KEY);
  return roles.includes(stored) ? stored : "user";
}

function setStoredRole(role) {
  localStorage.setItem(ROLE_KEY, role);
}

function getSimulationState() {
  const stored = localStorage.getItem(SIM_KEY);
  if (stored === null) {
    return true;
  }
  return stored === "running";
}

function setSimulationState(isRunning) {
  localStorage.setItem(SIM_KEY, isRunning ? "running" : "paused");
  updateSimulationBadge(isRunning);
  document.dispatchEvent(new CustomEvent("simulation:change", { detail: { isRunning } }));
}

function updateSimulationBadge(isRunning) {
  const badge = document.getElementById("simBadge");
  if (!badge) return;
  badge.textContent = `Simulation: ${isRunning ? "Running" : "Paused"}`;
  badge.classList.remove("running", "paused");
  badge.classList.add(isRunning ? "running" : "paused");
}

function applyRBAC(role) {
  document.querySelectorAll("[data-role-allow]").forEach((el) => {
    const allowed = el.dataset.roleAllow
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    el.hidden = !allowed.includes(role);
  });

  document.querySelectorAll("[data-role-deny]").forEach((el) => {
    const denied = el.dataset.roleDeny
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (denied.includes(role)) {
      el.hidden = true;
    }
  });
}

function updateRoleLabels(role) {
  const label = roleLabels[role] || role;
  const roleBadge = document.getElementById("roleBadge");
  const navRole = document.getElementById("navRole");

  if (roleBadge) {
    roleBadge.textContent = label;
  }
  if (navRole) {
    navRole.textContent = label;
  }
}

function highlightRoleRow(role) {
  document.querySelectorAll("[data-role-row]").forEach((row) => {
    row.classList.toggle("active", row.dataset.roleRow === role);
  });
}

function applyRole(role) {
  currentRole = role;
  document.documentElement.dataset.role = role;
  updateRoleLabels(role);
  applyRBAC(role);
  highlightRoleRow(role);
  document.dispatchEvent(new CustomEvent("role:change", { detail: { role } }));
}

function setRole(role, { persist = true } = {}) {
  if (!roles.includes(role)) return;
  if (persist) {
    setStoredRole(role);
  }
  applyRole(role);
}

function initRoleSelector() {
  const roleSelect = document.getElementById("roleSelect");
  if (!roleSelect) return;

  roleSelect.value = currentRole;
  roleSelect.addEventListener("change", () => {
    setRole(roleSelect.value);
  });
}

function updatePageHeader() {
  const titleEl = document.getElementById("pageTitle");
  const subtitleEl = document.getElementById("pageSubtitle");
  const pageTitle = document.body.dataset.pageTitle || "Dashboard";
  const pageSubtitle = document.body.dataset.pageSubtitle || "";

  if (titleEl) {
    titleEl.textContent = pageTitle;
  }
  if (subtitleEl) {
    subtitleEl.textContent = pageSubtitle;
  }
}

function updateNavigationState() {
  const page = document.body.dataset.page || "dashboard";
  const pageLabel = pageLabels[page] || page;
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    const isActive = link.dataset.page === page;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const lastRouteEl = document.getElementById("navLastRoute");
  const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
  if (lastRouteEl) {
    lastRouteEl.textContent = lastRoute || pageLabel;
  }
  localStorage.setItem(LAST_ROUTE_KEY, pageLabel);
}

function initState() {
  updateSimulationBadge(getSimulationState());
}

async function loadComponent(slot) {
  const src = slot.dataset.componentSrc;
  if (!src) return;
  try {
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${src}`);
    }
    const html = await response.text();
    slot.innerHTML = html;
  } catch (error) {
    slot.innerHTML = "<div class=\"component-fallback\">Component unavailable</div>";
    slot.dataset.componentError = "true";
  }
}

function initApp() {
  currentRole = getStoredRole();
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  if (roles.includes(roleParam)) {
    setRole(roleParam);
  } else {
    applyRole(currentRole);
  }

  updatePageHeader();
  updateNavigationState();
  initRoleSelector();
  initState();
}

window.devopsApp = {
  getRole: () => currentRole,
  setRole,
  getSimulationState,
  setSimulationState,
};

document.addEventListener("DOMContentLoaded", async () => {
  const slots = Array.from(document.querySelectorAll("[data-component][data-component-src]"));
  if (slots.length) {
    await Promise.all(slots.map(loadComponent));
  }
  initApp();
});
