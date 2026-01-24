(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { utils } = dashboard;
  const STORAGE_KEY = "devops-iac";

  let dom = {};

  function refreshDom() {
    dom = {
      badge: document.getElementById("iacBadge"),
      lockToggle: document.getElementById("iacLockToggle"),
      changeList: document.getElementById("iacChangeList"),
      changeCount: document.getElementById("iacChangeCount"),
      workspace: document.getElementById("iacWorkspace"),
      planBtn: document.getElementById("iacPlanBtn"),
      approveBtn: document.getElementById("iacApproveBtn"),
      applyBtn: document.getElementById("iacApplyBtn"),
      discardBtn: document.getElementById("iacDiscardBtn"),
      footer: document.getElementById("iacFooter"),
    };
  }

  const stageConfig = {
    idle: { badge: "Plan Needed", badgeClass: "queued", status: "Pending", statusClass: "warn" },
    planned: { badge: "Plan Ready", badgeClass: "warn", status: "Planned", statusClass: "warn" },
    approved: { badge: "Approved", badgeClass: "running", status: "Approved", statusClass: "success" },
    applied: { badge: "Applied", badgeClass: "succeeded", status: "Applied", statusClass: "success" },
    discarded: { badge: "Discarded", badgeClass: "failed", status: "Discarded", statusClass: "fail" },
  };

  function buildDefaultState() {
    return {
      stage: "idle",
      locked: false,
      lastApplied: null,
    };
  }

  function loadState() {
    const fallback = buildDefaultState();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    try {
      const parsed = JSON.parse(stored);
      return {
        stage: stageConfig[parsed.stage] ? parsed.stage : fallback.stage,
        locked: Boolean(parsed.locked),
        lastApplied: typeof parsed.lastApplied === "string" ? parsed.lastApplied : null,
      };
    } catch (error) {
      return fallback;
    }
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setTag(el, label, className) {
    if (!el) return;
    el.textContent = label;
    el.className = `tag ${className}`.trim();
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

  function formatAppliedTime(iso) {
    if (!iso) return "Last apply: N/A";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Last apply: N/A";
    return `Last apply: ${date.toLocaleString("en-GB", { hour12: false })}`;
  }

  function updateBadge() {
    const config = stageConfig[state.stage] || stageConfig.idle;
    setTag(dom.badge, config.badge, config.badgeClass);
  }

  function updateStatuses() {
    const config = stageConfig[state.stage] || stageConfig.idle;
    const statusEls = dom.changeList?.querySelectorAll("[data-iac-status]") || [];
    statusEls.forEach((el) => setChip(el, config.status, config.statusClass));
  }

  function updateWorkspace() {
    if (!dom.workspace) return;
    dom.workspace.textContent = state.locked ? "Workspace: prod/main (Locked)" : "Workspace: prod/main";
  }

  function updateChangeCount() {
    if (!dom.changeCount) return;
    const total = dom.changeList ? dom.changeList.querySelectorAll("li").length : 0;
    const queued = ["applied", "discarded"].includes(state.stage) ? 0 : total;
    dom.changeCount.textContent = `${queued} change${queued === 1 ? "" : "s"} queued`;
  }

  function updateButtons() {
    if (dom.lockToggle) {
      dom.lockToggle.checked = state.locked;
    }
    if (dom.planBtn) {
      dom.planBtn.disabled = state.locked;
    }
    if (dom.approveBtn) {
      dom.approveBtn.disabled = state.locked || state.stage !== "planned";
    }
    if (dom.applyBtn) {
      dom.applyBtn.disabled = state.locked || state.stage !== "approved";
    }
    if (dom.discardBtn) {
      dom.discardBtn.disabled = state.stage === "idle";
    }
  }

  function updateFooter() {
    if (!dom.footer) return;
    dom.footer.textContent = formatAppliedTime(state.lastApplied);
  }

  function updateUI() {
    if (!dom.badge) {
      refreshDom();
    }
    if (!dom.badge) return;
    updateBadge();
    updateStatuses();
    updateWorkspace();
    updateChangeCount();
    updateButtons();
    updateFooter();
  }

  function setStage(nextStage, logMessage) {
    if (!stageConfig[nextStage]) return;
    state.stage = nextStage;
    if (nextStage === "applied") {
      state.lastApplied = new Date().toISOString();
    }
    saveState();
    updateUI();
    if (logMessage) {
      utils?.pushLog?.(logMessage);
    }
  }

  function toggleLock(locked) {
    state.locked = locked;
    saveState();
    updateUI();
    utils?.pushLog?.(`IaC workspace ${locked ? "locked" : "unlocked"}.`);
  }

  function init() {
    refreshDom();
    if (!dom.badge) return;

    dom.planBtn?.addEventListener("click", () => {
      if (state.locked) return;
      setStage("planned", "Terraform plan generated for queued changes.");
    });

    dom.approveBtn?.addEventListener("click", () => {
      if (state.locked || state.stage !== "planned") return;
      setStage("approved", "IaC plan approved by admin.");
    });

    dom.applyBtn?.addEventListener("click", () => {
      if (state.locked || state.stage !== "approved") return;
      setStage("applied", "IaC changes applied to production.");
    });

    dom.discardBtn?.addEventListener("click", () => {
      if (state.stage === "idle") return;
      setStage("discarded", "IaC plan discarded.");
    });

    dom.lockToggle?.addEventListener("change", (event) => {
      toggleLock(event.target.checked);
    });

    updateUI();
  }

  dashboard.iac = {
    init,
    updateUI,
  };
})();
