(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { utils, state } = dashboard;
  const STORAGE_KEY = "devops-labs";

  let dom = {};

  function refreshDom() {
    dom = {
      badge: document.getElementById("testLabBadge"),
      perfStatus: document.getElementById("perfLabStatus"),
      perfScenarioSelect: document.getElementById("perfScenarioSelect"),
      perfProfileSelect: document.getElementById("perfProfileSelect"),
      perfTargetRps: document.getElementById("perfTargetRps"),
      perfBudget: document.getElementById("perfBudget"),
      perfDuration: document.getElementById("perfDuration"),
      perfStartBtn: document.getElementById("perfStartBtn"),
      perfRampBtn: document.getElementById("perfRampBtn"),
      perfStopBtn: document.getElementById("perfStopBtn"),
      perfSummary: document.getElementById("perfLabSummary"),
      uiStatus: document.getElementById("uiLabStatus"),
      uiTraceToggle: document.getElementById("uiTraceToggle"),
      uiVideoToggle: document.getElementById("uiVideoToggle"),
      uiThrottleToggle: document.getElementById("uiThrottleToggle"),
      uiDeviceSelect: document.getElementById("uiDeviceSelect"),
      uiRunBtn: document.getElementById("uiRunBtn"),
      uiCaptureBtn: document.getElementById("uiCaptureBtn"),
      uiStopBtn: document.getElementById("uiStopBtn"),
      uiSummary: document.getElementById("uiLabSummary"),
      uiLastRun: document.getElementById("uiLastRun"),
    };
  }

  const profiles = {
    baseline: { label: "Baseline", rps: 1800, budget: "12%", duration: "15m", metricProfile: "load" },
    stress: { label: "Stress", rps: 2400, budget: "8%", duration: "10m", metricProfile: "spike" },
    soak: { label: "Soak", rps: 1200, budget: "18%", duration: "45m", metricProfile: "load" },
  };

  const scenarios = {
    checkout: "Checkout Flow",
    search: "Search + Filters",
    payments: "Payments Burst",
    edge: "Edge Cache",
  };

  const devices = {
    desktop: "Desktop Chrome",
    tablet: "Tablet Edge",
    mobile: "Mobile Safari",
  };

  function buildDefaultState() {
    return {
      perf: {
        running: false,
        scenario: "checkout",
        profile: "baseline",
        lastStatus: "idle",
      },
      ui: {
        running: false,
        trace: true,
        video: true,
        throttle: false,
        device: "desktop",
        lastRun: null,
        lastStatus: "N/A",
      },
    };
  }

  function loadState() {
    const fallback = buildDefaultState();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    try {
      const parsed = JSON.parse(stored);
      return {
        perf: {
          running: Boolean(parsed.perf?.running),
          scenario: scenarios[parsed.perf?.scenario] ? parsed.perf.scenario : fallback.perf.scenario,
          profile: profiles[parsed.perf?.profile] ? parsed.perf.profile : fallback.perf.profile,
          lastStatus: typeof parsed.perf?.lastStatus === "string" ? parsed.perf.lastStatus : fallback.perf.lastStatus,
        },
        ui: {
          running: Boolean(parsed.ui?.running),
          trace: parsed.ui?.trace !== false,
          video: parsed.ui?.video !== false,
          throttle: Boolean(parsed.ui?.throttle),
          device: devices[parsed.ui?.device] ? parsed.ui.device : fallback.ui.device,
          lastRun: typeof parsed.ui?.lastRun === "string" ? parsed.ui.lastRun : null,
          lastStatus: typeof parsed.ui?.lastStatus === "string" ? parsed.ui.lastStatus : fallback.ui.lastStatus,
        },
      };
    } catch (error) {
      return fallback;
    }
  }

  let labState = loadState();
  let uiTimer = null;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labState));
  }

  function formatNumber(value) {
    if (utils?.formatNumber) return utils.formatNumber(value);
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  }

  function setChip(el, label, className) {
    if (utils?.setChip) {
      utils.setChip(el, label, className);
      return;
    }
    if (!el) return;
    el.textContent = label;
    el.classList.remove("success", "warn", "fail");
    if (className) el.classList.add(className);
  }

  function setTag(el, label, className) {
    if (!el) return;
    el.textContent = label;
    el.className = `tag ${className}`.trim();
  }

  function updateLabBadge() {
    const running = labState.perf.running || labState.ui.running;
    if (running) {
      setTag(dom.badge, "Running", "running");
      return;
    }
    setTag(dom.badge, "Idle", "queued");
  }

  function syncMetricProfile() {
    if (!state) return;
    const profile = profiles[labState.perf.profile] || profiles.baseline;
    if (labState.perf.running) {
      state.perfRunning = true;
      if (state.metricSpikeUntil && Date.now() < state.metricSpikeUntil) {
        state.metricProfile = "spike";
        return;
      }
      state.metricProfile = profile.metricProfile;
    } else {
      state.perfRunning = false;
      state.metricProfile = "normal";
      state.metricSpikeUntil = 0;
    }
  }

  function updatePerfUI() {
    if (!dom.badge) {
      refreshDom();
    }
    if (!dom.badge) return;
    if (dom.perfScenarioSelect) {
      dom.perfScenarioSelect.value = labState.perf.scenario;
    }
    if (dom.perfProfileSelect) {
      dom.perfProfileSelect.value = labState.perf.profile;
    }

    const profile = profiles[labState.perf.profile] || profiles.baseline;
    if (dom.perfTargetRps) {
      dom.perfTargetRps.textContent = `Target: ${formatNumber(profile.rps)} rps`;
    }
    if (dom.perfBudget) {
      dom.perfBudget.textContent = `Error budget: ${profile.budget}`;
    }
    if (dom.perfDuration) {
      dom.perfDuration.textContent = `Duration: ${profile.duration}`;
    }

    if (labState.perf.running) {
      setChip(dom.perfStatus, "Running", "warn");
      if (dom.perfSummary) {
        dom.perfSummary.textContent = `Running ${scenarios[labState.perf.scenario]} - ${profile.label} profile.`;
      }
      labState.perf.lastStatus = "running";
      if (dom.perfStartBtn) dom.perfStartBtn.disabled = true;
      if (dom.perfRampBtn) dom.perfRampBtn.disabled = false;
      if (dom.perfStopBtn) dom.perfStopBtn.disabled = false;
    } else if (labState.perf.lastStatus === "stopped") {
      setChip(dom.perfStatus, "Stopped", "fail");
      if (dom.perfSummary) {
        dom.perfSummary.textContent = "Load test stopped.";
      }
      if (dom.perfStartBtn) dom.perfStartBtn.disabled = false;
      if (dom.perfRampBtn) dom.perfRampBtn.disabled = true;
      if (dom.perfStopBtn) dom.perfStopBtn.disabled = true;
    } else {
      setChip(dom.perfStatus, "Ready", "success");
      if (dom.perfSummary) {
        dom.perfSummary.textContent = "No load test running.";
      }
      if (dom.perfStartBtn) dom.perfStartBtn.disabled = false;
      if (dom.perfRampBtn) dom.perfRampBtn.disabled = true;
      if (dom.perfStopBtn) dom.perfStopBtn.disabled = true;
    }

    syncMetricProfile();
    updateLabBadge();
  }

  function formatUiConfig() {
    const features = [];
    if (labState.ui.trace) features.push("trace");
    if (labState.ui.video) features.push("video");
    if (labState.ui.throttle) features.push("throttle");
    if (!features.length) return "no artifacts";
    return features.join(", ");
  }

  function formatLastRun() {
    if (!labState.ui.lastRun) return "Last run: N/A";
    const date = new Date(labState.ui.lastRun);
    if (Number.isNaN(date.getTime())) return "Last run: N/A";
    return `Last run: ${date.toLocaleTimeString("en-GB", { hour12: false })}`;
  }

  function updateUiUI() {
    if (!dom.badge) {
      refreshDom();
    }
    if (!dom.badge) return;
    if (dom.uiTraceToggle) dom.uiTraceToggle.checked = labState.ui.trace;
    if (dom.uiVideoToggle) dom.uiVideoToggle.checked = labState.ui.video;
    if (dom.uiThrottleToggle) dom.uiThrottleToggle.checked = labState.ui.throttle;
    if (dom.uiDeviceSelect) dom.uiDeviceSelect.value = labState.ui.device;

    if (labState.ui.running) {
      setChip(dom.uiStatus, "Running", "warn");
      if (dom.uiSummary) {
        dom.uiSummary.textContent = `Running on ${devices[labState.ui.device]} with ${formatUiConfig()}.`;
      }
      if (dom.uiRunBtn) dom.uiRunBtn.disabled = true;
      if (dom.uiStopBtn) dom.uiStopBtn.disabled = false;
    } else if (labState.ui.lastStatus === "Stopped") {
      setChip(dom.uiStatus, "Stopped", "fail");
      if (dom.uiSummary) {
        dom.uiSummary.textContent = "UI suite stopped.";
      }
      if (dom.uiRunBtn) dom.uiRunBtn.disabled = false;
      if (dom.uiStopBtn) dom.uiStopBtn.disabled = true;
    } else if (labState.ui.lastStatus === "Failed") {
      setChip(dom.uiStatus, "Failed", "fail");
      if (dom.uiSummary) {
        dom.uiSummary.textContent = "Last run failed. Review trace artifacts.";
      }
      if (dom.uiRunBtn) dom.uiRunBtn.disabled = false;
      if (dom.uiStopBtn) dom.uiStopBtn.disabled = true;
    } else if (labState.ui.lastStatus === "Passed") {
      setChip(dom.uiStatus, "Passed", "success");
      if (dom.uiSummary) {
        dom.uiSummary.textContent = "Last run passed with clean artifacts.";
      }
      if (dom.uiRunBtn) dom.uiRunBtn.disabled = false;
      if (dom.uiStopBtn) dom.uiStopBtn.disabled = true;
    } else {
      setChip(dom.uiStatus, "Ready", "success");
      if (dom.uiSummary) {
        dom.uiSummary.textContent = "No UI suite triggered.";
      }
      if (dom.uiRunBtn) dom.uiRunBtn.disabled = false;
      if (dom.uiStopBtn) dom.uiStopBtn.disabled = true;
    }

    if (dom.uiLastRun) {
      dom.uiLastRun.textContent = formatLastRun();
    }
    updateLabBadge();
  }

  function startPerf() {
    if (labState.perf.running) return;
    labState.perf.running = true;
    labState.perf.lastStatus = "running";
    saveState();
    updatePerfUI();
    utils?.pushLog?.(`Performance test started: ${scenarios[labState.perf.scenario]}.`);
  }

  function rampPerf() {
    if (!labState.perf.running) {
      startPerf();
    }
    if (state) {
      state.metricProfile = "spike";
      state.metricSpikeUntil = Date.now() + 20000;
    }
    utils?.pushLog?.("Load ramp engaged for the active performance test.");
  }

  function stopPerf() {
    if (!labState.perf.running) return;
    labState.perf.running = false;
    labState.perf.lastStatus = "stopped";
    saveState();
    updatePerfUI();
    utils?.pushLog?.("Performance test stopped.");
  }

  function completeUiRun(statusLabel) {
    labState.ui.running = false;
    labState.ui.lastStatus = statusLabel;
    labState.ui.lastRun = new Date().toISOString();
    saveState();
    updateUiUI();
    utils?.pushLog?.(`Playwright UI suite finished: ${statusLabel}.`);
  }

  function startUiRun() {
    if (labState.ui.running) return;
    if (uiTimer) {
      clearTimeout(uiTimer);
      uiTimer = null;
    }
    labState.ui.running = true;
    labState.ui.lastStatus = "Running";
    saveState();
    updateUiUI();
    utils?.pushLog?.(`Playwright UI suite started on ${devices[labState.ui.device]}.`);
    uiTimer = window.setTimeout(() => {
      completeUiRun("Passed");
    }, 4000);
  }

  function stopUiRun() {
    if (!labState.ui.running) return;
    if (uiTimer) {
      clearTimeout(uiTimer);
      uiTimer = null;
    }
    labState.ui.running = false;
    labState.ui.lastStatus = "Stopped";
    saveState();
    updateUiUI();
    utils?.pushLog?.("Playwright UI suite stopped.");
  }

  function captureShot() {
    utils?.pushLog?.("Playwright snapshot captured.");
  }

  function init() {
    refreshDom();
    if (!dom.badge) return;

    dom.perfScenarioSelect?.addEventListener("change", () => {
      labState.perf.scenario = dom.perfScenarioSelect.value;
      saveState();
      updatePerfUI();
    });

    dom.perfProfileSelect?.addEventListener("change", () => {
      labState.perf.profile = dom.perfProfileSelect.value;
      saveState();
      updatePerfUI();
    });

    dom.perfStartBtn?.addEventListener("click", startPerf);
    dom.perfRampBtn?.addEventListener("click", rampPerf);
    dom.perfStopBtn?.addEventListener("click", stopPerf);

    dom.uiTraceToggle?.addEventListener("change", () => {
      labState.ui.trace = dom.uiTraceToggle.checked;
      saveState();
      updateUiUI();
    });

    dom.uiVideoToggle?.addEventListener("change", () => {
      labState.ui.video = dom.uiVideoToggle.checked;
      saveState();
      updateUiUI();
    });

    dom.uiThrottleToggle?.addEventListener("change", () => {
      labState.ui.throttle = dom.uiThrottleToggle.checked;
      saveState();
      updateUiUI();
    });

    dom.uiDeviceSelect?.addEventListener("change", () => {
      labState.ui.device = dom.uiDeviceSelect.value;
      saveState();
      updateUiUI();
    });

    dom.uiRunBtn?.addEventListener("click", startUiRun);
    dom.uiCaptureBtn?.addEventListener("click", captureShot);
    dom.uiStopBtn?.addEventListener("click", stopUiRun);

    updatePerfUI();
    updateUiUI();
  }

  dashboard.labs = {
    init,
    updatePerfUI,
    updateUiUI,
  };
})();
