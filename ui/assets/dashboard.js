(() => {
  if (document.body.dataset.page !== "dashboard") {
    return;
  }

  const stepEls = Array.from(document.querySelectorAll(".step"));
  const runStateEl = document.getElementById("runState");
  const releaseStateBadgeEl = document.getElementById("releaseStateBadge");
  const stateItems = Array.from(document.querySelectorAll(".state-item"));
  const buildIdEl = document.getElementById("buildId");
  const commitEl = document.getElementById("commitHash");
  const logList = document.getElementById("logList");
  const alertStateEl = document.getElementById("alertState");
  const qaStateEl = document.getElementById("qaState");

  const reqRateEl = document.getElementById("reqRate");
  const errRateEl = document.getElementById("errRate");
  const latencyEl = document.getElementById("latency");

  const qaTotalEl = document.getElementById("qaTotal");
  const qaPassedEl = document.getElementById("qaPassed");
  const qaFailedEl = document.getElementById("qaFailed");
  const qaFlakyEl = document.getElementById("qaFlaky");
  const qaDurationEl = document.getElementById("qaDuration");
  const qaCoverageEl = document.getElementById("qaCoverage");

  const triggerRunBtn = document.getElementById("triggerRun");
  const pauseReleaseBtn = document.getElementById("pauseRelease");
  const resumeReleaseBtn = document.getElementById("resumeRelease");
  const approveReleaseBtn = document.getElementById("approveRelease");
  const rejectReleaseBtn = document.getElementById("rejectRelease");
  const rollbackReleaseBtn = document.getElementById("rollbackRelease");

  const approvalCountEl = document.getElementById("approvalCount");
  const policyApprovalsEl = document.getElementById("policyApprovals");
  const policyDriftEl = document.getElementById("policyDrift");
  const policyCanaryEl = document.getElementById("policyCanary");

  const incidentBadgeEl = document.getElementById("incidentBadge");
  const incidentSummaryEl = document.getElementById("incidentSummary");
  const incidentButtons = Array.from(document.querySelectorAll("[data-incident]"));
  const recoveryButtons = Array.from(document.querySelectorAll("[data-recovery]"));

  const coreStateEl = document.getElementById("coreState");
  const jenkinsStatusEl = document.getElementById("jenkinsStatus");
  const jenkinsDetailEl = document.getElementById("jenkinsDetail");
  const jenkinsExecutorsEl = document.getElementById("jenkinsExecutors");
  const jenkinsQueueEl = document.getElementById("jenkinsQueue");
  const terraformStatusEl = document.getElementById("terraformStatus");
  const terraformDetailEl = document.getElementById("terraformDetail");
  const terraformDriftEl = document.getElementById("terraformDrift");
  const terraformPlanEl = document.getElementById("terraformPlan");
  const ansibleStatusEl = document.getElementById("ansibleStatus");
  const ansibleDetailEl = document.getElementById("ansibleDetail");
  const ansibleRateEl = document.getElementById("ansibleRate");
  const ansibleDeployEl = document.getElementById("ansibleDeploy");
  const monitoringStatusEl = document.getElementById("monitoringStatus");
  const monitoringDetailEl = document.getElementById("monitoringDetail");
  const monitoringAlertsEl = document.getElementById("monitoringAlerts");
  const monitoringTargetsEl = document.getElementById("monitoringTargets");

  const statusLabels = {
    queued: "Queued",
    running: "Running",
    paused: "Paused",
    blocked: "Blocked",
    succeeded: "Succeeded",
    failed: "Failed",
    "rolled-back": "Rolled Back",
  };

  const statusClasses = {
    queued: "queued",
    running: "running",
    paused: "paused",
    blocked: "blocked",
    succeeded: "succeeded",
    failed: "failed",
    "rolled-back": "rolled-back",
  };

  const pipelineLabels = {
    queued: "Queued",
    running: "Running",
    success: "Success",
    failed: "Failed",
  };

  const incidentLabels = {
    terraformDrift: "Terraform Drift Detected",
    jenkinsQueue: "Jenkins Queue Full",
    jenkinsNode: "Jenkins Node Down",
    serviceUnhealthy: "Service Unhealthy",
    deploymentTimeout: "Deployment Timeout",
    canaryFailed: "Canary Failed",
  };

  const criticalIncidents = ["deploymentTimeout", "canaryFailed"];

  const RELEASE_STATE_KEY = "devops-release-state";
  const APPROVAL_KEY = "devops-approvals";
  const INCIDENT_KEY = "devops-incidents";
  const RUN_KEY = "devops-run";
  const COMMIT_KEY = "devops-commit";
  const STEP_KEY = "devops-step";

  const metricState = {
    reqRate: 1240,
    errRate: 0.62,
    latency: 240,
  };

  const qaState = {
    total: 128,
    passed: 126,
    failed: 2,
    flaky: 1,
    duration: 192,
    coverage: 82,
  };

  const charts = Array.from(document.querySelectorAll(".spark")).map((canvas) => ({
    canvas,
    color: canvas.dataset.color || "#47d7c3",
    values: seedValues(22, 60, 100),
  }));

  const incidents = loadIncidentState();
  let approvals = getStoredNumber(APPROVAL_KEY, 0);
  let releaseState = getStoredState(RELEASE_STATE_KEY, "queued");
  let simulationOn = releaseState === "running";
  let runNumber = getStoredNumber(RUN_KEY, 2406);
  let currentIndex = getStoredNumber(STEP_KEY, 2);
  let commitHash = localStorage.getItem(COMMIT_KEY) || "c9f2b18";

  function getStoredNumber(key, fallback) {
    const stored = Number(localStorage.getItem(key));
    return Number.isFinite(stored) ? stored : fallback;
  }

  function getStoredState(key, fallback) {
    const stored = localStorage.getItem(key);
    return statusLabels[stored] ? stored : fallback;
  }

  function loadIncidentState() {
    const stored = localStorage.getItem(INCIDENT_KEY);
    if (!stored) {
      return {
        terraformDrift: false,
        jenkinsQueue: false,
        jenkinsNode: false,
        serviceUnhealthy: false,
        deploymentTimeout: false,
        canaryFailed: false,
      };
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
      return {
        terraformDrift: false,
        jenkinsQueue: false,
        jenkinsNode: false,
        serviceUnhealthy: false,
        deploymentTimeout: false,
        canaryFailed: false,
      };
    }
  }

  function saveIncidentState() {
    localStorage.setItem(INCIDENT_KEY, JSON.stringify(incidents));
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

  function setChip(el, label, className) {
    if (!el) return;
    el.textContent = label;
    el.classList.remove("success", "warn", "fail");
    if (className) {
      el.classList.add(className);
    }
  }

  function updateStepStatus(index, status) {
    const step = stepEls[index];
    if (!step) return;
    step.dataset.status = status;
    const label = step.querySelector(".step-status");
    if (label) {
      label.textContent = pipelineLabels[status] || status;
    }
  }

  function setPipelineQueued() {
    if (!stepEls.length) return;
    currentIndex = 0;
    stepEls.forEach((_, index) => updateStepStatus(index, "queued"));
    localStorage.setItem(STEP_KEY, String(currentIndex));
  }

  function setPipelineSucceeded() {
    if (!stepEls.length) return;
    currentIndex = Math.max(stepEls.length - 1, 0);
    stepEls.forEach((_, index) => updateStepStatus(index, "success"));
    localStorage.setItem(STEP_KEY, String(currentIndex));
  }

  function setPipelineFailed() {
    if (!stepEls.length) return;
    if (currentIndex >= stepEls.length) {
      currentIndex = stepEls.length - 1;
    }
    stepEls.forEach((_, index) => {
      const status = index < currentIndex ? "success" : index === currentIndex ? "failed" : "queued";
      updateStepStatus(index, status);
    });
    localStorage.setItem(STEP_KEY, String(currentIndex));
  }

  function syncPipeline() {
    if (!stepEls.length) return;
    if (currentIndex >= stepEls.length || currentIndex < 0) {
      currentIndex = 0;
    }
    stepEls.forEach((_, index) => {
      const status = index < currentIndex ? "success" : index === currentIndex ? "running" : "queued";
      updateStepStatus(index, status);
    });
    localStorage.setItem(STEP_KEY, String(currentIndex));
  }

  function setReleaseState(state, reason) {
    if (!statusLabels[state]) return;
    const previous = releaseState;
    releaseState = state;
    localStorage.setItem(RELEASE_STATE_KEY, releaseState);

    if (reason && previous !== state) {
      pushLog(`${statusLabels[state]}: ${reason}`);
    }

    updateReleaseTags();
    updateControlState();

    const shouldRun = releaseState === "running";
    if (simulationOn !== shouldRun) {
      simulationOn = shouldRun;
      window.devopsApp?.setSimulationState?.(simulationOn);
    }

    if (releaseState === "queued") {
      setPipelineQueued();
      return;
    }

    if (releaseState === "succeeded") {
      setPipelineSucceeded();
      return;
    }

    if (releaseState === "failed" || releaseState === "rolled-back") {
      setPipelineFailed();
      return;
    }

    if (releaseState === "running") {
      syncPipeline();
    }
  }

  function updateReleaseTags() {
    const label = statusLabels[releaseState] || releaseState;
    const className = statusClasses[releaseState] || "";

    [runStateEl, releaseStateBadgeEl].forEach((el) => {
      if (!el) return;
      el.textContent = label;
      el.className = `tag ${className}`.trim();
    });

    stateItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.state === releaseState);
    });
  }

  function updateAlertState(label, className) {
    if (!alertStateEl) return;
    alertStateEl.textContent = label;
    alertStateEl.className = `tag ${className}`.trim();
  }

  function updateQaState(label, className) {
    if (!qaStateEl) return;
    qaStateEl.textContent = label;
    qaStateEl.className = `tag ${className}`.trim();
  }

  function evaluatePolicies() {
    const approvalsOk = approvals >= 2;
    const driftOk = !incidents.terraformDrift;
    const canaryOk = !incidents.canaryFailed;
    return { approvalsOk, driftOk, canaryOk };
  }

  function updatePolicySignals() {
    const { approvalsOk, driftOk, canaryOk } = evaluatePolicies();

    if (policyApprovalsEl) {
      policyApprovalsEl.textContent = approvalsOk ? "Passing" : "Pending";
      policyApprovalsEl.className = `policy-status ${approvalsOk ? "success" : "warn"}`.trim();
    }

    if (policyDriftEl) {
      policyDriftEl.textContent = driftOk ? "Passing" : "Failing";
      policyDriftEl.className = `policy-status ${driftOk ? "success" : "fail"}`.trim();
    }

    if (policyCanaryEl) {
      policyCanaryEl.textContent = canaryOk ? "Passing" : "Failing";
      policyCanaryEl.className = `policy-status ${canaryOk ? "success" : "fail"}`.trim();
    }

    if (approvalCountEl) {
      approvalCountEl.textContent = `${approvals}/2`;
    }

    return { approvalsOk, driftOk, canaryOk };
  }

  function getIncidentBlocks() {
    const reasons = [];
    if (incidents.terraformDrift) reasons.push("Terraform drift detected");
    if (incidents.jenkinsQueue) reasons.push("Jenkins queue full");
    if (incidents.jenkinsNode) reasons.push("Jenkins node down");
    if (incidents.serviceUnhealthy) reasons.push("Service unhealthy");
    return reasons;
  }

  function getBlockingReasons() {
    const reasons = [];
    if (approvals < 2) reasons.push("Approvals pending");
    return reasons.concat(getIncidentBlocks());
  }

  function getCriticalReason() {
    if (incidents.deploymentTimeout) return "Deployment timeout detected";
    if (incidents.canaryFailed) return "Canary failed";
    return "";
  }

  function applyReleaseConstraints() {
    const criticalReason = getCriticalReason();
    if (criticalReason && ["running", "queued", "blocked"].includes(releaseState)) {
      setReleaseState("failed", criticalReason);
      return;
    }

    if (["running", "queued"].includes(releaseState)) {
      const reasons = getIncidentBlocks();
      if (reasons.length) {
        setReleaseState("blocked", reasons[0]);
      }
    }
  }

  function updateIncidentsUI() {
    incidentButtons.forEach((button) => {
      const key = button.dataset.incident;
      button.classList.toggle("active", Boolean(incidents[key]));
    });

    const active = Object.keys(incidents).filter((key) => incidents[key]);
    const criticalActive = active.filter((key) => criticalIncidents.includes(key));

    if (incidentBadgeEl) {
      if (criticalActive.length) {
        incidentBadgeEl.textContent = "Critical";
        incidentBadgeEl.className = "tag failed";
      } else if (active.length) {
        incidentBadgeEl.textContent = "Degraded";
        incidentBadgeEl.className = "tag warn";
      } else {
        incidentBadgeEl.textContent = "Stable";
        incidentBadgeEl.className = "tag stable";
      }
    }

    if (incidentSummaryEl) {
      if (!active.length) {
        incidentSummaryEl.textContent = "0 incidents active";
      } else {
        const labels = active.map((key) => incidentLabels[key] || key).join(", ");
        incidentSummaryEl.textContent = `${active.length} incident(s) active: ${labels}`;
      }
    }
  }

  function updateCoreStatus() {
    const jenkinsIssues = [];
    if (incidents.jenkinsQueue) jenkinsIssues.push("Queue full");
    if (incidents.jenkinsNode) jenkinsIssues.push("Node down");

    if (jenkinsIssues.length) {
      setChip(jenkinsStatusEl, "Degraded", "warn");
      if (jenkinsDetailEl) {
        jenkinsDetailEl.textContent = `Jenkins issues: ${jenkinsIssues.join(", ")}.`;
      }
      if (jenkinsExecutorsEl) jenkinsExecutorsEl.textContent = "Executors: 4/8";
      if (jenkinsQueueEl) jenkinsQueueEl.textContent = incidents.jenkinsQueue ? "Queue: 18" : "Queue: 6";
    } else {
      setChip(jenkinsStatusEl, "Healthy", "success");
      if (jenkinsDetailEl) {
        jenkinsDetailEl.textContent = "Build queue and nodes within capacity.";
      }
      if (jenkinsExecutorsEl) jenkinsExecutorsEl.textContent = "Executors: 6/8";
      if (jenkinsQueueEl) jenkinsQueueEl.textContent = "Queue: 0";
    }

    if (incidents.terraformDrift) {
      setChip(terraformStatusEl, "Drift", "warn");
      if (terraformDetailEl) {
        terraformDetailEl.textContent = "Drift detected across infrastructure resources.";
      }
      if (terraformDriftEl) terraformDriftEl.textContent = "Drift: 2 resources";
      if (terraformPlanEl) terraformPlanEl.textContent = "Plan: review needed";
    } else {
      setChip(terraformStatusEl, "Clean", "success");
      if (terraformDetailEl) {
        terraformDetailEl.textContent = "No drift detected across modules.";
      }
      if (terraformDriftEl) terraformDriftEl.textContent = "Drift: 0 resources";
      if (terraformPlanEl) terraformPlanEl.textContent = "Plan: ready";
    }

    let ansibleRate = 98;
    if (incidents.deploymentTimeout || incidents.canaryFailed) {
      ansibleRate = 72;
    } else if (incidents.serviceUnhealthy) {
      ansibleRate = 88;
    }

    const ansibleStatus = ansibleRate >= 95 ? "success" : ansibleRate >= 85 ? "warn" : "fail";
    const ansibleLabel = ansibleStatus === "success" ? "Stable" : ansibleStatus === "warn" ? "Degraded" : "Critical";
    setChip(ansibleStatusEl, ansibleLabel, ansibleStatus);
    if (ansibleDetailEl) {
      ansibleDetailEl.textContent = "Playbook success rate holding steady.";
    }
    if (ansibleRateEl) ansibleRateEl.textContent = `Success: ${ansibleRate}%`;
    if (ansibleDeployEl) ansibleDeployEl.textContent = "Deploys: 12";

    let monitoringLabel = "Green";
    let monitoringClass = "success";
    if (incidents.deploymentTimeout || incidents.canaryFailed) {
      monitoringLabel = "Red";
      monitoringClass = "fail";
    } else if (incidents.serviceUnhealthy) {
      monitoringLabel = "Yellow";
      monitoringClass = "warn";
    }
    setChip(monitoringStatusEl, monitoringLabel, monitoringClass);
    if (monitoringDetailEl) {
      monitoringDetailEl.textContent = "Metrics and alerts within thresholds.";
    }

    const anyCritical = criticalIncidents.some((key) => incidents[key]);
    const anyIssues = Object.keys(incidents).some((key) => incidents[key]);
    if (coreStateEl) {
      if (anyCritical) {
        coreStateEl.textContent = "Critical";
        coreStateEl.className = "tag failed";
      } else if (anyIssues) {
        coreStateEl.textContent = "Degraded";
        coreStateEl.className = "tag warn";
      } else {
        coreStateEl.textContent = "Stable";
        coreStateEl.className = "tag stable";
      }
    }

    if (monitoringAlertsEl) monitoringAlertsEl.textContent = "Alerts: 3";
    if (monitoringTargetsEl) monitoringTargetsEl.textContent = "Targets: 142";
  }

  function updateMetrics() {
    metricState.reqRate = clamp(metricState.reqRate + randomBetween(-60, 80), 980, 1600);
    metricState.errRate = clamp(metricState.errRate + randomBetween(-0.08, 0.1), 0.2, 1.6);
    metricState.latency = clamp(metricState.latency + randomBetween(-18, 24), 160, 360);

    if (reqRateEl) reqRateEl.textContent = `${formatNumber(metricState.reqRate)} rpm`;
    if (errRateEl) errRateEl.textContent = `${metricState.errRate.toFixed(2)}%`;
    if (latencyEl) latencyEl.textContent = `${Math.round(metricState.latency)} ms`;

    if (charts.length >= 3) {
      charts[0].values = shiftValue(charts[0].values, metricState.reqRate / 20);
      charts[1].values = shiftValue(charts[1].values, metricState.errRate * 60);
      charts[2].values = shiftValue(charts[2].values, metricState.latency / 4);
    }

    charts.forEach(drawSparkline);

    if (metricState.errRate > 1.2) {
      updateAlertState("Attention", "warn");
    } else {
      updateAlertState("All Clear", "");
    }
  }

  function updateQaMetrics() {
    qaState.duration = clamp(qaState.duration + randomBetween(-5, 6), 160, 260);
    qaState.coverage = clamp(qaState.coverage + randomBetween(-1, 1.2), 80, 90);

    if (qaDurationEl) {
      qaDurationEl.textContent = `${Math.floor(qaState.duration / 60)}m ${Math.round(
        qaState.duration % 60
      )}s`;
    }
    if (qaCoverageEl) qaCoverageEl.textContent = `${Math.round(qaState.coverage)}%`;
    if (qaTotalEl) qaTotalEl.textContent = String(qaState.total);
    if (qaPassedEl) qaPassedEl.textContent = String(qaState.passed);
    if (qaFailedEl) qaFailedEl.textContent = String(qaState.failed);
    if (qaFlakyEl) qaFlakyEl.textContent = String(qaState.flaky);

    const passRate = qaState.passed / qaState.total;
    if (passRate < 0.95 || qaState.failed > 3) {
      updateQaState("Risk", "warn");
    } else {
      updateQaState("Green", "");
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function shiftValue(values, nextValue) {
    const updated = values.slice(1);
    updated.push(nextValue);
    return updated;
  }

  function drawSparkline({ canvas, color, values }) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padding = 6;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = `${color}22`;
    ctx.fill();
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  }

  function pushLog(message) {
    if (!logList) return;
    const timestamp = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
    });
    const entry = document.createElement("li");
    entry.textContent = `[${timestamp}] ${message}`;
    logList.prepend(entry);
    while (logList.children.length > 8) {
      logList.removeChild(logList.lastChild);
    }
  }

  function getRole() {
    return window.devopsApp?.getRole?.() || document.documentElement.dataset.role || "user";
  }

  function updateControlState() {
    if (pauseReleaseBtn) {
      pauseReleaseBtn.disabled = releaseState !== "running";
    }

    if (resumeReleaseBtn) {
      resumeReleaseBtn.disabled = !["paused", "blocked", "queued"].includes(releaseState);
    }

    if (approveReleaseBtn) {
      approveReleaseBtn.disabled = approvals >= 2 || ["succeeded", "failed", "rolled-back"].includes(releaseState);
    }

    if (rejectReleaseBtn) {
      rejectReleaseBtn.disabled = ["succeeded", "rolled-back"].includes(releaseState);
    }

    if (rollbackReleaseBtn) {
      rollbackReleaseBtn.disabled = releaseState === "queued";
    }
  }

  function syncRunMetadata() {
    if (buildIdEl) buildIdEl.textContent = `REL-${runNumber}`;
    if (commitEl) commitEl.textContent = commitHash;
  }

  function startNewRun(reason) {
    runNumber += 1;
    commitHash = randomHash();
    localStorage.setItem(RUN_KEY, String(runNumber));
    localStorage.setItem(COMMIT_KEY, commitHash);
    localStorage.setItem(STEP_KEY, "0");
    currentIndex = 0;

    if (buildIdEl) buildIdEl.textContent = `REL-${runNumber}`;
    if (commitEl) commitEl.textContent = commitHash;
    pushLog(`Release REL-${runNumber} queued. ${reason}`);
  }

  function advancePipeline() {
    if (!simulationOn || releaseState !== "running") return;
    if (!stepEls.length) return;

    updateStepStatus(currentIndex, "success");
    pushLog(`${stepEls[currentIndex].querySelector(".step-title").textContent} completed.`);

    currentIndex += 1;
    if (currentIndex >= stepEls.length) {
      setReleaseState("succeeded", "Release completed successfully.");
      return;
    }

    updateStepStatus(currentIndex, "running");
    for (let i = currentIndex + 1; i < stepEls.length; i += 1) {
      updateStepStatus(i, "queued");
    }

    localStorage.setItem(STEP_KEY, String(currentIndex));
  }

  function handleTrigger() {
    if (getRole() !== "admin") return;
    approvals = 0;
    localStorage.setItem(APPROVAL_KEY, String(approvals));
    updatePolicySignals();
    startNewRun("Manual trigger");
    setReleaseState("queued", "Release triggered by admin");
    applyReleaseConstraints();
  }

  function handlePause() {
    if (getRole() !== "admin") return;
    setReleaseState("paused", "Release paused by admin");
  }

  function handleResume() {
    const role = getRole();
    if (!["admin", "operator"].includes(role)) return;

    const criticalReason = getCriticalReason();
    if (criticalReason) {
      setReleaseState("failed", criticalReason);
      return;
    }

    const reasons = getBlockingReasons();
    if (reasons.length) {
      setReleaseState("blocked", `Resume blocked: ${reasons[0]}`);
      return;
    }

    setReleaseState("running", "Release resumed");
  }

  function handleApprove() {
    if (getRole() !== "admin") return;
    if (approvals >= 2) return;
    approvals += 1;
    localStorage.setItem(APPROVAL_KEY, String(approvals));
    updatePolicySignals();
    pushLog(`Approval recorded (${approvals}/2).`);

    const { approvalsOk } = evaluatePolicies();
    if (approvalsOk && ["queued", "blocked"].includes(releaseState)) {
      const criticalReason = getCriticalReason();
      if (criticalReason) {
        setReleaseState("failed", criticalReason);
        return;
      }
      const reasons = getBlockingReasons();
      if (reasons.length) {
        setReleaseState("blocked", `Policy blocked: ${reasons[0]}`);
        return;
      }
      setReleaseState("running", "Approval threshold reached");
    }
  }

  function handleReject() {
    if (getRole() !== "admin") return;
    approvals = 0;
    localStorage.setItem(APPROVAL_KEY, String(approvals));
    updatePolicySignals();
    setReleaseState("blocked", "Release rejected by admin");
  }

  function handleRollback() {
    if (getRole() !== "admin") return;
    setReleaseState("rolled-back", "Rollback executed");
  }

  function toggleIncident(key) {
    incidents[key] = !incidents[key];
    saveIncidentState();
    updateIncidentsUI();
    updatePolicySignals();
    updateCoreStatus();
    applyReleaseConstraints();
    const label = incidentLabels[key] || key;
    pushLog(`${label} ${incidents[key] ? "enabled" : "cleared"}.`);
  }

  function applyRecovery(action) {
    if (action === "terraformDrift") {
      incidents.terraformDrift = false;
      pushLog("Terraform drift cleared.");
    }
    if (action === "jenkinsCapacity") {
      incidents.jenkinsQueue = false;
      incidents.jenkinsNode = false;
      pushLog("Jenkins capacity restored.");
    }
    if (action === "serviceHealthy") {
      incidents.serviceUnhealthy = false;
      pushLog("Service health restored.");
    }

    saveIncidentState();
    updateIncidentsUI();
    updatePolicySignals();
    updateCoreStatus();
    applyReleaseConstraints();
  }

  if (triggerRunBtn) {
    triggerRunBtn.addEventListener("click", handleTrigger);
  }
  if (pauseReleaseBtn) {
    pauseReleaseBtn.addEventListener("click", handlePause);
  }
  if (resumeReleaseBtn) {
    resumeReleaseBtn.addEventListener("click", handleResume);
  }
  if (approveReleaseBtn) {
    approveReleaseBtn.addEventListener("click", handleApprove);
  }
  if (rejectReleaseBtn) {
    rejectReleaseBtn.addEventListener("click", handleReject);
  }
  if (rollbackReleaseBtn) {
    rollbackReleaseBtn.addEventListener("click", handleRollback);
  }

  incidentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.incident;
      if (key) {
        toggleIncident(key);
      }
    });
  });

  recoveryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.recovery;
      if (action) {
        applyRecovery(action);
      }
    });
  });

  document.addEventListener("role:change", () => {
    updateControlState();
  });

  window.addEventListener("resize", () => {
    charts.forEach(drawSparkline);
  });

  syncRunMetadata();
  updateReleaseTags();
  window.devopsApp?.setSimulationState?.(simulationOn);
  updatePolicySignals();
  updateIncidentsUI();
  updateCoreStatus();
  updateControlState();
  applyReleaseConstraints();
  updateMetrics();
  updateQaMetrics();

  if (releaseState === "running") {
    syncPipeline();
  } else if (releaseState === "queued") {
    setPipelineQueued();
  } else if (releaseState === "succeeded") {
    setPipelineSucceeded();
  } else if (releaseState === "failed" || releaseState === "rolled-back") {
    setPipelineFailed();
  }

  setInterval(advancePipeline, 4200);
  setInterval(updateMetrics, 2000);
  setInterval(updateQaMetrics, 4200);
})();
