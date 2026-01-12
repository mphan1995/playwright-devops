(() => {
  if (document.body.dataset.page !== "services") {
    return;
  }

  const serviceGrid = document.getElementById("serviceGrid");
  const serviceBanner = document.getElementById("serviceBanner");
  const serviceEmpty = document.getElementById("serviceEmpty");
  const criticalCountEl = document.getElementById("criticalCount");
  const degradedCountEl = document.getElementById("degradedCount");
  const serviceUpdatedEl = document.getElementById("serviceUpdated");
  const toggleFailureBtn = document.getElementById("toggleServiceFailure");
  const retryBtn = document.getElementById("retryServiceLoad");

  const simulateBudgetBurnBtn = document.getElementById("simulateBudgetBurn");
  const resetSloBtn = document.getElementById("resetSlo");
  const sloStatusBadgeEl = document.getElementById("sloStatusBadge");
  const sloAvailabilityEl = document.getElementById("sloAvailability");
  const sloLatencyEl = document.getElementById("sloLatency");
  const sloBudgetEl = document.getElementById("sloBudget");
  const sloTracingEl = document.getElementById("sloTracing");
  const sloAvailabilityStatusEl = document.getElementById("sloAvailabilityStatus");
  const sloLatencyStatusEl = document.getElementById("sloLatencyStatus");
  const sloBudgetStatusEl = document.getElementById("sloBudgetStatus");
  const sloTracingStatusEl = document.getElementById("sloTracingStatus");
  const sloSummaryEl = document.getElementById("sloSummary");

  const runIsoAuditBtn = document.getElementById("runIsoAudit");
  const residencySelect = document.getElementById("residencySelect");
  const residencyBadgeEl = document.getElementById("residencyBadge");
  const isoSummaryEl = document.getElementById("isoSummary");
  const isoStatusEls = {
    iso27001: document.getElementById("iso27001Status"),
    iso27017: document.getElementById("iso27017Status"),
    iso9001: document.getElementById("iso9001Status"),
    iso22301: document.getElementById("iso22301Status"),
    gdpr: document.getElementById("gdprStatus"),
    nis2: document.getElementById("nis2Status"),
  };

  const SERVICE_FAIL_KEY = "devops-services-fail";
  const ISO_KEY = "devops-iso";
  const RESIDENCY_KEY = "devops-residency";
  const SLO_KEY = "devops-slo";

  const baseServices = [
    {
      name: "api-gateway",
      status: "healthy",
      latency: "120 ms",
      traffic: "2.1k rpm",
    },
    {
      name: "auth-service",
      status: "healthy",
      latency: "98 ms",
      traffic: "840 rpm",
    },
    {
      name: "checkout-service",
      status: "degraded",
      latency: "310 ms",
      traffic: "620 rpm",
    },
    {
      name: "inventory",
      status: "healthy",
      latency: "140 ms",
      traffic: "1.5k rpm",
    },
    {
      name: "notifications",
      status: "healthy",
      latency: "76 ms",
      traffic: "430 rpm",
    },
    {
      name: "edge-cache",
      status: "healthy",
      latency: "18 ms",
      traffic: "5.2k rpm",
    },
  ];

  const statusMap = {
    healthy: { label: "Healthy", className: "success" },
    degraded: { label: "Degraded", className: "warn" },
    down: { label: "Down", className: "fail" },
    unknown: { label: "Unknown", className: "warn" },
  };

  const isoStatusMap = {
    compliant: { label: "Compliant", className: "success" },
    review: { label: "Review", className: "warn" },
    gap: { label: "Gap", className: "fail" },
  };

  const sloPresets = {
    healthy: {
      availability: 99.95,
      latency: 180,
      budget: 14,
      tracing: 96,
    },
    burn: {
      availability: 99.5,
      latency: 320,
      budget: 4,
      tracing: 84,
    },
  };

  const sloLabelMap = {
    availability: { success: "On Target", warn: "At Risk", fail: "Breached" },
    latency: { success: "On Target", warn: "At Risk", fail: "Breached" },
    budget: { success: "Healthy", warn: "Low", fail: "Depleted" },
    tracing: { success: "On Target", warn: "At Risk", fail: "Breached" },
  };

  const regionLabels = {
    "ap-southeast-1": "APAC",
    "eu-west-1": "EU West",
  };

  let currentRegion = getStoredRegion();
  let isoState = loadIsoState();
  let sloState = loadSloState();

  function getFailureFlag() {
    return localStorage.getItem(SERVICE_FAIL_KEY) === "true";
  }

  function setFailureFlag(value) {
    localStorage.setItem(SERVICE_FAIL_KEY, value ? "true" : "false");
  }

  function getStoredRegion() {
    const stored = localStorage.getItem(RESIDENCY_KEY);
    return stored === "eu-west-1" ? "eu-west-1" : "ap-southeast-1";
  }

  function setStoredRegion(region) {
    localStorage.setItem(RESIDENCY_KEY, region);
  }

  function normalizeIsoState(value) {
    return ["compliant", "review", "gap"].includes(value) ? value : "review";
  }

  function createIsoState() {
    return {
      iso27001: "compliant",
      iso27017: "compliant",
      iso9001: "compliant",
      iso22301: "review",
      gdpr: "compliant",
      nis2: "review",
    };
  }

  function loadIsoState() {
    const stored = localStorage.getItem(ISO_KEY);
    if (!stored) {
      return createIsoState();
    }
    try {
      const parsed = JSON.parse(stored);
      return {
        iso27001: normalizeIsoState(parsed.iso27001),
        iso27017: normalizeIsoState(parsed.iso27017),
        iso9001: normalizeIsoState(parsed.iso9001),
        iso22301: normalizeIsoState(parsed.iso22301),
        gdpr: normalizeIsoState(parsed.gdpr),
        nis2: normalizeIsoState(parsed.nis2),
      };
    } catch (error) {
      return createIsoState();
    }
  }

  function saveIsoState(next) {
    localStorage.setItem(ISO_KEY, JSON.stringify(next));
  }

  function loadSloState() {
    const stored = localStorage.getItem(SLO_KEY);
    if (!stored) {
      return { mode: "healthy" };
    }
    try {
      const parsed = JSON.parse(stored);
      return { mode: parsed.mode === "burn" ? "burn" : "healthy" };
    } catch (error) {
      return { mode: "healthy" };
    }
  }

  function saveSloState(next) {
    localStorage.setItem(SLO_KEY, JSON.stringify(next));
  }

  function isForcedFailure() {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("fail");
    return forced === "1" || forced === "true";
  }

  function shouldFail() {
    return isForcedFailure() || getFailureFlag();
  }

  function setStatusChip(el, label, className) {
    if (!el) return;
    el.textContent = label;
    el.classList.remove("success", "warn", "fail");
    if (className) {
      el.classList.add(className);
    }
  }

  function updateBanner(state, message) {
    if (!serviceBanner) return;
    serviceBanner.textContent = message;
    serviceBanner.classList.remove("degraded", "failed");
    if (state === "degraded") {
      serviceBanner.classList.add("degraded");
    }
    if (state === "failed") {
      serviceBanner.classList.add("failed");
    }
  }

  function updateResidencyBadge() {
    if (!residencyBadgeEl) return;
    const label = regionLabels[currentRegion] || currentRegion;
    residencyBadgeEl.textContent = `Residency: ${label}`;
  }

  function renderServices(services) {
    if (!serviceGrid) return;
    serviceGrid.innerHTML = "";

    services.forEach((service) => {
      const status = statusMap[service.status] || statusMap.unknown;
      const card = document.createElement("div");
      card.className = "service-card";
      card.innerHTML = `
        <h4>${service.name}</h4>
        <div class="service-status">
          <span>Latency: ${service.latency}</span>
          <span class="status-chip ${status.className}">${status.label}</span>
        </div>
        <div class="service-status">
          <span>Traffic: ${service.traffic}</span>
          <span>Zone: ${currentRegion}</span>
        </div>
      `;
      serviceGrid.appendChild(card);
    });

    const degradedCount = services.filter((service) => service.status !== "healthy").length;
    if (criticalCountEl) criticalCountEl.textContent = String(services.length);
    if (degradedCountEl) degradedCountEl.textContent = String(degradedCount);
    if (serviceUpdatedEl) {
      serviceUpdatedEl.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
    }
  }

  function renderFailure() {
    if (!serviceGrid) return;
    const fallback = baseServices.slice(0, 4).map((service) => ({
      ...service,
      status: "unknown",
      latency: "n/a",
      traffic: "n/a",
    }));

    renderServices(fallback);
    updateBanner("failed", "Telemetry feed offline. Showing last cached snapshot.");

    if (serviceEmpty) {
      serviceEmpty.hidden = false;
    }
  }

  function resetFailureView() {
    if (serviceEmpty) {
      serviceEmpty.hidden = true;
    }
  }

  function simulateFetch() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldFail()) {
          reject(new Error("Telemetry feed offline"));
          return;
        }
        resolve(baseServices);
      }, 600);
    });
  }

  function updateToggleLabel() {
    if (!toggleFailureBtn) return;
    if (isForcedFailure()) {
      toggleFailureBtn.textContent = "Failure Locked";
      toggleFailureBtn.disabled = true;
      return;
    }

    toggleFailureBtn.disabled = false;
    const locked = shouldFail();
    toggleFailureBtn.textContent = locked ? "Disable Failure" : "Simulate Failure";
  }

  function updateIsoUI() {
    const counts = { compliant: 0, review: 0, gap: 0 };

    Object.keys(isoStatusEls).forEach((key) => {
      const status = isoState[key] || "review";
      const map = isoStatusMap[status] || isoStatusMap.review;
      counts[status] = (counts[status] || 0) + 1;
      setStatusChip(isoStatusEls[key], map.label, map.className);
    });

    if (isoSummaryEl) {
      if (counts.gap > 0) {
        isoSummaryEl.textContent = `${counts.gap} control gap(s) require action.`;
      } else if (counts.review > 0) {
        isoSummaryEl.textContent = `${counts.review} control(s) under review.`;
      } else {
        isoSummaryEl.textContent = "All controls compliant.";
      }
    }
  }

  function cycleIsoState() {
    const cycle = {
      compliant: "review",
      review: "gap",
      gap: "compliant",
    };
    const next = {};
    Object.keys(isoStatusEls).forEach((key) => {
      const current = isoState[key] || "review";
      next[key] = cycle[current] || "review";
    });
    isoState = next;
    saveIsoState(next);
    updateIsoUI();
  }

  function getSloSnapshot() {
    return sloPresets[sloState.mode] || sloPresets.healthy;
  }

  function statusHigher(value, good, warn, labels) {
    if (value >= good) {
      return { label: labels.success, className: "success", level: 0 };
    }
    if (value >= warn) {
      return { label: labels.warn, className: "warn", level: 1 };
    }
    return { label: labels.fail, className: "fail", level: 2 };
  }

  function statusLower(value, good, warn, labels) {
    if (value <= good) {
      return { label: labels.success, className: "success", level: 0 };
    }
    if (value <= warn) {
      return { label: labels.warn, className: "warn", level: 1 };
    }
    return { label: labels.fail, className: "fail", level: 2 };
  }

  function updateSloUI() {
    const snapshot = getSloSnapshot();

    if (sloAvailabilityEl) sloAvailabilityEl.textContent = `${snapshot.availability.toFixed(2)}%`;
    if (sloLatencyEl) sloLatencyEl.textContent = `${Math.round(snapshot.latency)} ms`;
    if (sloBudgetEl) sloBudgetEl.textContent = `${Math.round(snapshot.budget)}%`;
    if (sloTracingEl) sloTracingEl.textContent = `${Math.round(snapshot.tracing)}%`;

    const availabilityStatus = statusHigher(
      snapshot.availability,
      99.9,
      99.7,
      sloLabelMap.availability
    );
    const latencyStatus = statusLower(
      snapshot.latency,
      250,
      300,
      sloLabelMap.latency
    );
    const budgetStatus = statusHigher(
      snapshot.budget,
      10,
      6,
      sloLabelMap.budget
    );
    const tracingStatus = statusHigher(
      snapshot.tracing,
      90,
      85,
      sloLabelMap.tracing
    );

    setStatusChip(sloAvailabilityStatusEl, availabilityStatus.label, availabilityStatus.className);
    setStatusChip(sloLatencyStatusEl, latencyStatus.label, latencyStatus.className);
    setStatusChip(sloBudgetStatusEl, budgetStatus.label, budgetStatus.className);
    setStatusChip(sloTracingStatusEl, tracingStatus.label, tracingStatus.className);

    const maxLevel = Math.max(
      availabilityStatus.level,
      latencyStatus.level,
      budgetStatus.level,
      tracingStatus.level
    );

    if (sloStatusBadgeEl) {
      if (maxLevel === 2) {
        sloStatusBadgeEl.textContent = "Critical";
        sloStatusBadgeEl.className = "tag failed";
      } else if (maxLevel === 1) {
        sloStatusBadgeEl.textContent = "Warning";
        sloStatusBadgeEl.className = "tag warn";
      } else {
        sloStatusBadgeEl.textContent = "Healthy";
        sloStatusBadgeEl.className = "tag stable";
      }
    }

    if (sloSummaryEl) {
      if (maxLevel === 2) {
        sloSummaryEl.textContent = "Error budget burn detected. Mitigation required.";
      } else if (maxLevel === 1) {
        sloSummaryEl.textContent = "SLO drift detected. Review alert thresholds.";
      } else {
        sloSummaryEl.textContent = "Error budget stable across services.";
      }
    }
  }

  async function loadServices() {
    resetFailureView();
    updateBanner("healthy", "Telemetry feed healthy.");

    try {
      const data = await simulateFetch();
      renderServices(data);
      const degradedCount = data.filter((service) => service.status === "degraded").length;
      if (degradedCount > 0) {
        updateBanner("degraded", "Degraded services detected. Fallbacks enabled.");
      }
    } catch (error) {
      renderFailure();
    } finally {
      updateToggleLabel();
    }
  }

  if (toggleFailureBtn) {
    toggleFailureBtn.addEventListener("click", () => {
      if (isForcedFailure()) {
        return;
      }
      setFailureFlag(!getFailureFlag());
      loadServices();
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      loadServices();
    });
  }

  if (simulateBudgetBurnBtn) {
    simulateBudgetBurnBtn.addEventListener("click", () => {
      sloState = { mode: "burn" };
      saveSloState(sloState);
      updateSloUI();
    });
  }

  if (resetSloBtn) {
    resetSloBtn.addEventListener("click", () => {
      sloState = { mode: "healthy" };
      saveSloState(sloState);
      updateSloUI();
    });
  }

  if (runIsoAuditBtn) {
    runIsoAuditBtn.addEventListener("click", () => {
      cycleIsoState();
    });
  }

  if (residencySelect) {
    residencySelect.value = currentRegion;
    residencySelect.addEventListener("change", () => {
      currentRegion = residencySelect.value === "eu-west-1" ? "eu-west-1" : "ap-southeast-1";
      setStoredRegion(currentRegion);
      updateResidencyBadge();
      loadServices();
    });
  }

  updateResidencyBadge();
  updateIsoUI();
  updateSloUI();
  loadServices();
})();
