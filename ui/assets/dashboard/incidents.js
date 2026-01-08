(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, state, config, utils } = dashboard;

  function updateIncidentsUI() {
    dom.incidentButtons.forEach((button) => {
      const key = button.dataset.incident;
      button.classList.toggle("active", Boolean(state.incidents[key]));
    });

    const active = Object.keys(state.incidents).filter((key) => state.incidents[key]);
    const criticalActive = active.filter((key) => config.criticalIncidents.includes(key));

    if (dom.incidentBadgeEl) {
      if (criticalActive.length) {
        dom.incidentBadgeEl.textContent = "Critical";
        dom.incidentBadgeEl.className = "tag failed";
      } else if (active.length) {
        dom.incidentBadgeEl.textContent = "Degraded";
        dom.incidentBadgeEl.className = "tag warn";
      } else {
        dom.incidentBadgeEl.textContent = "Stable";
        dom.incidentBadgeEl.className = "tag stable";
      }
    }

    if (dom.incidentSummaryEl) {
      if (!active.length) {
        dom.incidentSummaryEl.textContent = "0 incidents active";
      } else {
        const labels = active.map((key) => config.incidentLabels[key] || key).join(", ");
        dom.incidentSummaryEl.textContent = `${active.length} incident(s) active: ${labels}`;
      }
    }
  }

  function updateCoreStatus() {
    const jenkinsIssues = [];
    if (state.incidents.jenkinsQueue) jenkinsIssues.push("Queue full");
    if (state.incidents.jenkinsNode) jenkinsIssues.push("Node down");

    if (jenkinsIssues.length) {
      utils.setChip(dom.jenkinsStatusEl, "Degraded", "warn");
      if (dom.jenkinsDetailEl) {
        dom.jenkinsDetailEl.textContent = `Jenkins issues: ${jenkinsIssues.join(", ")}.`;
      }
      if (dom.jenkinsExecutorsEl) dom.jenkinsExecutorsEl.textContent = "Executors: 4/8";
      if (dom.jenkinsQueueEl) {
        dom.jenkinsQueueEl.textContent = state.incidents.jenkinsQueue ? "Queue: 18" : "Queue: 6";
      }
    } else {
      utils.setChip(dom.jenkinsStatusEl, "Healthy", "success");
      if (dom.jenkinsDetailEl) {
        dom.jenkinsDetailEl.textContent = "Build queue and nodes within capacity.";
      }
      if (dom.jenkinsExecutorsEl) dom.jenkinsExecutorsEl.textContent = "Executors: 6/8";
      if (dom.jenkinsQueueEl) dom.jenkinsQueueEl.textContent = "Queue: 0";
    }

    if (state.incidents.terraformDrift) {
      utils.setChip(dom.terraformStatusEl, "Drift", "warn");
      if (dom.terraformDetailEl) {
        dom.terraformDetailEl.textContent = "Drift detected across infrastructure resources.";
      }
      if (dom.terraformDriftEl) dom.terraformDriftEl.textContent = "Drift: 2 resources";
      if (dom.terraformPlanEl) dom.terraformPlanEl.textContent = "Plan: review needed";
    } else {
      utils.setChip(dom.terraformStatusEl, "Clean", "success");
      if (dom.terraformDetailEl) {
        dom.terraformDetailEl.textContent = "No drift detected across modules.";
      }
      if (dom.terraformDriftEl) dom.terraformDriftEl.textContent = "Drift: 0 resources";
      if (dom.terraformPlanEl) dom.terraformPlanEl.textContent = "Plan: ready";
    }

    let ansibleRate = 98;
    if (state.incidents.deploymentTimeout || state.incidents.canaryFailed) {
      ansibleRate = 72;
    } else if (state.incidents.serviceUnhealthy) {
      ansibleRate = 88;
    }

    const ansibleStatus = ansibleRate >= 95 ? "success" : ansibleRate >= 85 ? "warn" : "fail";
    const ansibleLabel = ansibleStatus === "success" ? "Stable" : ansibleStatus === "warn" ? "Degraded" : "Critical";
    utils.setChip(dom.ansibleStatusEl, ansibleLabel, ansibleStatus);
    if (dom.ansibleDetailEl) {
      dom.ansibleDetailEl.textContent = "Playbook success rate holding steady.";
    }
    if (dom.ansibleRateEl) dom.ansibleRateEl.textContent = `Success: ${ansibleRate}%`;
    if (dom.ansibleDeployEl) dom.ansibleDeployEl.textContent = "Deploys: 12";

    let monitoringLabel = "Green";
    let monitoringClass = "success";
    if (state.incidents.deploymentTimeout || state.incidents.canaryFailed) {
      monitoringLabel = "Red";
      monitoringClass = "fail";
    } else if (state.incidents.serviceUnhealthy) {
      monitoringLabel = "Yellow";
      monitoringClass = "warn";
    }

    utils.setChip(dom.monitoringStatusEl, monitoringLabel, monitoringClass);
    if (dom.monitoringDetailEl) {
      dom.monitoringDetailEl.textContent = "Metrics and alerts within thresholds.";
    }

    const anyCritical = config.criticalIncidents.some((key) => state.incidents[key]);
    const anyIssues = Object.keys(state.incidents).some((key) => state.incidents[key]);
    if (dom.coreStateEl) {
      if (anyCritical) {
        dom.coreStateEl.textContent = "Critical";
        dom.coreStateEl.className = "tag failed";
      } else if (anyIssues) {
        dom.coreStateEl.textContent = "Degraded";
        dom.coreStateEl.className = "tag warn";
      } else {
        dom.coreStateEl.textContent = "Stable";
        dom.coreStateEl.className = "tag stable";
      }
    }

    if (dom.monitoringAlertsEl) dom.monitoringAlertsEl.textContent = "Alerts: 3";
    if (dom.monitoringTargetsEl) dom.monitoringTargetsEl.textContent = "Targets: 142";
  }

  function toggleIncident(key) {
    state.incidents[key] = !state.incidents[key];
    utils.saveIncidentState(state.incidents);
    updateIncidentsUI();
    dashboard.release?.updatePolicySignals?.();
    updateCoreStatus();
    dashboard.release?.applyReleaseConstraints?.();
    const label = config.incidentLabels[key] || key;
    utils.pushLog(`${label} ${state.incidents[key] ? "enabled" : "cleared"}.`);
  }

  function applyRecovery(action) {
    if (action === "terraformDrift") {
      state.incidents.terraformDrift = false;
      utils.pushLog("Terraform drift cleared.");
    }
    if (action === "jenkinsCapacity") {
      state.incidents.jenkinsQueue = false;
      state.incidents.jenkinsNode = false;
      utils.pushLog("Jenkins capacity restored.");
    }
    if (action === "serviceHealthy") {
      state.incidents.serviceUnhealthy = false;
      utils.pushLog("Service health restored.");
    }

    utils.saveIncidentState(state.incidents);
    updateIncidentsUI();
    dashboard.release?.updatePolicySignals?.();
    updateCoreStatus();
    dashboard.release?.applyReleaseConstraints?.();
  }

  dashboard.incidents = {
    updateIncidentsUI,
    updateCoreStatus,
    toggleIncident,
    applyRecovery,
  };
})();
