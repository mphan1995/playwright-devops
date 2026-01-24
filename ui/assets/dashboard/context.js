(() => {
  if (document.body.dataset.page !== "dashboard") {
    return;
  }

  const dashboard = (window.devopsDashboard = window.devopsDashboard || {});

  const dom = {};

  function refreshDom() {
    dom.stepEls = Array.from(document.querySelectorAll(".step"));
    dom.stateItems = Array.from(document.querySelectorAll(".state-item"));
    dom.incidentButtons = Array.from(document.querySelectorAll("[data-incident]"));
    dom.recoveryButtons = Array.from(document.querySelectorAll("[data-recovery]"));
    dom.routeItems = Array.from(document.querySelectorAll(".route-item"));
    dom.routeToggleButtons = Array.from(document.querySelectorAll("[data-route-toggle]"));
    dom.windowToggleButtons = Array.from(document.querySelectorAll("[data-window-toggle]"));
    dom.runStateEl = document.getElementById("runState");
    dom.releaseStateBadgeEl = document.getElementById("releaseStateBadge");
    dom.buildIdEl = document.getElementById("buildId");
    dom.commitEl = document.getElementById("commitHash");
    dom.logList = document.getElementById("logList");
    dom.alertStateEl = document.getElementById("alertState");
    dom.qaStateEl = document.getElementById("qaState");
    dom.reqRateEl = document.getElementById("reqRate");
    dom.errRateEl = document.getElementById("errRate");
    dom.latencyEl = document.getElementById("latency");
    dom.apdexValueEl = document.getElementById("apdexValue");
    dom.saturationValueEl = document.getElementById("saturationValue");
    dom.cacheHitValueEl = document.getElementById("cacheHitValue");
    dom.qaTotalEl = document.getElementById("qaTotal");
    dom.qaPassedEl = document.getElementById("qaPassed");
    dom.qaFailedEl = document.getElementById("qaFailed");
    dom.qaFlakyEl = document.getElementById("qaFlaky");
    dom.qaSkippedEl = document.getElementById("qaSkipped");
    dom.qaDurationEl = document.getElementById("qaDuration");
    dom.uiSummaryMetaEl = document.getElementById("uiSummaryMeta");
    dom.perfStateEl = document.getElementById("perfState");
    dom.perfSummaryMetaEl = document.getElementById("perfSummaryMeta");
    dom.perfScenarioTotalEl = document.getElementById("perfScenarioTotal");
    dom.perfScenarioFailedEl = document.getElementById("perfScenarioFailed");
    dom.perfWorstAvgEl = document.getElementById("perfWorstAvg");
    dom.perfWorstP95El = document.getElementById("perfWorstP95");
    dom.perfMinRpsEl = document.getElementById("perfMinRps");
    dom.perfErrorRateEl = document.getElementById("perfErrorRate");
    dom.signalFooterEl = document.getElementById("signalFooter");
    dom.triggerRunBtn = document.getElementById("triggerRun");
    dom.pauseReleaseBtn = document.getElementById("pauseRelease");
    dom.resumeReleaseBtn = document.getElementById("resumeRelease");
    dom.approveReleaseBtn = document.getElementById("approveRelease");
    dom.rejectReleaseBtn = document.getElementById("rejectRelease");
    dom.rollbackReleaseBtn = document.getElementById("rollbackRelease");
    dom.approvalCountEl = document.getElementById("approvalCount");
    dom.policyApprovalsEl = document.getElementById("policyApprovals");
    dom.policyDriftEl = document.getElementById("policyDrift");
    dom.policyCanaryEl = document.getElementById("policyCanary");
    dom.incidentBadgeEl = document.getElementById("incidentBadge");
    dom.incidentSummaryEl = document.getElementById("incidentSummary");
    dom.coreStateEl = document.getElementById("coreState");
    dom.jenkinsStatusEl = document.getElementById("jenkinsStatus");
    dom.jenkinsDetailEl = document.getElementById("jenkinsDetail");
    dom.jenkinsExecutorsEl = document.getElementById("jenkinsExecutors");
    dom.jenkinsQueueEl = document.getElementById("jenkinsQueue");
    dom.terraformStatusEl = document.getElementById("terraformStatus");
    dom.terraformDetailEl = document.getElementById("terraformDetail");
    dom.terraformDriftEl = document.getElementById("terraformDrift");
    dom.terraformPlanEl = document.getElementById("terraformPlan");
    dom.ansibleStatusEl = document.getElementById("ansibleStatus");
    dom.ansibleDetailEl = document.getElementById("ansibleDetail");
    dom.ansibleRateEl = document.getElementById("ansibleRate");
    dom.ansibleDeployEl = document.getElementById("ansibleDeploy");
    dom.monitoringStatusEl = document.getElementById("monitoringStatus");
    dom.monitoringDetailEl = document.getElementById("monitoringDetail");
    dom.monitoringAlertsEl = document.getElementById("monitoringAlerts");
    dom.monitoringTargetsEl = document.getElementById("monitoringTargets");
    dom.routeHealthBadgeEl = document.getElementById("routeHealthBadge");
    dom.routeSummaryEl = document.getElementById("routeSummary");
    dom.windowBadgeEl = document.getElementById("windowBadge");
    dom.windowNoteEl = document.getElementById("windowNote");
    dom.deploymentWindowStatusEl = document.getElementById("deploymentWindowStatus");
    dom.maintenanceWindowStatusEl = document.getElementById("maintenanceWindowStatus");
    dom.freezeWindowStatusEl = document.getElementById("freezeWindowStatus");
  }

  refreshDom();

  const storage = {
    releaseState: "devops-release-state",
    approvals: "devops-approvals",
    incidents: "devops-incidents",
    windows: "devops-windows",
    runId: "devops-run",
    commit: "devops-commit",
    step: "devops-step",
  };

  const config = {
    statusLabels: {
      queued: "Queued",
      running: "Running",
      paused: "Paused",
      blocked: "Blocked",
      succeeded: "Succeeded",
      failed: "Failed",
      "rolled-back": "Rolled Back",
    },
    statusClasses: {
      queued: "queued",
      running: "running",
      paused: "paused",
      blocked: "blocked",
      succeeded: "succeeded",
      failed: "failed",
      "rolled-back": "rolled-back",
    },
    pipelineLabels: {
      queued: "Queued",
      running: "Running",
      success: "Success",
      failed: "Failed",
    },
    incidentLabels: {
      terraformDrift: "Terraform Drift Detected",
      jenkinsQueue: "Jenkins Queue Full",
      jenkinsNode: "Jenkins Node Down",
      serviceUnhealthy: "Service Unhealthy",
      deploymentTimeout: "Deployment Timeout",
      canaryFailed: "Canary Failed",
    },
    criticalIncidents: ["deploymentTimeout", "canaryFailed"],
    windowSchedule: {
      deployment: { start: 21 * 60, end: 23 * 60 },
      maintenance: { start: 2 * 60, end: 3 * 60 },
      freeze: { weekendOnly: true },
    },
  };

  function getStoredNumber(key, fallback) {
    const stored = Number(localStorage.getItem(key));
    return Number.isFinite(stored) ? stored : fallback;
  }

  function getStoredState(key, fallback) {
    const stored = localStorage.getItem(key);
    return config.statusLabels[stored] ? stored : fallback;
  }

  function createIncidentState() {
    return {
      terraformDrift: false,
      jenkinsQueue: false,
      jenkinsNode: false,
      serviceUnhealthy: false,
      deploymentTimeout: false,
      canaryFailed: false,
    };
  }

  function loadIncidentState() {
    const stored = localStorage.getItem(storage.incidents);
    if (!stored) {
      return createIncidentState();
    }
    try {
      const parsed = JSON.parse(stored);
      return {
        terraformDrift: Boolean(parsed.terraformDrift),
        jenkinsQueue: Boolean(parsed.jenkinsQueue),
        jenkinsNode: Boolean(parsed.jenkinsNode),
        serviceUnhealthy: Boolean(parsed.serviceUnhealthy),
        deploymentTimeout: Boolean(parsed.deploymentTimeout),
        canaryFailed: Boolean(parsed.canaryFailed),
      };
    } catch (error) {
      return createIncidentState();
    }
  }

  function saveIncidentState(next) {
    localStorage.setItem(storage.incidents, JSON.stringify(next));
  }

  function createWindowOverrides() {
    return {
      deployment: null,
      maintenance: null,
      freeze: null,
    };
  }

  function loadWindowOverrides() {
    const stored = localStorage.getItem(storage.windows);
    if (!stored) {
      return createWindowOverrides();
    }
    try {
      const parsed = JSON.parse(stored);
      return {
        deployment: parsed.deployment === true ? true : parsed.deployment === false ? false : null,
        maintenance: parsed.maintenance === true ? true : parsed.maintenance === false ? false : null,
        freeze: parsed.freeze === true ? true : parsed.freeze === false ? false : null,
      };
    } catch (error) {
      return createWindowOverrides();
    }
  }

  function saveWindowOverrides(next) {
    localStorage.setItem(storage.windows, JSON.stringify(next));
  }

  function seedValues(count, min, max) {
    return Array.from({ length: count }, () => randomBetween(min, max));
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomHash(length = 7) {
    const chars = "abcdef0123456789";
    let result = "";
    for (let i = 0; i < length; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function shiftValue(values, nextValue) {
    const updated = values.slice(1);
    updated.push(nextValue);
    return updated;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  }

  function setChip(el, label, className) {
    if (!el) return;
    el.textContent = label;
    el.classList.remove("success", "warn", "fail");
    if (className) {
      el.classList.add(className);
    }
  }

  function pushLog(message) {
    if (!dom.logList) return;
    const timestamp = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
    });
    const entry = document.createElement("li");
    entry.textContent = `[${timestamp}] ${message}`;
    dom.logList.prepend(entry);
    while (dom.logList.children.length > 12) {
      dom.logList.removeChild(dom.logList.lastChild);
    }
  }

  const state = {
    approvals: getStoredNumber(storage.approvals, 0),
    releaseState: getStoredState(storage.releaseState, "queued"),
    incidents: loadIncidentState(),
    windowOverrides: loadWindowOverrides(),
    runNumber: getStoredNumber(storage.runId, 2406),
    currentIndex: getStoredNumber(storage.step, 2),
    commitHash: localStorage.getItem(storage.commit) || "c9f2b18",
    simulationOn: false,
    metricState: {
      reqRate: 1240,
      errRate: 0.62,
      latency: 240,
      apdex: 0.94,
      saturation: 62,
      cacheHit: 96,
    },
  };

  state.simulationOn = state.releaseState === "running";

  dashboard.dom = dom;
  dashboard.refreshDom = refreshDom;
  dashboard.storage = storage;
  dashboard.config = config;
  dashboard.state = state;
  dashboard.utils = {
    getStoredNumber,
    getStoredState,
    createIncidentState,
    loadIncidentState,
    saveIncidentState,
    createWindowOverrides,
    loadWindowOverrides,
    saveWindowOverrides,
    seedValues,
    randomBetween,
    randomHash,
    clamp,
    shiftValue,
    formatNumber,
    setChip,
    pushLog,
  };
})();
