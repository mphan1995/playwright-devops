const ROLE_KEY = "devops-role";
const SIM_KEY = "devops-sim";
const LAST_ROUTE_KEY = "devops-last-route";
const ROUTE_HEALTH_KEY = "devops-route-health";

const roles = ["admin", "moderator", "user"];
const roleLabels = {
  admin: "Admin",
  moderator: "Moderator",
  user: "User",
};
const roleAliases = {
  operator: "moderator",
};

const pageLabels = {
  dashboard: "Dashboard",
  services: "Service Health",
  users: "Users",
  permissions: "Policies",
  settings: "Settings",
};

const routeDefaults = Object.keys(pageLabels).reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

let routeHealthCache = { ...routeDefaults };
let currentRole = "user";

function normalizeRole(role) {
  return roleAliases[role] || role;
}

function getStoredRole() {
  const stored = normalizeRole(localStorage.getItem(ROLE_KEY));
  return roles.includes(stored) ? stored : "user";
}

function setStoredRole(role) {
  localStorage.setItem(ROLE_KEY, normalizeRole(role));
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
  const normalized = normalizeRole(role);
  if (!roles.includes(normalized)) return;
  if (persist) {
    setStoredRole(normalized);
  }
  applyRole(normalized);
}

function initRoleSelector() {
  const roleSelect = document.getElementById("roleSelect");
  if (!roleSelect) return;

  roleSelect.value = currentRole;
  roleSelect.addEventListener("change", () => {
    setRole(roleSelect.value);
  });
}

function initRouteToggle() {
  const toggleBtn = document.getElementById("routeToggleBtn");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const page = getCurrentPageKey();
    const health = getRouteHealth();
    setRouteBroken(page, !health[page]);
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

function getCurrentPageKey() {
  return document.body.dataset.page || "dashboard";
}

function getRouteHealth() {
  try {
    const stored = localStorage.getItem(ROUTE_HEALTH_KEY);
    if (!stored) {
      return { ...routeHealthCache };
    }
    const parsed = JSON.parse(stored);
    routeHealthCache = { ...routeDefaults, ...parsed };
    return { ...routeHealthCache };
  } catch (error) {
    return { ...routeHealthCache };
  }
}

function saveRouteHealth(health) {
  routeHealthCache = { ...routeDefaults, ...health };
  try {
    localStorage.setItem(ROUTE_HEALTH_KEY, JSON.stringify(routeHealthCache));
  } catch (error) {
    // Keep in-memory state if storage is unavailable.
  }
  document.dispatchEvent(
    new CustomEvent("route:health-change", { detail: { health: routeHealthCache } })
  );
}

function setRouteBroken(route, isBroken) {
  const health = getRouteHealth();
  if (!(route in health)) return;
  health[route] = Boolean(isBroken);
  saveRouteHealth(health);
}

function getBrokenCount(health) {
  return Object.values(health).filter(Boolean).length;
}

function ensureRouteFallback() {
  const content = document.querySelector(".page-content");
  if (!content) return null;
  let fallback = content.querySelector("[data-route-fallback]");
  if (!fallback) {
    fallback = document.createElement("div");
    fallback.className = "route-fallback";
    fallback.dataset.routeFallback = "true";
    content.prepend(fallback);
  }
  return fallback;
}

function applyRouteHealth(health = getRouteHealth()) {
  const page = getCurrentPageKey();
  const broken = Boolean(health[page]);
  const content = document.querySelector(".page-content");
  const sections = Array.from(document.querySelectorAll(".page-content > section"));
  const existingFallback = content?.querySelector("[data-route-fallback]");

  sections.forEach((section) => {
    section.hidden = broken;
  });

  if (!broken) {
    if (existingFallback) {
      existingFallback.remove();
    }
    updateRouteStatusBadge(health);
    return;
  }

  const fallback = existingFallback || ensureRouteFallback();
  if (fallback) {
    const label = pageLabels[page] || page;
    fallback.innerHTML = `
      <h3>${label} temporarily unavailable</h3>
      <p>Route is degraded. Other pages remain online while this area recovers.</p>
      <div class="route-fallback-actions">
        <button class="btn ghost compact" data-recover-route data-role-allow="admin">Recover Page</button>
      </div>
    `;

    const recoverBtn = fallback.querySelector("[data-recover-route]");
    if (recoverBtn) {
      recoverBtn.addEventListener("click", () => {
        setRouteBroken(page, false);
      });
    }

    applyRBAC(currentRole);
    fallback.hidden = false;
  }

  updateRouteStatusBadge(health);
}

function updateRouteStatusBadge(health = getRouteHealth()) {
  const badge = document.getElementById("routeStatusBadge");
  const toggleBtn = document.getElementById("routeToggleBtn");
  if (!badge && !toggleBtn) return;

  const page = getCurrentPageKey();
  const broken = Boolean(health[page]);

  if (badge) {
    badge.textContent = `Route: ${broken ? "Broken" : "Healthy"}`;
    badge.classList.remove("success", "fail");
    badge.classList.add(broken ? "fail" : "success");
  }

  if (toggleBtn) {
    toggleBtn.textContent = broken ? "Recover Route" : "Simulate Outage";
  }
}

function updateRouteIndicator(health = getRouteHealth()) {
  const brokenCountEl = document.getElementById("navBrokenCount");
  if (brokenCountEl) {
    const count = getBrokenCount(health);
    brokenCountEl.textContent = `${count} broken route${count === 1 ? "" : "s"}`;
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
  updateRouteIndicator();
}

function initState() {
  updateSimulationBadge(getSimulationState());
  applyRouteHealth();
  updateRouteIndicator();
  updateRouteStatusBadge();
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

function signalComponentsLoaded() {
  if (document.body) {
    document.body.dataset.componentsLoaded = "true";
  }
  document.dispatchEvent(new CustomEvent("components:loaded"));
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
  initRouteToggle();
  initState();
}

window.devopsApp = {
  getRole: () => currentRole,
  setRole,
  getSimulationState,
  setSimulationState,
  getRouteHealth,
  setRouteBroken,
  getBrokenCount: () => getBrokenCount(getRouteHealth()),
};

document.addEventListener("DOMContentLoaded", async () => {
  const slots = Array.from(document.querySelectorAll("[data-component][data-component-src]"));
  if (slots.length) {
    await Promise.all(slots.map(loadComponent));
  }
  initApp();
  signalComponentsLoaded();
});

document.addEventListener("route:health-change", (event) => {
  updateRouteIndicator(event.detail?.health);
  applyRouteHealth(event.detail?.health);
  updateRouteStatusBadge(event.detail?.health);
});
