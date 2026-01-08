(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, utils } = dashboard;

  function getRouteHealth() {
    return window.devopsApp?.getRouteHealth?.() || {};
  }

  function updateRouteHealthUI(health = getRouteHealth()) {
    let brokenCount = 0;

    dom.routeItems.forEach((item) => {
      const route = item.dataset.route;
      const broken = Boolean(health[route]);
      const statusEl = item.querySelector("[data-route-status]");
      if (broken) {
        brokenCount += 1;
        utils.setChip(statusEl, "Broken", "fail");
      } else {
        utils.setChip(statusEl, "Healthy", "success");
      }
    });

    if (dom.routeSummaryEl) {
      dom.routeSummaryEl.textContent = `${brokenCount} broken route${brokenCount === 1 ? "" : "s"}`;
    }

    if (dom.routeHealthBadgeEl) {
      if (brokenCount > 0) {
        dom.routeHealthBadgeEl.textContent = "Degraded";
        dom.routeHealthBadgeEl.className = "tag warn";
      } else {
        dom.routeHealthBadgeEl.textContent = "Healthy";
        dom.routeHealthBadgeEl.className = "tag stable";
      }
    }
  }

  function toggleRoute(route) {
    const health = getRouteHealth();
    const nextValue = !health[route];
    window.devopsApp?.setRouteBroken?.(route, nextValue);
    updateRouteHealthUI();
  }

  dashboard.routes = {
    updateRouteHealthUI,
    toggleRoute,
  };
})();
