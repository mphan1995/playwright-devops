(() => {
  if (document.body.dataset.page !== "dashboard") {
    return;
  }

  const dashboard = (window.devopsDashboard = window.devopsDashboard || {});

  const dom = {
    stepEls: Array.from(document.querySelectorAll(".step")),
    stateItems: Array.from(document.querySelectorAll(".state-item")),
    incidentButtons: Array.from(document.querySelectorAll("[data-incident]")),
    recoveryButtons: Array.from(document.querySelectorAll("[data-recovery]")),
    routeItems: Array.from(document.querySelectorAll(".route-item")),
    routeToggleButtons: Array.from(document.querySelectorAll("[data-route-toggle]")),
    windowToggleButtons: Array.from(document.querySelectorAll("[data-window-toggle]")),
    runStateEl: document.getElementById("runState"),
    releaseStateBadgeEl: document.getElementById("releaseStateBadge"),
    buildIdEl: document.getElementById("buildId"),
    commitEl: document.getElementById("commitHash"),
    logList: document.getElementById("logList"),
    alertStateEl: document.getElementById("alertState"),
    qaStateEl: document.getElementById("qaState"),
    reqRateEl: document.getElementById("reqRate"),
    errRateEl: document.getElementById("errRate"),
    latencyEl: document.getElementById("latency"),
    qaTotalEl: document.getElementById("qaTotal"),
    qaPassedEl: document.getElementById("qaPassed"),
    qaFailedEl: document.getElementById("qaFailed"),
    qaFlakyEl: document.getElementById("qaFlaky"),
    qaDurationEl: document.getElementById("qaDuration"),
    qaCoverageEl: document.getElementById("qaCoverage"),
    triggerRunBtn: document.getElementById("triggerRun"),
    pauseReleaseBtn: document.getElementById("pauseRelease"),
    resumeReleaseBtn: document.getElementById("resumeRelease"),
    approveReleaseBtn: document.getElementById("approveRelease"),
    rejectReleaseBtn: document.getElementById("rejectRelease"),
    rollbackReleaseBtn: document.getElementById("rollbackRelease"),
    approvalCountEl: document.getElementById("approvalCount"),
    policyApprovalsEl: document.getElementById("policyApprovals"),
    policyDriftEl: document.getElementById("policyDrift"),
    policyCanaryEl: document.getElementById("policyCanary"),
    incidentBadgeEl: document.getElementById("incidentBadge"),
    incidentSummaryEl: document.getElementById("incidentSummary"),
    coreStateEl: document.getElementById("coreState"),
    jenkinsStatusEl: document.getElementById("jenkinsStatus"),
    jenkinsDetailEl: document.getElementById("jenkinsDetail"),
    jenkinsExecutorsEl: document.getElementById("jenkinsExecutors"),
    jenkinsQueueEl: document.getElementById("jenkinsQueue"),
    terraformStatusEl: document.getElementById("terraformStatus"),
    terraformDetailEl: document.getElementById("terraformDetail"),
    terraformDriftEl: document.getElementById("terraformDrift"),
    terraformPlanEl: document.getElementById("terraformPlan"),
    ansibleStatusEl: document.getElementById("ansibleStatus"),
    ansibleDetailEl: document.getElementById("ansibleDetail"),
    ansibleRateEl: document.getElementById("ansibleRate"),
    ansibleDeployEl: document.getElementById("ansibleDeploy"),
    monitoringStatusEl: document.getElementById("monitoringStatus"),
    monitoringDetailEl: document.getElementById("monitoringDetail"),
    monitoringAlertsEl: document.getElementById("monitoringAlerts"),
    monitoringTargetsEl: document.getElementById("monitoringTargets"),
    routeHealthBadgeEl: document.getElementById("routeHealthBadge"),
    routeSummaryEl: document.getElementById("routeSummary"),
    windowBadgeEl: document.getElementById("windowBadge"),
    windowNoteEl: document.getElementById("windowNote"),
    deploymentWindowStatusEl: document.getElementById("deploymentWindowStatus"),
    maintenanceWindowStatusEl: document.getElementById("maintenanceWindowStatus"),
    freezeWindowStatusEl: document.getElementById("freezeWindowStatus"),
  };

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
    while (dom.logList.children.length > 8) {
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
    },
    qaState: {
      total: 128,
      passed: 126,
      failed: 2,
      flaky: 1,
      duration: 192,
      coverage: 82,
    },
  };

  state.simulationOn = state.releaseState === "running";

  dashboard.dom = dom;
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
