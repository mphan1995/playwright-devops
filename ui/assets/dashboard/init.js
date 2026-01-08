(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, state } = dashboard;

  if (dom.triggerRunBtn) {
    dom.triggerRunBtn.addEventListener("click", () => dashboard.release.handleTrigger());
  }
  if (dom.pauseReleaseBtn) {
    dom.pauseReleaseBtn.addEventListener("click", () => dashboard.release.handlePause());
  }
  if (dom.resumeReleaseBtn) {
    dom.resumeReleaseBtn.addEventListener("click", () => dashboard.release.handleResume());
  }
  if (dom.approveReleaseBtn) {
    dom.approveReleaseBtn.addEventListener("click", () => dashboard.release.handleApprove());
  }
  if (dom.rejectReleaseBtn) {
    dom.rejectReleaseBtn.addEventListener("click", () => dashboard.release.handleReject());
  }
  if (dom.rollbackReleaseBtn) {
    dom.rollbackReleaseBtn.addEventListener("click", () => dashboard.release.handleRollback());
  }

  dom.incidentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.incident;
      if (key) {
        dashboard.incidents.toggleIncident(key);
      }
    });
  });

  dom.recoveryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.recovery;
      if (action) {
        dashboard.incidents.applyRecovery(action);
      }
    });
  });

  dom.routeToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.routeToggle;
      if (route) {
        dashboard.routes.toggleRoute(route);
      }
    });
  });

  dom.windowToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.windowToggle;
      if (key) {
        dashboard.windows.toggleWindowOverride(key);
      }
    });
  });

  document.addEventListener("role:change", () => {
    dashboard.release.updateControlState();
  });

  document.addEventListener("route:health-change", (event) => {
    dashboard.routes.updateRouteHealthUI(event.detail?.health);
  });

  window.addEventListener("resize", () => {
    dashboard.metrics.drawAllSparklines();
  });

  dashboard.release.syncRunMetadata();
  dashboard.release.updateReleaseTags();
  dashboard.release.updatePolicySignals();
  dashboard.incidents.updateIncidentsUI();
  dashboard.incidents.updateCoreStatus();
  dashboard.routes.updateRouteHealthUI();
  dashboard.windows.updateWindowUI();
  dashboard.release.updateControlState();
  dashboard.release.applyReleaseConstraints();
  dashboard.metrics.updateMetrics();
  dashboard.metrics.updateQaMetrics();

  if (state.releaseState === "running") {
    dashboard.release.syncPipeline();
  } else if (state.releaseState === "queued") {
    dashboard.release.setPipelineQueued();
  } else if (state.releaseState === "succeeded") {
    dashboard.release.setPipelineSucceeded();
  } else if (state.releaseState === "failed" || state.releaseState === "rolled-back") {
    dashboard.release.setPipelineFailed();
  }

  window.devopsApp?.setSimulationState?.(state.simulationOn);

  setInterval(dashboard.release.advancePipeline, 4200);
  setInterval(dashboard.metrics.updateMetrics, 2000);
  setInterval(dashboard.metrics.updateQaMetrics, 4200);
  setInterval(dashboard.windows.updateWindowUI, 60000);
})();
